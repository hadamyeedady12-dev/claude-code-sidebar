import { ItemView, WorkspaceLeaf } from "obsidian";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import type ClaudeCodeSidebarPlugin from "./main";
import { ProcessManager } from "./ProcessManager";
import type { ProcessEvent, FileSystemAdapterWithBasePath } from "./types";
import {
  VIEW_TYPE_CLAUDE_CODE,
  TERMINAL_CONFIG,
  DARK_THEME,
  FONT_FALLBACK,
  DEBOUNCE_FIT_MS,
  MIN_TERMINAL_SIZE,
} from "./constants";

export { VIEW_TYPE_CLAUDE_CODE };

export class ClaudeCodeTerminalView extends ItemView {
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private processManager: ProcessManager | null = null;
  private terminalContainer: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private fitDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private terminalDataDisposable: { dispose(): void } | null = null;
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
    const container = this.containerEl.children[1];
    if (!(container instanceof HTMLElement)) {
      console.error("Terminal container not found");
      return;
    }

    container.empty();
    container.addClass("claude-code-terminal-container");
    container.style.position = "relative";

    // Create toolbar first (positioned absolute)
    this.createToolbar(container);

    // Create terminal wrapper
    this.terminalContainer = container.createDiv({ cls: "claude-code-xterm-wrapper" });

    // Initialize terminal
    this.initTerminal();

    // Setup resize observer
    this.setupResizeObserver();

    // Initialize process manager
    this.processManager = new ProcessManager();
    this.setupProcessManagerHandlers();

    // Start session
    await this.startSession();
  }

  private createToolbar(container: HTMLElement): void {
    const toolbar = container.createDiv({ cls: "claude-code-terminal-toolbar" });

    const restartBtn = toolbar.createEl("button", { text: "Restart", cls: "mod-cta" });
    restartBtn.onclick = () => this.restartSession();
  }

  private initTerminal(): void {
    const fontFamily = this.getTerminalFont();

    this.terminal = new Terminal({
      ...TERMINAL_CONFIG,
      fontFamily,
      theme: DARK_THEME,
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(new WebLinksAddon());

    if (this.terminalContainer) {
      this.terminal.open(this.terminalContainer);
      this.scheduleFit();
    }

    // Handle terminal input with cleanup tracking
    this.terminalDataDisposable = this.terminal.onData((data) => this.handleTerminalInput(data));
  }

  private getTerminalFont(): string {
    const monospace = getComputedStyle(document.body)
      .getPropertyValue("--font-monospace")
      .trim();
    return monospace ? `${monospace}, ${FONT_FALLBACK}` : FONT_FALLBACK;
  }

  private setupResizeObserver(): void {
    if (!this.terminalContainer) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.isDisposed) this.scheduleFit();
    });
    this.resizeObserver.observe(this.terminalContainer);
  }

  private setupProcessManagerHandlers(): void {
    if (!this.processManager) return;

    this.processManager.on("event", (event: ProcessEvent) => {
      if (this.isDisposed || !this.terminal) return;

      switch (event.type) {
        case "data":
          this.terminal.write(event.data);
          break;
        case "exit":
          this.terminal.writeln(
            `\r\n\r\n[Session ended: code=${event.code}, signal=${event.signal}]`
          );
          break;
        case "error":
          this.terminal.writeln(`\r\n[Error: ${event.error.message}]`);
          break;
        case "start":
          console.debug("Process started with PID:", event.pid);
          break;
      }
    });
  }

  private scheduleFit(): void {
    if (this.fitDebounceTimer) {
      clearTimeout(this.fitDebounceTimer);
    }

    this.fitDebounceTimer = setTimeout(() => {
      this.performFit();
    }, DEBOUNCE_FIT_MS);
  }

  private performFit(): void {
    if (this.isDisposed || !this.fitAddon || !this.terminal || !this.terminalContainer) {
      return;
    }

    const rect = this.terminalContainer.getBoundingClientRect();
    if (rect.width < MIN_TERMINAL_SIZE.width || rect.height < MIN_TERMINAL_SIZE.height) {
      return;
    }

    // Use double requestAnimationFrame for better timing (master-of-opencode pattern)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.isDisposed) return;
        try {
          this.fitAddon?.fit();
          this.notifyResize();
        } catch (error) {
          console.debug("Fit failed:", error);
        }
      });
    });
  }

  private notifyResize(): void {
    if (!this.terminal || !this.processManager) return;

    const { cols, rows } = this.terminal;
    if (cols < MIN_TERMINAL_SIZE.cols || rows < MIN_TERMINAL_SIZE.rows) return;

    this.processManager.resize(cols, rows);
  }

  private handleTerminalInput(data: string): void {
    this.processManager?.write(data);
  }

  private async startSession(): Promise<void> {
    if (!this.terminal) return;

    this.terminal.reset();
    this.terminal.writeln("Starting Claude Code...\r\n");

    const claudePath = await this.plugin.findClaudePath();
    const adapter = this.app.vault.adapter as FileSystemAdapterWithBasePath;
    const vaultPath = adapter.basePath;
    const { cols, rows } = this.terminal;

    try {
      await this.processManager?.start(claudePath, vaultPath, cols, rows);
      this.terminal.focus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.terminal.writeln(`\r\nError: ${message}`);
    }
  }

  async restartSession(): Promise<void> {
    this.processManager?.kill();
    this.terminal?.reset();
    await this.startSession();
  }

  async onClose(): Promise<void> {
    this.isDisposed = true;

    // Clear debounce timer
    if (this.fitDebounceTimer) {
      clearTimeout(this.fitDebounceTimer);
      this.fitDebounceTimer = null;
    }

    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clean up terminal data handler
    if (this.terminalDataDisposable) {
      this.terminalDataDisposable.dispose();
      this.terminalDataDisposable = null;
    }

    // Kill process and clean up handlers
    if (this.processManager) {
      this.processManager.kill();
      this.processManager.removeAllListeners();
      this.processManager = null;
    }

    // Dispose terminal
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }

    this.fitAddon = null;
    this.terminalContainer = null;
  }
}
