# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code Sidebar is an Obsidian desktop plugin that integrates Claude Code CLI into Obsidian's sidebar with full terminal emulation via xterm.js.

## Build Commands

```bash
npm install        # Install dependencies
npm run build      # Production build (minified)
npm run dev        # Watch mode for development
npm run analyze    # Bundle analysis with esbuild metafile
```

## Architecture

The plugin follows a layered architecture with 6 TypeScript files in `src/`:

```
main.ts           → Plugin entry point, settings, Claude CLI path detection
TerminalView.ts   → Obsidian ItemView with xterm.js terminal rendering
ProcessManager.ts → PTY process lifecycle, cross-platform terminal spawning
SettingsTab.ts    → Plugin settings UI (font size, theme, Claude path)
types.ts          → TypeScript interfaces and type definitions
constants.ts      → Terminal config, theme colors, platform-specific paths
```

**Data Flow**: User input → TerminalView (xterm.js) → ProcessManager (PTY) → Claude CLI → ProcessManager events → TerminalView output

## Key Patterns

### Cross-Platform PTY Management
- **macOS/Linux**: Uses embedded Python PTY script (in `constants.ts`) with resize support via SIGWINCH
- **Windows**: Tries node-pty first, falls back to basic child_process spawn

### Terminal Resize
Debounced (100ms) resize handling with Double RAF pattern for stable fitting:
```typescript
requestAnimationFrame(() => {
  requestAnimationFrame(() => fitAddon.fit());
});
```

### Resource Cleanup
`TerminalView.onClose()` must cleanup in order: timers → ResizeObserver → event handlers → ProcessManager → xterm terminal

## Build Configuration

- **Bundler**: esbuild (configured in `esbuild.config.mjs`)
- **Output**: `main.js` (CommonJS, single bundle)
- **Externals**: `obsidian`, `electron`, `node-pty` are NOT bundled
- **Target**: ES2020, Node.js platform

## CSS Notes

**Important**: esbuild does not bundle CSS. The `styles.css` file must include:
- xterm.js base styles (copied from `node_modules/@xterm/xterm/css/xterm.css`)
- Custom terminal container styles
- Toolbar button styles
- Obsidian element hiding rules (view headers, icons, inputs)

Key xterm elements that must be hidden via CSS:
- `.xterm-helper-textarea` - accessibility input (position off-screen)
- `.xterm-char-measure-element` - character width measurement (visibility: hidden)

## UI Components

### Toolbar
Located at top-right of terminal view:
- **Restart** button - kills current session and starts new one

### Terminal Container
- `.claude-code-terminal-container` - main wrapper with flex layout
- `.claude-code-xterm-wrapper` - xterm.js mount point

## Deployment

After building, copy files to Obsidian plugin folder:
```bash
npm run build
cp main.js styles.css manifest.json /path/to/vault/.obsidian/plugins/claude-code-sidebar/
```

## Platform Requirements

- Claude CLI must be installed
- Python 3 required for macOS/Linux PTY support
- node-pty optional but recommended for Windows

## Testing

Manual testing in Obsidian. Load the plugin from `.obsidian/plugins/claude-code-sidebar/` in a test vault.
