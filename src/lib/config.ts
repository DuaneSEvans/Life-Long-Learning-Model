import { existsSync, mkdirSync } from "fs"
import { join } from "path"
import { homedir } from "os"

export interface Config {
  apiKey?: string
}

const CONFIG_DIR = join(homedir(), ".lllm")
const CONFIG_FILE = join(CONFIG_DIR, "config.json")

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export async function loadConfig(): Promise<Config> {
  ensureConfigDir()

  if (!existsSync(CONFIG_FILE)) {
    return {}
  }

  try {
    const file = Bun.file(CONFIG_FILE)
    const content = await file.text()
    return JSON.parse(content)
  } catch (error) {
    console.error("Error loading config:", error)
    return {}
  }
}

export async function saveConfig(config: Config): Promise<void> {
  ensureConfigDir()

  try {
    await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error("Error saving config:", error)
    throw error
  }
}

export async function getApiKey(): Promise<string | null> {
  const config = await loadConfig()
  return config.apiKey || null
}

export async function setApiKey(apiKey: string): Promise<void> {
  const config = await loadConfig()
  config.apiKey = apiKey
  await saveConfig(config)
}
