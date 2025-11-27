import { Command } from "commander"

export const configCommand = new Command("config")
  .description("Show current configuration")
  .action(async () => {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (apiKey) {
        const masked = apiKey.slice(0, 7) + "..." + apiKey.slice(-4)
        console.log(`API Key: ${masked}`)
      } else {
        console.log("No API key configured")
        console.log("\nTo set your API key:")
        console.log("  1. Copy contents of .env.example to .env")
        console.log(
          "  2. Get your key from: https://console.anthropic.com/settings/keys"
        )
        console.log("  3. Add your Anthropic API key to .env")
      }
    } catch (error) {
      console.error("Error loading config:", error)
      process.exit(1)
    }
  })
