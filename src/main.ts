import { Plugin, WorkspaceLeaf, addIcon } from "obsidian";
import { ClaudeCodeTerminalView, VIEW_TYPE_CLAUDE_CODE } from "./TerminalView";

interface ClaudeCodeSettings {
	claudePath: string;
}

const DEFAULT_SETTINGS: ClaudeCodeSettings = {
	claudePath: "",
};

const CLAUDE_ICON = `<svg viewBox="0 0 20 18" xmlns="http://www.w3.org/2000/svg">
  <!-- Claude Code Mascot - CUTE VERSION -->

  <!-- Cute round ears -->
  <rect x="2" y="0" width="3" height="2" rx="0.5" fill="currentColor"/>
  <rect x="2" y="1" width="2" height="3" fill="currentColor"/>
  <rect x="15" y="0" width="3" height="2" rx="0.5" fill="currentColor"/>
  <rect x="16" y="1" width="2" height="3" fill="currentColor"/>

  <!-- Big round head -->
  <rect x="4" y="2" width="12" height="2" rx="1" fill="currentColor"/>
  <rect x="2" y="4" width="16" height="6" rx="1" fill="currentColor"/>

  <!-- Big cute eyes (white/hollow) - bigger = cuter -->
  <rect x="4" y="5" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.15"/>
  <rect x="12" y="5" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.15"/>

  <!-- Cute small smile -->
  <rect x="8" y="8" width="4" height="1" rx="0.5" fill="currentColor" opacity="0.2"/>

  <!-- Small cute arms -->
  <rect x="0" y="5" width="2" height="3" rx="0.5" fill="currentColor"/>
  <rect x="18" y="5" width="2" height="3" rx="0.5" fill="currentColor"/>

  <!-- Chubby body -->
  <rect x="5" y="10" width="10" height="2" rx="0.5" fill="currentColor"/>

  <!-- Cute stubby feet -->
  <rect x="4" y="12" width="4" height="6" rx="1" fill="currentColor"/>
  <rect x="12" y="12" width="4" height="6" rx="1" fill="currentColor"/>
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
