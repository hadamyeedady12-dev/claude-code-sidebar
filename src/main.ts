import { Plugin, WorkspaceLeaf, addIcon } from "obsidian";
import { ClaudeCodeTerminalView, VIEW_TYPE_CLAUDE_CODE } from "./TerminalView";

interface ClaudeCodeSettings {
	claudePath: string;
}

const DEFAULT_SETTINGS: ClaudeCodeSettings = {
	claudePath: "",
};

const CLAUDE_ICON = `<svg viewBox="0 0 21 16" xmlns="http://www.w3.org/2000/svg">
  <!-- Claude Code Mascot - With visible eyes and arms -->

  <!-- Left ear -->
  <rect x="3" y="0" width="2" height="3" fill="currentColor"/>

  <!-- Right ear -->
  <rect x="16" y="0" width="2" height="3" fill="currentColor"/>

  <!-- Head top bar -->
  <rect x="5" y="1" width="11" height="2" fill="currentColor"/>

  <!-- Main head - built around eyes -->
  <rect x="3" y="3" width="15" height="1" fill="currentColor"/>
  <rect x="3" y="4" width="2" height="2" fill="currentColor"/>
  <rect x="8" y="4" width="5" height="2" fill="currentColor"/>
  <rect x="16" y="4" width="2" height="2" fill="currentColor"/>
  <rect x="3" y="6" width="15" height="2" fill="currentColor"/>

  <!-- Mouth (visible dark line) -->
  <rect x="7" y="7" width="7" height="1" fill="currentColor" opacity="0.35"/>

  <!-- Left arm -->
  <rect x="0" y="4" width="2" height="4" fill="currentColor"/>

  <!-- Right arm -->
  <rect x="19" y="4" width="2" height="4" fill="currentColor"/>

  <!-- Chin/body bar -->
  <rect x="5" y="8" width="11" height="2" fill="currentColor"/>

  <!-- Left foot -->
  <rect x="4" y="10" width="3" height="6" fill="currentColor"/>

  <!-- Right foot -->
  <rect x="14" y="10" width="3" height="6" fill="currentColor"/>
</svg>`;

export default class ClaudeCodeSidebarPlugin extends Plugin {
	settings: ClaudeCodeSettings = DEFAULT_SETTINGS;

	async onload() {
		console.log("Loading Claude Code Sidebar plugin");
		await this.loadSettings();

		addIcon("claude-code-icon", CLAUDE_ICON);

		this.registerView(
			VIEW_TYPE_CLAUDE_CODE,
			(leaf: WorkspaceLeaf) => new ClaudeCodeTerminalView(leaf, this)
		);

		this.addRibbonIcon("claude-code-icon", "Open Claude Code", async () => {
			await this.activateView();
		});

		this.addCommand({
			id: "open-claude-code-terminal",
			name: "Open Claude Code Terminal",
			callback: async () => {
				await this.activateView();
			},
		});

		console.log("Claude Code Sidebar plugin loaded");
	}

	async onunload() {
		console.log("Unloading Claude Code Sidebar plugin");
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CLAUDE_CODE);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CLAUDE_CODE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_CLAUDE_CODE,
					active: true,
				});
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async findClaudePath(): Promise<string> {
		if (this.settings.claudePath && this.settings.claudePath.trim() !== "") {
			return this.settings.claudePath;
		}

		const commonPaths = [
			"/opt/homebrew/bin/claude",
			"/usr/local/bin/claude",
			"/usr/bin/claude",
			`${process.env.HOME}/.local/bin/claude`,
			`${process.env.HOME}/bin/claude`,
			`${process.env.HOME}/.npm-global/bin/claude`,
		];

		const { exec } = require("child_process");
		const { promisify } = require("util");
		const execAsync = promisify(exec);

		for (const path of commonPaths) {
			try {
				const fs = require("fs");
				if (fs.existsSync(path)) {
					return path;
				}
			} catch {
				continue;
			}
		}

		try {
			const { stdout } = await execAsync("which claude");
			return stdout.trim();
		} catch {
			// Fall through
		}

		return "claude";
	}
}
