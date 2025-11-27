import { existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { claude, type Message } from "./claude"

export interface TopicMetadata {
  topics: {
    [key: string]: {
      displayName: string
      fileName: string
      createdAt: string
      lastUpdated: string
      questionCount: number
    }
  }
}

export interface QuestionAnswer {
  question: string
  answer: string
  timestamp: string
}

// Get project root relative to this file's location
// This file is at: <project_root>/src/lib/topics.ts
// So we go up 2 levels: lib/ -> src/ -> project_root/
const PROJECT_ROOT = join(import.meta.dir, "..", "..")
const STORAGE_DIR = join(PROJECT_ROOT, "src", ".storage")
const TOPICS_DIR = join(STORAGE_DIR, ".topics")
const METADATA_FILE = join(STORAGE_DIR, ".metadata.json")

export function ensureStorageDir(): void {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true })
  }
  if (!existsSync(TOPICS_DIR)) {
    mkdirSync(TOPICS_DIR, { recursive: true })
  }
}

export async function loadMetadata(): Promise<TopicMetadata> {
  ensureStorageDir()

  if (!existsSync(METADATA_FILE)) {
    const emptyMetadata: TopicMetadata = { topics: {} }
    await saveMetadata(emptyMetadata)
    return emptyMetadata
  }

  try {
    const file = Bun.file(METADATA_FILE)
    const content = await file.text()
    return JSON.parse(content)
  } catch (error) {
    console.error("Error loading metadata:", error)
    return { topics: {} }
  }
}

export async function saveMetadata(metadata: TopicMetadata): Promise<void> {
  ensureStorageDir()
  await Bun.write(METADATA_FILE, JSON.stringify(metadata, null, 2))
}

// Normalize topic names to prevent duplicates (e.g., "tailwind" and "tailwindcss")
function normalizeTopic(topic: string): string {
  const normalized = topic.toLowerCase().replace(/\s+/g, "")

  // Common suffixes to remove for normalization
  const suffixes = ["css", "js", "ts"]

  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length) {
      const base = normalized.slice(0, -suffix.length)
      // Check if removing suffix makes sense (e.g., "tailwindcss" -> "tailwind")
      // but not for things like "express" where removing "ss" wouldn't make sense
      if (base.length >= 3) {
        return base
      }
    }
  }

  return normalized
}

export async function detectTopic(
  question: string,
  conversationHistory: Message[] = []
): Promise<string> {
  const prompt = `Analyze this question and determine its topic.
Consider the conversation history if provided.

Question: "${question}"

${
  conversationHistory.length > 0
    ? `Recent conversation:\n${conversationHistory
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")}`
    : ""
}

If the topic is clear and specific (e.g., mentions "Go", "TypeScript", "RAG", "LLMs"), respond with ONLY the topic name in lowercase with no spaces (e.g., "golang", "typescript", "rag", "llms").

If the topic is ambiguous, respond with: "CLARIFY: option1, option2, option3" where you list 2-3 possible topics.

Topic:`

  const response = await claude.chat([{ role: "user", content: prompt }], {
    temperature: 0.3,
    maxTokens: 100,
  })

  return response.trim()
}

export async function saveQuestionAnswer(
  topic: string,
  question: string,
  answer: string
): Promise<void> {
  ensureStorageDir()

  const metadata = await loadMetadata()

  // Normalize the topic to prevent duplicates (e.g., "tailwind" and "tailwindcss")
  const normalizedTopic = normalizeTopic(topic)
  const topicKey = normalizedTopic.replace(/\s+/g, "-")
  const fileName = `${topicKey}.md`
  const filePath = join(TOPICS_DIR, fileName)

  // Update or create topic metadata
  if (!metadata.topics[topicKey]) {
    metadata.topics[topicKey] = {
      displayName: normalizedTopic,
      fileName,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      questionCount: 0,
    }
  }

  metadata.topics[topicKey].lastUpdated = new Date().toISOString()
  metadata.topics[topicKey].questionCount += 1

  await saveMetadata(metadata)

  // Read existing content or create new
  let content = ""
  if (existsSync(filePath)) {
    const file = Bun.file(filePath)
    content = await file.text()
  } else {
    content = `# ${normalizedTopic}\n\n`
  }

  // Append new Q&A
  const timestamp = new Date().toISOString().split("T")[0]
  const newEntry = `## ${question}\n*Asked: ${timestamp}*\n\n${answer}\n\n---\n\n`

  content += newEntry

  await Bun.write(filePath, content)
}

export async function listTopics(): Promise<string[]> {
  const metadata = await loadMetadata()
  return Object.keys(metadata.topics)
}

export async function getTopicContent(topic: string): Promise<string> {
  const metadata = await loadMetadata()
  const topicKey = topic.toLowerCase().replace(/\s+/g, "-")

  if (!metadata.topics[topicKey]) {
    throw new Error(`Topic "${topic}" not found`)
  }

  const fileName = metadata.topics[topicKey].fileName
  const filePath = join(TOPICS_DIR, fileName)

  if (!existsSync(filePath)) {
    throw new Error(`Topic file not found: ${fileName}`)
  }

  const file = Bun.file(filePath)
  return await file.text()
}
