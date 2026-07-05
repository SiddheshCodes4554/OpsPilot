export interface PromptMetadata {
  name: string
  description: string
  tags: string[]
}

export interface PromptExample<TInput, TOutput> {
  input: TInput
  output: TOutput
}
