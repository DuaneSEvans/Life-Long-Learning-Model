import Anthropic from "@anthropic-ai/sdk"

export interface Message {
  role: "user" | "assistant"
  content: string
}

export interface StreamHandler {
  onText?: (text: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: Error) => void
}

export class ClaudeClient {
  private client: Anthropic | null = null

  async initialize(): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      throw new Error(
        "No API key configured. See setup instructions with: lllm config"
      )
    }

    this.client = new Anthropic({ apiKey })
  }

  async chat(
    messages: Message[],
    options?: {
      stream?: boolean
      temperature?: number
      maxTokens?: number
      system?: string
      onStream?: StreamHandler
    }
  ): Promise<string> {
    if (!this.client) {
      await this.initialize()
    }

    const {
      stream = false,
      temperature = 0.7,
      maxTokens = 4096,
      system,
      onStream,
    } = options || {}

    try {
      if (stream && onStream) {
        return await this.streamChat(
          messages,
          temperature,
          maxTokens,
          system,
          onStream
        )
      } else {
        return await this.nonStreamChat(
          messages,
          temperature,
          maxTokens,
          system
        )
      }
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Claude API Error: ${error.message}`)
      }
      throw error
    }
  }

  private async streamChat(
    messages: Message[],
    temperature: number,
    maxTokens: number,
    system: string | undefined,
    handler: StreamHandler
  ): Promise<string> {
    let fullText = ""

    try {
      const stream = await this.client!.messages.stream({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: maxTokens,
        temperature,
        ...(system && { system }),
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      })

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          const text = chunk.delta.text
          fullText += text
          handler.onText?.(text)
        }
      }

      handler.onComplete?.(fullText)
      return fullText
    } catch (error) {
      handler.onError?.(error as Error)
      throw error
    }
  }

  private async nonStreamChat(
    messages: Message[],
    temperature: number,
    maxTokens: number,
    system: string | undefined
  ): Promise<string> {
    const response = await this.client!.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      temperature,
      ...(system && { system }),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const textContent = response.content.find((block) => block.type === "text")
    return textContent && textContent.type === "text" ? textContent.text : ""
  }
}

export const claude = new ClaudeClient()
