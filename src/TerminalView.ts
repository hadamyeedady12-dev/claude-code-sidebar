import { ItemView, WorkspaceLeaf } from "obsidian";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { spawn, ChildProcess } from "child_process";
import type ClaudeCodeSidebarPlugin from "./main";

export const VIEW_TYPE_CLAUDE_CODE = "claude-code-terminal-view";

interface NodePtyProcess {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  onData(callback: (data: string) => void): void;
  onExit(callback: (e: { exitCode: number; signal?: number }) => void): void;
}

type PtyProcess = ChildProcess | NodePtyProcess;

export class ClaudeCodeTerminalView extends ItemView {
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private ptyProcess: PtyProcess | null = null;
  private terminalContainer: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private fitDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isNodePty = false;
  private isDisposed = false;

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: ClaudeCodeSidebarPlugin
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_CLAUDE_CODE;
  }

  getDisplayText(): string {
    return "Claude Code";
  }

  getIcon(): string {
    return "terminal";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("claude-code-terminal-container");

    // Create terminal wrapper
    this.terminalContainer = container.createDiv({ cls: "claude-code-xterm-wrapper" });

    // Create toolbar
    this.createToolbar(container);

    // Initialize terminal
    this.initTerminal();

    // Setup resize observer
    this.setupResizeObserver();

    // Start session
    await this.startSession();
  }

  private createToolbar(container: HTMLElement): void {
    const toolbar = container.createDiv({ cls: "claude-code-terminal-toolbar" });

    const restartBtn = toolbar.createEl("button", { text: "Restart", cls: "mod-cta" });
    restartBtn.onclick = () => this.restartSession();

    const settingsBtn = toolbar.createEl("button", { cls: "clickable-icon" });
    settingsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/></svg>`;
    settingsBtn.onclick = () => {
      this.app.setting.open();
      this.app.setting.openTabById(this.plugin.manifest.id);
    };
  }

  private initTerminal(): void {
    const fontFamily = this.getTerminalFont();

    this.terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily,
      fontSize: 13,
      allowProposedApi: true,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#ffffff",
        selectionBackground: "#264f78",
        black: "#1e1e1e",
        red: "#f44747",
        green: "#6a9955",
        yellow: "#dcdcaa",
        blue: "#569cd6",
        magenta: "#c586c0",
        cyan: "#4ec9b0",
        white: "#d4d4d4",
      },
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(new WebLinksAddon());

    if (this.terminalContainer) {
      this.terminal.open(this.terminalContainer);
      this.scheduleFit();
    }

    // Handle terminal input
    this.terminal.onData((data) => this.handleTerminalInput(data));
  }

  private getTerminalFont(): string {
    const monospace = getComputedStyle(document.body)
      .getPropertyValue("--font-monospace")
      .trim();
    const fallback = "Menlo, Monaco, 'Courier New', monospace";
    return monospace ? `${monospace}, ${fallback}` : fallback;
  }

  private setupResizeObserver(): void {
    if (!this.terminalContainer) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.isDisposed) this.scheduleFit();
    });
    this.resizeObserver.observe(this.terminalContainer);
  }

  private scheduleFit(): void {
    if (this.fitDebounceTimer) {
      clearTimeout(this.fitDebounceTimer);
    }

    this.fitDebounceTimer = setTimeout(() => {
      this.performFit();
    }, 100);
  }

  private performFit(): void {
    if (this.isDisposed || !this.fitAddon || !this.terminal || !this.terminalContainer) {
      return;
    }

    const rect = this.terminalContainer.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return;

    try {
      this.fitAddon.fit();
      this.notifyResize();
    } catch {
      // Ignore fit errors
    }
  }

  private notifyResize(): void {
    if (!this.terminal || !this.ptyProcess) return;

    const { cols, rows } = this.terminal;
    if (cols < 2 || rows < 2) return;

    if (this.isNodePty) {
      const pty = this.ptyProcess as NodePtyProcess;
      try {
        pty.resize(cols, rows);
      } catch {
        // Ignore resize errors
      }
    } else {
      const proc = this.ptyProcess as ChildProcess;
      if (proc.stdio?.[3]) {
        try {
          (proc.stdio[3] as NodeJS.WritableStream).write(`R:${rows}:${cols}\n`);
        } catch {
          // Ignore write errors
        }
      }
    }
  }

  private handleTerminalInput(data: string): void {
    if (!this.ptyProcess) return;

    if (this.isNodePty) {
      (this.ptyProcess as NodePtyProcess).write(data);
    } else {
      const proc = this.ptyProcess as ChildProcess;
      proc.stdin?.write(data);
    }
  }

  private async startSession(): Promise<void> {
    if (!this.terminal) return;

    this.terminal.reset();
    this.terminal.writeln("Starting Claude Code...\r\n");

    const claudePath = await this.plugin.findClaudePath();
    const vaultPath = (this.app.vault.adapter as any).basePath;

    const env = this.createEnv();
    const { cols, rows } = this.terminal;

    try {
      if (process.platform === "win32") {
        await this.startWindowsSession(claudePath, vaultPath, env, cols, rows);
      } else {
        await this.startUnixSession(claudePath, vaultPath, env, cols, rows);
      }

      this.terminal.focus();
    } catch (e) {
      this.terminal.writeln(`\r\nError: ${e}`);
    }
  }

  private createEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    env.FORCE_COLOR = "3";
    env.TERM = "xterm-256color";
    env.COLORTERM = "truecolor";
    env.LANG = env.LANG || "en_US.UTF-8";

    if (process.platform !== "win32") {
      const paths = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
      env.PATH = paths.join(":") + ":" + (env.PATH || "");
    }

    return env;
  }

  private async startWindowsSession(
    claudePath: string,
    cwd: string,
    env: NodeJS.ProcessEnv,
    cols: number,
    rows: number
  ): Promise<void> {
    // Try node-pty first for better Windows support
    let nodePty: any = null;
    try {
      nodePty = require("node-pty");
    } catch {
      nodePty = null;
    }

    if (nodePty?.spawn) {
      try {
        this.ptyProcess = nodePty.spawn(claudePath, [], {
          name: "xterm-256color",
          cols,
          rows,
          cwd,
          env,
          useConpty: true,
        });
        this.isNodePty = true;
        this.setupNodePtyHandlers();
        return;
      } catch {
        this.isNodePty = false;
      }
    }

    // Fallback to basic spawn
    this.terminal?.writeln("Note: Using basic mode (install node-pty for better experience)\r\n");
    this.ptyProcess = spawn(claudePath, [], { cwd, env, shell: true });
    this.isNodePty = false;
    this.setupChildProcessHandlers();
  }

  private async startUnixSession(
    claudePath: string,
    cwd: string,
    env: NodeJS.ProcessEnv,
    cols: number,
    rows: number
  ): Promise<void> {
    env.ROWS = rows.toString();
    env.COLS = cols.toString();

    const ptyScript = this.getPtyScript();

    this.ptyProcess = spawn("python3", ["-c", ptyScript, claudePath], {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe", "pipe"],
    });

    this.isNodePty = false;
    this.setupChildProcessHandlers();
  }

  private getPtyScript(): string {
    return `
import os,sys,pty,select,array,fcntl,termios,signal
m,s=pty.openpty()
r,c=int(os.environ.get('ROWS',24)),int(os.environ.get('COLS',80))
fcntl.ioctl(m,termios.TIOCSWINSZ,array.array('h',[r,c,0,0]))
pid=os.fork()
if pid==0:
    os.close(m);os.setsid()
    fcntl.ioctl(s,termios.TIOCSCTTY,0)
    os.dup2(s,0);os.dup2(s,1);os.dup2(s,2);os.close(s)
    os.execvp(sys.argv[1],sys.argv[1:])
os.close(s)
while True:
    r,_,_=select.select([m,0,3],[],[])
    if m in r:
        try:
            d=os.read(m,4096)
            if not d:break
            os.write(1,d)
        except:break
    if 0 in r:
        try:
            d=os.read(0,4096)
            if not d:break
            os.write(m,d)
        except:break
    if 3 in r:
        try:
            l=os.read(3,256).decode().strip()
            if l.startswith('R:'):
                p=l.split(':')
                fcntl.ioctl(m,termios.TIOCSWINSZ,array.array('h',[int(p[1]),int(p[2]),0,0]))
                os.kill(pid,signal.SIGWINCH)
        except:pass
`.trim();
  }

  private setupNodePtyHandlers(): void {
    const pty = this.ptyProcess as NodePtyProcess;

    pty.onData((data) => {
      this.terminal?.write(data);
    });

    pty.onExit(({ exitCode, signal }) => {
      this.terminal?.writeln(`\r\n\r\n[Session ended: code=${exitCode}, signal=${signal}]`);
    });
  }

  private setupChildProcessHandlers(): void {
    const proc = this.ptyProcess as ChildProcess;

    proc.stdout?.on("data", (data: Buffer) => {
      this.terminal?.write(data.toString());
    });

    proc.stderr?.on("data", (data: Buffer) => {
      this.terminal?.write(data.toString());
    });

    proc.on("error", (err) => {
      this.terminal?.writeln(`\r\n[Error: ${err.message}]`);
    });

    proc.on("exit", (code, signal) => {
      this.terminal?.writeln(`\r\n\r\n[Session ended: code=${code}, signal=${signal}]`);
    });
  }

  async restartSession(): Promise<void> {
    this.killProcess();
    this.terminal?.reset();
    await this.startSession();
  }

  private killProcess(): void {
    if (!this.ptyProcess) return;

    try {
      if (this.isNodePty) {
        (this.ptyProcess as NodePtyProcess).kill();
      } else {
        (this.ptyProcess as ChildProcess).kill();
      }
    } catch {
      // Ignore kill errors
    }

    this.ptyProcess = null;
  }

  async onClose(): Promise<void> {
    this.isDisposed = true;

    if (this.fitDebounceTimer) {
      clearTimeout(this.fitDebounceTimer);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.killProcess();

    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
  }
}
