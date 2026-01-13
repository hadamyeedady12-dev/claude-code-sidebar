import type { ChildProcess } from "child_process";

/**
 * Node-pty process interface for full terminal emulation
 */
export interface NodePtyProcess {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
  onData(callback: (data: string) => void): { dispose(): void };
  onExit(callback: (e: { exitCode: number; signal?: number }) => void): { dispose(): void };
  pid: number;
}

/**
 * Union type for PTY process - either node-pty or child_process
 */
export type PtyProcess = ChildProcess | NodePtyProcess;

/**
 * Type guard to check if process is node-pty
 */
export function isNodePtyProcess(process: PtyProcess): process is NodePtyProcess {
  return "resize" in process && typeof (process as NodePtyProcess).resize === "function";
}

/**
 * Terminal session state
 */
export interface SessionState {
  isRunning: boolean;
  pid: number | null;
  startTime: Date | null;
}

/**
 * Plugin settings
 */
export interface ClaudeCodeSettings {
  claudePath: string;
}

/**
 * Terminal theme colors
 */
export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  selectionForeground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

/**
 * Process manager events
 */
export type ProcessEventType = "data" | "exit" | "error" | "start";

export interface ProcessDataEvent {
  type: "data";
  data: string;
}

export interface ProcessExitEvent {
  type: "exit";
  code: number | null;
  signal: NodeJS.Signals | null;
}

export interface ProcessErrorEvent {
  type: "error";
  error: Error;
}

export interface ProcessStartEvent {
  type: "start";
  pid: number;
}

export type ProcessEvent = ProcessDataEvent | ProcessExitEvent | ProcessErrorEvent | ProcessStartEvent;

/**
 * Obsidian FileSystemAdapter with basePath
 * (Obsidian's types don't expose this, but it exists at runtime)
 */
export interface FileSystemAdapterWithBasePath {
  basePath: string;
}
