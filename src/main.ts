import { Plugin, Notice } from "obsidian";
import { ClaudeCodeTerminalView } from "./TerminalView";
import { ClaudeCodeSettingTab } from "./SettingsTab";
import { existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import type { ClaudeCodeSettings } from "./types";
import { VIEW_TYPE_CLAUDE_CODE, DEFAULT_SETTINGS, CLAUDE_PATHS } from "./constants";

const execAsync = promisify(exec);

export default class ClaudeCodeSidebarPlugin extends Plugin {
  settings: ClaudeCodeSettings = DEFAULT_SETTINGS;
  private cachedClaudePath: string | null = null;

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
    const loadedData = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(loadedData as Partial<ClaudeCodeSettings> | null),
    };
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

    // Return cached path if available
    if (this.cachedClaudePath) {
      return this.cachedClaudePath;
    }

    const homedir = process.env.HOME ?? process.env.USERPROFILE ?? "";
    const isWindows = process.platform === "win32";

    // Get platform-specific paths with env var substitution
    const pathTemplates = isWindows ? CLAUDE_PATHS.windows : CLAUDE_PATHS.unix;
    const paths = pathTemplates.map((template) =>
      template
        .replace("${HOME}", homedir)
        .replace("${APPDATA}", process.env.APPDATA ?? "")
        .replace("${LOCALAPPDATA}", process.env.LOCALAPPDATA ?? "")
    );

    // Check common paths
    for (const p of paths) {
      if (p && existsSync(p)) {
        this.cachedClaudePath = p;
        return p;
      }
    }

    // Try which/where command
    try {
      const cmd = isWindows ? "where claude" : "which claude";
      const { stdout } = await execAsync(cmd);
      const match = stdout.split(/\r?\n/).find((l) => l.trim());
      if (match) {
        this.cachedClaudePath = match.trim();
        return this.cachedClaudePath;
      }
    } catch (error) {
      // Command not found - this is expected if claude isn't in PATH
      console.debug("Claude CLI not found in PATH:", error);
    }

    return "claude";
  }

  /**
   * Clear cached Claude path (call when settings change)
   */
  clearCachedClaudePath(): void {
    this.cachedClaudePath = null;
  }

  /**
   * Install Claude CLI via npm
   */
  async installClaudeCLI(): Promise<boolean> {
    try {
      new Notice("Installing Claude CLI...");
      await execAsync("npm install -g @anthropic-ai/claude-code");
      this.clearCachedClaudePath();
      new Notice("Claude CLI installed successfully!");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Installation failed: ${message}`);
      return false;
    }
  }
}
