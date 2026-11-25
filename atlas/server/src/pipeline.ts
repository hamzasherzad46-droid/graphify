import Anthropic from '@anthropic-ai/sdk'

export class PipelineError extends Error {
  readonly kind: 'refused' | 'too_long' | 'bad_output' | 'api'
  constructor(kind: PipelineError['kind'], message: string) {
    super(message)
    this.kind = kind
  }
}

export const MODEL = 'claude-opus-5-5'
const MAX_TOKENS = 64000

/** The two calls the pipeline makes; replaced by a fake in tests. */
export interface Caller {
  json(system: string, content: Anthropic.Beta.BetaContentBlockParam[], schema: Record<string, unknown>, opts?: { effort?: 'low' | 'medium' | 'high' }): Promise<unknown>
}

/**
 * One structured call to Claude: streamed (long outputs), effort high by default (quality matters more than speed here),
 * adaptive thinking (the default on this model), the output held to `schema` by structured outputs, and server-side
 * fallbacks so a request declined by a safety classifier is retried on a suitable model instead of failing.
 */
export function claudeCaller(client: Anthropic): Caller {
  return {
    async json(system, content, schema, opts) {
      let message: Anthropic.Beta.BetaMessage
      try {
        const stream = client.beta.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          output_config: { effort: opts?.effort ?? 'high', format: { type: 'json_schema', schema } },
          messages: [{ role: 'user', content }],
        })
        message = await stream.finalMessage()
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) throw new PipelineError('api', 'Atlas is busy. Please try again in a minute.')
        if (e instanceof Anthropic.BadRequestError) throw new PipelineError('api', 'The notes could not be sent. Try fewer or smaller pages.')
        if (e instanceof Anthropic.APIError) throw new PipelineError('api', 'The question service is not available just now. Please try again.')
        throw e
      }
      if (message.stop_reason === 'refusal') throw new PipelineError('refused', 'These notes could not be turned into questions.')
      if (message.stop_reason === 'max_tokens') throw new PipelineError('too_long', 'The notes are too long for one set. Try fewer pages.')
      const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
      try {
        return JSON.parse(text)
      } catch {
        throw new PipelineError('bad_output', 'Something went wrong while writing the questions. Please try again.')
      }
    },
  }
}
