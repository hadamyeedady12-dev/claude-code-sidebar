import { ItemView, WorkspaceLeaf } from "obsidian";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { spawn, ChildProcess } from "child_process";
import type ClaudeCodeSidebarPlugin from "./main";

export const VIEW_TYPE_CLAUDE_CODE = "claude-code-terminal-view";

export class ClaudeCodeTerminalView extends ItemView {
	plugin: ClaudeCodeSidebarPlugin;
	terminal: Terminal | null = null;
	fitAddon: FitAddon | null = null;
	ptyProcess: ChildProcess | null = null;
	terminalContainer: HTMLDivElement | null = null;
	isDisposed: boolean = false;
	resizeObserver: ResizeObserver | null = null;
	fitTimeoutId: ReturnType<typeof setTimeout> | null = null;
	layoutChangeHandler: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ClaudeCodeSidebarPlugin) {
		super(leaf);
		this.plugin = plugin;
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

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("claude-code-terminal-container");

		this.terminalContainer = container.createDiv({ cls: "claude-code-xterm-wrapper" });

		const toolbar = container.createDiv({ cls: "claude-code-terminal-toolbar" });
		const restartBtn = toolbar.createEl("button", {
			text: "Restart",
			cls: "mod-cta",
		});
		restartBtn.onclick = () => this.restartSession();

		const settingsBtn = toolbar.createEl("button", {
			cls: "clickable-icon",
		});
		settingsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
		settingsBtn.onclick = () => {
			this.app.setting.open();
			this.app.setting.openTabById(this.plugin.manifest.id);
		};

		this.terminal = new Terminal({
			cursorBlink: true,
			convertEol: true,
			fontFamily: 'Menlo, Monaco, "Courier New", monospace',
			fontSize: 12,
			allowProposedApi: true,
			theme: {
				background: "#1e1e1e",
				foreground: "#f0f0f0",
				cursor: "#ffffff",
				selectionBackground: "#5da5f533",
			},
		});

		this.fitAddon = new FitAddon();
		this.terminal.loadAddon(this.fitAddon);
		this.terminal.loadAddon(new WebLinksAddon());
		this.terminal.open(this.terminalContainer);

		this.resizeObserver = new ResizeObserver(() => {
			if (!this.isDisposed) {
				this.debouncedFit();
			}
		});
		this.resizeObserver.observe(this.terminalContainer);

		this.layoutChangeHandler = () => {
			if (!this.isDisposed) {
				this.debouncedFit();
			}
		};
		this.app.workspace.on("layout-change", this.layoutChangeHandler);
		this.app.workspace.on("resize", this.layoutChangeHandler);

		this.performInitialFit();

		this.terminal.onData((data) => {
			if (this.ptyProcess && this.ptyProcess.stdin) {
				this.ptyProcess.stdin.write(data);
			}
		});

		await this.startSession();
	}

	notifyResize() {
		if (this.ptyProcess && this.ptyProcess.stdio && this.ptyProcess.stdio[3]) {
			const { cols, rows } = this.terminal!;
			try {
				(this.ptyProcess.stdio[3] as NodeJS.WritableStream).write(`R:${rows}:${cols}\n`);
			} catch (e) {
				// Ignore resize errors
			}
		}
	}

	debouncedFit() {
		if (this.fitTimeoutId) {
			clearTimeout(this.fitTimeoutId);
		}
		this.fitTimeoutId = setTimeout(() => {
			if (!this.isDisposed && this.fitAddon) {
				requestAnimationFrame(() => {
					try {
						this.fitAddon!.fit();
						this.notifyResize();
					} catch (e) {
						// Ignore fit errors
					}
				});
			}
		}, 50);
	}

	performInitialFit() {
		const fitWithRetry = (attempts: number) => {
			if (this.isDisposed || attempts <= 0) return;
			requestAnimationFrame(() => {
				try {
					this.fitAddon!.fit();
					this.notifyResize();
				} catch (e) {
					// Ignore errors
				}
				setTimeout(() => fitWithRetry(attempts - 1), 100);
			});
		};
		setTimeout(() => fitWithRetry(5), 50);
	}

	async startSession() {
		if (!this.terminal) return;

		this.terminal.clear();
		this.terminal.writeln("Initializing Claude Code Terminal...");

		const claudePath = await this.plugin.findClaudePath();
		const vaultPath = (this.app.vault.adapter as any).basePath;

		try {
			const env: NodeJS.ProcessEnv = { ...process.env };

			if (process.platform !== "win32") {
				const extraPaths = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
				env.PATH = extraPaths.join(":") + ":" + (env.PATH || "");
			}

			env.FORCE_COLOR = "3";
			env.TERM = "xterm-256color";
			env.COLORTERM = "truecolor";
			env.LANG = "en_US.UTF-8";

			const { cols, rows } = this.terminal;
			env.ROWS = rows.toString();
			env.COLS = cols.toString();

			const args: string[] = [];

			if (process.platform === "win32") {
				this.ptyProcess = spawn(claudePath, args, {
					cwd: vaultPath,
					env,
					shell: true,
				});
			} else {
				const pythonCode = `
import os,sys,pty,select,array,fcntl,termios
m,p_v=pty.openpty()
r,c=os.environ.get('ROWS','24'),os.environ.get('COLS','80')
fcntl.ioctl(m,termios.TIOCSWINSZ,array.array('h',[int(r),int(c),0,0]))
if os.fork()==0:
 os.close(m);os.setsid();os.dup2(p_v,0);os.dup2(p_v,1);os.dup2(p_v,2)
 try:os.execvp(sys.argv[1],sys.argv[1:])
 except:os._exit(1)
os.close(p_v)
while True:
 rdk,_,_=select.select([m,0,3],[],[])
 if m in rdk:
  try:
   d=os.read(m,4096)
   if not d:break
   os.write(sys.stdout.buffer.fileno(),d)
  except:break
 if 0 in rdk:
  try:
   d=os.read(0,4096)
   if not d:break
   os.write(m,d)
  except:break
 if 3 in rdk:
  try:
   l=os.read(3,1024).decode().strip()
   if l.startswith('R:'):
    _,rs,cs=l.split(':');fcntl.ioctl(m,termios.TIOCSWINSZ,array.array('h',[int(rs),int(cs),0,0]))
  except:pass
`.trim();

				this.ptyProcess = spawn("python3", ["-c", pythonCode, claudePath, ...args], {
					cwd: vaultPath,
					env,
					stdio: ["pipe", "pipe", "pipe", "pipe"],
				});
			}

			this.ptyProcess.stdout?.on("data", (data: Buffer) => {
				this.terminal?.write(data);
			});

			this.ptyProcess.stderr?.on("data", (data: Buffer) => {
				this.terminal?.write(data);
			});

			this.ptyProcess.on("error", (err: Error) => {
				this.terminal?.writeln(`\r\n[Fatal Error]: ${err.message}`);
			});

			this.ptyProcess.on("exit", (code: number | null, signal: string | null) => {
				this.terminal?.writeln(`\r\n\r\n--- Session Ended (Code: ${code}, Signal: ${signal}) ---`);
			});

			this.terminal.focus();
		} catch (e) {
			this.terminal.writeln(`Error starting Claude Code: ${e}`);
		}
	}

	async restartSession() {
		if (this.ptyProcess) {
			this.ptyProcess.kill();
			this.ptyProcess = null;
		}
		await this.startSession();
	}

	async onClose() {
		this.isDisposed = true;

		if (this.fitTimeoutId) {
			clearTimeout(this.fitTimeoutId);
		}

		if (this.resizeObserver && this.terminalContainer) {
			this.resizeObserver.unobserve(this.terminalContainer);
			this.resizeObserver.disconnect();
		}

		if (this.layoutChangeHandler) {
			this.app.workspace.off("layout-change", this.layoutChangeHandler);
			this.app.workspace.off("resize", this.layoutChangeHandler);
		}

		if (this.ptyProcess) {
			this.ptyProcess.kill();
			this.ptyProcess = null;
		}

		if (this.terminal) {
			this.terminal.dispose();
			this.terminal = null;
		}
	}
}
