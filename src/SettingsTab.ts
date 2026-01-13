import { App, PluginSettingTab, Setting } from "obsidian";
import type ClaudeCodeSidebarPlugin from "./main";

export class ClaudeCodeSettingTab extends PluginSettingTab {
  plugin: ClaudeCodeSidebarPlugin;

  constructor(app: App, plugin: ClaudeCodeSidebarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Claude Code Settings" });

    // Claude CLI Path
    new Setting(containerEl)
      .setName("Claude CLI Path")
      .setDesc("Path to the Claude CLI executable. Leave empty for auto-detection.")
      .addText((text) =>
        text
          .setPlaceholder("/usr/local/bin/claude")
          .setValue(this.plugin.settings.claudePath)
          .onChange(async (value) => {
            this.plugin.settings.claudePath = value;
            this.plugin.clearCachedClaudePath();
            await this.plugin.saveSettings();
          })
      );

    // Font Size
    new Setting(containerEl)
      .setName("Font Size")
      .setDesc("Terminal font size (default: 13)")
      .addSlider((slider) =>
        slider
          .setLimits(10, 24, 1)
          .setValue(this.plugin.settings.fontSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.fontSize = value;
            await this.plugin.saveSettings();
          })
      );

    // Theme
    new Setting(containerEl)
      .setName("Theme")
      .setDesc("Terminal color theme")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("dark", "Dark")
          .addOption("light", "Light")
          .setValue(this.plugin.settings.theme)
          .onChange(async (value) => {
            this.plugin.settings.theme = value as "dark" | "light";
            await this.plugin.saveSettings();
          })
      );

    // Auto Restart
    new Setting(containerEl)
      .setName("Auto Restart")
      .setDesc("Automatically restart session when it ends unexpectedly")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoRestart).onChange(async (value) => {
          this.plugin.settings.autoRestart = value;
          await this.plugin.saveSettings();
        })
      );

    // CLI Install Button
    new Setting(containerEl)
      .setName("Install Claude CLI")
      .setDesc("Install Claude CLI via npm if not already installed.")
      .addButton((btn) =>
        btn
          .setButtonText("Install")
          .setCta()
          .onClick(() => this.plugin.installClaudeCLI())
      );
  }
}
