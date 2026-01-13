# Claude Code Sidebar for Obsidian

Run [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI directly in your Obsidian sidebar with full terminal emulation.

![Claude Code in Obsidian](https://img.shields.io/badge/Obsidian-Plugin-purple)

## Features

- Embedded terminal in Obsidian's right sidebar
- Full PTY emulation (colors, resize support)
- Auto-detects Claude Code installation path
- Restart session button
- Works with your Obsidian vault as working directory

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed
- macOS or Linux (Windows support is experimental)
- Python 3 (for PTY emulation on Unix systems)

## Installation

### Manual Installation

1. Download the latest release from [Releases](../../releases)
2. Extract to your vault's `.obsidian/plugins/claude-code-sidebar/` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### Build from Source

```bash
git clone https://github.com/hadamyeedady12-dev/claude-code-sidebar.git
cd claude-code-sidebar
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugins folder.

## Usage

1. Click the terminal icon in the left ribbon, or
2. Use Command Palette (`Cmd/Ctrl + P`) → "Open Claude Code Terminal"

The terminal opens in the right sidebar with Claude Code ready to use.

## Tech Stack

- [xterm.js](https://xtermjs.org/) - Terminal emulator
- Python PTY wrapper for proper terminal handling
- Obsidian Plugin API

## Contributors

- [@hadamyeedady12-dev](https://github.com/hadamyeedady12-dev) - Creator
- [@reallygood83](https://github.com/reallygood83)
- [@master-of-opencode](https://github.com/master-of-opencode)

## License

MIT
