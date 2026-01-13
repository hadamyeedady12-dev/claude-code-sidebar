import { EventEmitter } from "events";
import { spawn, ChildProcess } from "child_process";
import type { NodePtyProcess, PtyProcess, ProcessEvent } from "./types";
import { isNodePtyProcess } from "./types";
import { PTY_SCRIPT, UNIX_PATH_ADDITIONS } from "./constants";

/**
 * Manages PTY process lifecycle with event-based communication
 */
export class ProcessManager extends EventEmitter {
  private ptyProcess: PtyProcess | null = null;
  private isNodePty = false;
  private dataDisposable: { dispose(): void } | null = null;
  private exitDisposable: { dispose(): void } | null = null;

  constructor() {
    super();
  }

  /**
   * Check if process is currently running
   */
  get isRunning(): boolean {
    return this.ptyProcess !== null;
  }

  /**
   * Get process ID if running
   */
  get pid(): number | null {
    if (!this.ptyProcess) return null;

    if (this.isNodePty) {
      return (this.ptyProcess as NodePtyProcess).pid;
    }
    return (this.ptyProcess as ChildProcess).pid ?? null;
  }

  /**
   * Start a new process
   */
  async start(
    claudePath: string,
    cwd: string,
    cols: number,
    rows: number
  ): Promise<void> {
    // Kill existing process if any
    this.kill();

    const env = this.createEnv(cols, rows);

    try {
      if (process.platform === "win32") {
        await this.startWindows(claudePath, cwd, env, cols, rows);
      } else {
        await this.startUnix(claudePath, cwd, env, cols, rows);
      }

      const pid = this.pid;
      if (pid) {
        this.emit("event", { type: "start", pid } as ProcessEvent);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit("event", { type: "error", error: err } as ProcessEvent);
      throw error;
    }
  }

  /**
   * Write data to the process
   */
  write(data: string): void {
    if (!this.ptyProcess) return;

    try {
      if (this.isNodePty) {
        (this.ptyProcess as NodePtyProcess).write(data);
      } else {
        (this.ptyProcess as ChildProcess).stdin?.write(data);
      }
    } catch (error) {
      console.error("Failed to write to process:", error);
    }
  }

  /**
   * Resize the terminal
   */
  resize(cols: number, rows: number): void {
    if (!this.ptyProcess || cols < 2 || rows < 2) return;

    try {
      if (this.isNodePty) {
        (this.ptyProcess as NodePtyProcess).resize(cols, rows);
      } else {
        // Send resize command via file descriptor 3 (Unix PTY script)
        const proc = this.ptyProcess as ChildProcess;
        if (proc.stdio?.[3]) {
          (proc.stdio[3] as NodeJS.WritableStream).write(`R:${rows}:${cols}\n`);
        }
      }
    } catch (error) {
      console.debug("Resize failed (process may have ended):", error);
    }
  }

  /**
   * Kill the process
   */
  kill(): void {
    // Clean up event handlers first
    this.cleanupHandlers();

    if (!this.ptyProcess) return;

    try {
      if (this.isNodePty) {
        (this.ptyProcess as NodePtyProcess).kill();
      } else {
        (this.ptyProcess as ChildProcess).kill();
      }
    } catch (error) {
      console.debug("Kill failed (process may have already ended):", error);
    }

    this.ptyProcess = null;
    this.isNodePty = false;
  }

  /**
   * Clean up event handlers to prevent memory leaks
   */
  private cleanupHandlers(): void {
    if (this.dataDisposable) {
      this.dataDisposable.dispose();
      this.dataDisposable = null;
    }
    if (this.exitDisposable) {
      this.exitDisposable.dispose();
      this.exitDisposable = null;
    }

    // Remove ChildProcess event listeners if applicable
    if (this.ptyProcess && !this.isNodePty) {
      const proc = this.ptyProcess as ChildProcess;
      proc.stdout?.removeAllListeners("data");
      proc.stderr?.removeAllListeners("data");
      proc.removeAllListeners("error");
      proc.removeAllListeners("exit");
    }
  }

  /**
   * Create environment for process
   */
  private createEnv(cols: number, rows: number): NodeJS.ProcessEnv {
    const env = { ...process.env };
    env.FORCE_COLOR = "3";
    env.TERM = "xterm-256color";
    env.COLORTERM = "truecolor";
    env.LANG = env.LANG || "en_US.UTF-8";
    env.ROWS = rows.toString();
    env.COLS = cols.toString();

    if (process.platform !== "win32") {
      env.PATH = UNIX_PATH_ADDITIONS.join(":") + ":" + (env.PATH || "");
    }

    return env;
  }

  /**
   * Start process on Windows
   */
  private async startWindows(
    claudePath: string,
    cwd: string,
    env: NodeJS.ProcessEnv,
    cols: number,
    rows: number
  ): Promise<void> {
    // Try node-pty first for better Windows support
    let nodePty: { spawn: typeof spawn } | null = null;
    try {
      // Dynamic import to avoid bundling node-pty if not available
      nodePty = await import("node-pty").catch(() => null);
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
        }) as unknown as NodePtyProcess;
        this.isNodePty = true;
        this.setupNodePtyHandlers();
        return;
      } catch (error) {
        console.debug("node-pty spawn failed, falling back:", error);
        this.isNodePty = false;
      }
    }

    // Fallback to basic spawn
    this.emit("event", {
      type: "data",
      data: "Note: Using basic mode (install node-pty for better experience)\r\n",
    } as ProcessEvent);

    this.ptyProcess = spawn(claudePath, [], { cwd, env, shell: true });
    this.isNodePty = false;
    this.setupChildProcessHandlers();
  }

  /**
   * Start process on Unix (macOS/Linux)
   */
  private async startUnix(
    claudePath: string,
    cwd: string,
    env: NodeJS.ProcessEnv,
    _cols: number,
    _rows: number
  ): Promise<void> {
    this.ptyProcess = spawn("python3", ["-c", PTY_SCRIPT, claudePath], {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe", "pipe"],
    });

    this.isNodePty = false;
    this.setupChildProcessHandlers();
  }

  /**
   * Set up handlers for node-pty process
   */
  private setupNodePtyHandlers(): void {
    const pty = this.ptyProcess as NodePtyProcess;

    this.dataDisposable = pty.onData((data) => {
      this.emit("event", { type: "data", data } as ProcessEvent);
    });

    this.exitDisposable = pty.onExit(({ exitCode, signal }) => {
      this.emit("event", {
        type: "exit",
        code: exitCode,
        signal: signal as NodeJS.Signals | null,
      } as ProcessEvent);
      this.ptyProcess = null;
    });
  }

  /**
   * Set up handlers for child_process
   */
  private setupChildProcessHandlers(): void {
    const proc = this.ptyProcess as ChildProcess;

    proc.stdout?.on("data", (data: Buffer) => {
      this.emit("event", { type: "data", data: data.toString() } as ProcessEvent);
    });

    proc.stderr?.on("data", (data: Buffer) => {
      this.emit("event", { type: "data", data: data.toString() } as ProcessEvent);
    });

    proc.on("error", (err) => {
      this.emit("event", { type: "error", error: err } as ProcessEvent);
    });

    proc.on("exit", (code, signal) => {
      this.emit("event", {
        type: "exit",
        code,
        signal,
      } as ProcessEvent);
      this.ptyProcess = null;
    });
  }
}
