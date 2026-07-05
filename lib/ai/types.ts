export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface GroqCompletionOptions {
  /**
   * The model identifier (e.g. "llama-3.3-70b-versatile" or "llama-3.1-8b-instant")
   */
  model?: string

  /**
   * Value between 0.0 and 2.0 to control output creativity
   */
  temperature?: number

  /**
   * Limit on number of generated tokens
   */
  maxTokens?: number

  /**
   * Enforces raw structured JSON output
   */
  jsonMode?: boolean

  /**
   * Maximum API request retry attempts on transient failures or rate limits (429)
   */
  maxRetries?: number

  /**
   * Request timeout delay in milliseconds
   */
  timeout?: number
}

export type StreamChunkCallback = (chunkText: string) => void | Promise<void>
