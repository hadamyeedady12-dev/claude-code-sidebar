import type { ClaudeCodeSettings, TerminalTheme } from "./types";

/**
 * View type identifier for Obsidian workspace
 */
export const VIEW_TYPE_CLAUDE_CODE = "claude-code-terminal-view";

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: ClaudeCodeSettings = {
  claudePath: "",
  fontSize: 13,
  theme: "dark",
  autoRestart: false,
};

/**
 * Debounce timing (ms)
 */
export const DEBOUNCE_FIT_MS = 100;

/**
 * Minimum terminal dimensions for resize
 */
export const MIN_TERMINAL_SIZE = {
  width: 50,
  height: 50,
  cols: 2,
  rows: 2,
} as const;

/**
 * Dark terminal theme
 */
export const DARK_THEME: TerminalTheme = {
  background: "#0d0d0d",
  foreground: "#e0e0e0",
  cursor: "#ffffff",
  cursorAccent: "#0d0d0d",
  selectionBackground: "#264f78",
  selectionForeground: "#ffffff",
  black: "#0d0d0d",
  red: "#ff6b6b",
  green: "#69db7c",
  yellow: "#ffd43b",
  blue: "#74c0fc",
  magenta: "#da77f2",
  cyan: "#66d9e8",
  white: "#e0e0e0",
  brightBlack: "#495057",
  brightRed: "#ff8787",
  brightGreen: "#8ce99a",
  brightYellow: "#ffe066",
  brightBlue: "#a5d8ff",
  brightMagenta: "#e599f7",
  brightCyan: "#99e9f2",
  brightWhite: "#ffffff",
};

/**
 * Light terminal theme
 */
export const LIGHT_THEME: TerminalTheme = {
  background: "#ffffff",
  foreground: "#1a1a1a",
  cursor: "#000000",
  cursorAccent: "#ffffff",
  selectionBackground: "#add6ff",
  selectionForeground: "#000000",
  black: "#000000",
  red: "#c91b00",
  green: "#00a600",
  yellow: "#c7c400",
  blue: "#0451a5",
  magenta: "#bc05bc",
  cyan: "#0598bc",
  white: "#e0e0e0",
  brightBlack: "#767676",
  brightRed: "#e74856",
  brightGreen: "#16c60c",
  brightYellow: "#f9f1a5",
  brightBlue: "#3b78ff",
  brightMagenta: "#b4009e",
  brightCyan: "#61d6d6",
  brightWhite: "#ffffff",
};

/**
 * Platform-specific Claude CLI paths
 */
export const CLAUDE_PATHS = {
  windows: [
    "${APPDATA}\\npm\\claude.cmd",
    "${HOME}\\.npm-global\\claude.cmd",
    "${LOCALAPPDATA}\\Programs\\claude\\claude.exe",
  ],
  unix: [
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    "/usr/bin/claude",
    "${HOME}/.local/bin/claude",
    "${HOME}/.npm-global/bin/claude",
  ],
} as const;

/**
 * Environment paths for Unix
 */
export const UNIX_PATH_ADDITIONS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
];

/**
 * Terminal font fallback chain
 */
export const FONT_FALLBACK = "Menlo, Monaco, 'Courier New', monospace";

/**
 * Python PTY script for Unix terminal emulation
 */
export const PTY_SCRIPT = `
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
