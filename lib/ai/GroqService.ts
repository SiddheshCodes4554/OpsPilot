import Groq from "groq-sdk"
import { z } from "zod"
import { ChatMessage, GroqCompletionOptions, StreamChunkCallback } from "./types"

export class GroqService {
  private static instance: GroqService | null = null
  private client: Groq
  private defaultModel = "llama-3.3-70b-versatile"
  private defaultTimeout = 30000
  private defaultMaxRetries = 3

  private constructor() {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error("❌ Missing GROQ_API_KEY environment variable.")
    }
    this.client = new Groq({ apiKey })
  }

  /**
   * Retrieves the singleton instance of the GroqService.
   */
  public static getInstance(): GroqService {
    if (!GroqService.instance) {
      GroqService.instance = new GroqService()
    }
    return GroqService.instance
  }

  /**
   * Helper that wraps requests with exponential backoff retry logic.
   * Catches Rate Limits (429), timeouts, and internal server errors (5xx).
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = this.defaultMaxRetries,
    baseDelay = 1000
  ): Promise<T> {
    let attempt = 0
    while (attempt < maxRetries) {
      try {
        return await fn()
      } catch (err: unknown) {
        attempt++

        // Safely parse error fields for inspection
        const statusCode =
          err && typeof err === "object" && "status" in err ? (err as { status: number }).status : undefined
        const errorName =
          err && typeof err === "object" && "name" in err ? (err as { name: string }).name : ""
        const errorMessage = err instanceof Error ? err.message : String(err)

        const isRateLimit = statusCode === 429
        const isTimeout = errorName === "TimeoutError" || errorMessage.includes("timeout")
        const isRetryable = isRateLimit || isTimeout || (statusCode !== undefined && statusCode >= 500)

        if (attempt >= maxRetries || !isRetryable) {
          throw err
        }

        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500
        console.warn(
          `[GroqService] Attempt ${attempt} failed with status ${statusCode ?? "unknown"} (${errorMessage}). ` +
            `Retrying in ${Math.round(delay)}ms...`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
    throw new Error("Max retries reached")
  }

  /**
   * Executes a standard chat completion.
   */
  async chatCompletion(
    messages: ChatMessage[],
    options: GroqCompletionOptions = {}
  ): Promise<string> {
    const model = options.model ?? this.defaultModel
    const timeout = options.timeout ?? this.defaultTimeout
    const temperature = options.temperature ?? 0.2
    const maxTokens = options.maxTokens

    const requestFn = async () => {
      const response = await this.client.chat.completions.create(
        {
          model,
          messages,
          temperature,
          max_completion_tokens: maxTokens,
          response_format: options.jsonMode ? { type: "json_object" } : undefined,
        },
        {
          timeout,
        }
      )
      return response.choices[0]?.message?.content ?? ""
    }

    return this.withRetry(requestFn, options.maxRetries)
  }

  /**
   * Executes a chat completion and parses + validates the JSON response against a Zod schema.
   */
  async chatStructured<T>(
    messages: ChatMessage[],
    schema: z.Schema<T>,
    options: GroqCompletionOptions = {}
  ): Promise<T> {
    // Force JSON Mode for structured output
    const jsonOptions: GroqCompletionOptions = {
      ...options,
      jsonMode: true,
    }

    const rawContent = await this.chatCompletion(messages, jsonOptions)
    if (!rawContent) {
      throw new Error("[GroqService] Received empty content in structured response.")
    }

    const parsedJson = JSON.parse(rawContent)
    return schema.parse(parsedJson)
  }

  /**
   * Executes a streaming chat completion, invoking the callback for each token chunk.
   */
  async chatStream(
    messages: ChatMessage[],
    callback: StreamChunkCallback,
    options: GroqCompletionOptions = {}
  ): Promise<string> {
    const model = options.model ?? this.defaultModel
    const timeout = options.timeout ?? this.defaultTimeout
    const temperature = options.temperature ?? 0.2
    const maxTokens = options.maxTokens

    const requestFn = async () => {
      const stream = await this.client.chat.completions.create(
        {
          model,
          messages,
          temperature,
          max_completion_tokens: maxTokens,
          stream: true,
        },
        {
          timeout,
        }
      )

      let fullText = ""
      for await (const chunk of stream) {
        const chunkText = chunk.choices[0]?.delta?.content ?? ""
        if (chunkText) {
          fullText += chunkText
          await callback(chunkText)
        }
      }
      return fullText
    }

    return this.withRetry(requestFn, options.maxRetries)
  }
}
