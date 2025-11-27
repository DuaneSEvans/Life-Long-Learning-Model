import { Command } from "commander"
import { setApiKey, getApiKey, loadConfig } from "../lib/config"

export const configCommand = new Command("config").description(
  "Manage LLLM configuration"
)

configCommand
  .command("set-api-key <key>")
  .description("Set your Anthropic API key")
  .action(async (key: string) => {
    try {
      await setApiKey(key)
      console.log(" API key saved successfully")
    } catch (error) {
      console.error("Error saving API key:", error)
      process.exit(1)
    }
  })

configCommand
  .command("show")
  .description("Show current configuration")
  .action(async () => {
    try {
      const config = await loadConfig()
      if (config.apiKey) {
        const masked =
          config.apiKey.slice(0, 7) + "..." + config.apiKey.slice(-4)
        console.log(`API Key: ${masked}`)
      } else {
        console.log("No API key configured")
        console.log("\nSet your API key with:")
        console.log("  lllm config set-api-key <your-key>")
      }
    } catch (error) {
      console.error("Error loading config:", error)
      process.exit(1)
    }
  })
