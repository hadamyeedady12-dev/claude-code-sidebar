# Claude Code Sidebar

Obsidian plugin to run Claude Code CLI directly in your sidebar with full terminal emulation.

## Features

- Full terminal emulation using xterm.js
- Color support (256 colors + true color)
- Automatic terminal resizing
- Cross-platform support (macOS, Linux, Windows)
- Auto-detection of Claude CLI path

## Installation

### Via BRAT (Recommended)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Add beta plugin: `hadamyeedady12-dev/claude-code-sidebar`
3. Enable the plugin in Community Plugins settings

### Manual Installation

1. Download `main.js`, `manifest.json`, `styles.css` from the latest release
2. Create folder: `.obsidian/plugins/claude-code-sidebar/`
3. Copy the downloaded files into the folder
4. Enable the plugin in Obsidian settings

## Requirements

- [Claude CLI](https://docs.anthropic.com/en/docs/claude-cli) installed
- macOS, Linux, or Windows
- Python 3 (for macOS/Linux PTY support)

## Usage

1. Click the terminal icon in the left ribbon, or
2. Use command palette: "Open Claude Code Terminal"

## Configuration

Go to Settings → Claude Code Sidebar to configure:

- **Claude CLI Path**: Custom path to Claude CLI (auto-detected by default)

## Platform Notes

### macOS / Linux
Uses Python PTY for full terminal support including colors and resizing.

### Windows
- Best experience with `node-pty` installed
- Falls back to basic pipes if node-pty unavailable

## Development

```bash
# Install dependencies
npm install

# Build (production)
npm run build

# Build (watch mode)
npm run dev
```

## License

MIT
