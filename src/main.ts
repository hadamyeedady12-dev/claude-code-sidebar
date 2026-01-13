import { Plugin, PluginSettingTab, App, Setting } from "obsidian";
import { ClaudeCodeTerminalView, VIEW_TYPE_CLAUDE_CODE } from "./TerminalView";
import { existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface ClaudeCodeSettings {
  claudePath: string;
}

const DEFAULT_SETTINGS: ClaudeCodeSettings = {
  claudePath: "",
};

export default class ClaudeCodeSidebarPlugin extends Plugin {
  settings: ClaudeCodeSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_CLAUDE_CODE, (leaf) => new ClaudeCodeTerminalView(leaf, this));

    this.addRibbonIcon("terminal", "Open Claude Code", () => this.activateView());

    this.addCommand({
      id: "open-claude-code-terminal",
      name: "Open Claude Code Terminal",
      callback: () => this.activateView(),
    });

    this.addSettingTab(new ClaudeCodeSettingTab(this.app, this));
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CLAUDE_CODE);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_CLAUDE_CODE);

    if (leaves.length > 0) {
      workspace.revealLeaf(leaves[0]);
      return;
    }

    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_CLAUDE_CODE, active: true });
      workspace.revealLeaf(leaf);
    }
  }

  async findClaudePath(): Promise<string> {
    // User-configured path takes priority
    if (this.settings.claudePath?.trim()) {
      return this.settings.claudePath;
    }

    // Platform-specific common paths
    const homedir = process.env.HOME || process.env.USERPROFILE || "";
    const paths =
      process.platform === "win32"
        ? [
            `${process.env.APPDATA}\\npm\\claude.cmd`,
            `${homedir}\\.npm-global\\claude.cmd`,
            `${process.env.LOCALAPPDATA}\\Programs\\claude\\claude.exe`,
          ]
        : [
            "/opt/homebrew/bin/claude",
            "/usr/local/bin/claude",
            "/usr/bin/claude",
            `${homedir}/.local/bin/claude`,
            `${homedir}/.npm-global/bin/claude`,
          ];

    // Check common paths (sync is fine here, only runs once)
    for (const p of paths) {
      if (existsSync(p)) return p;
    }

    // Try which/where command
    try {
      const cmd = process.platform === "win32" ? "where claude" : "which claude";
      const { stdout } = await execAsync(cmd);
      const match = stdout.split(/\r?\n/).find((l) => l.trim());
      if (match) return match.trim();
    } catch {
      // Not found via which
    }

    return "claude";
  }
}

class ClaudeCodeSettingTab extends PluginSettingTab {
  plugin: ClaudeCodeSidebarPlugin;

  constructor(app: App, plugin: ClaudeCodeSidebarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Claude Code Settings" });

    new Setting(containerEl)
      .setName("Claude CLI Path")
      .setDesc("Path to the Claude CLI executable. Leave empty for auto-detection.")
      .addText((text) =>
        text
          .setPlaceholder("/usr/local/bin/claude")
          .setValue(this.plugin.settings.claudePath)
          .onChange(async (value) => {
            this.plugin.settings.claudePath = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
