const { Langfuse } = require('langfuse');
const { BaseCallbackHandler } = require('@langchain/core/callbacks/base');

class LangfuseN8nHandler extends BaseCallbackHandler {
  constructor(config) {
    super();
    this.name = 'LangfuseN8nHandler';
    this.langfuse = new Langfuse({
      publicKey: config.publicKey,
      secretKey: config.secretKey,
      baseUrl: config.baseUrl,
      debug: true,
    });
    this.input = null;
    this.startTime = null;
    this.llmName = null;
    console.log('[LangfuseN8nHandler] Initialized with config:', config);
  }

  async handleLLMStart(llm, prompts, runId, parentRunId, extra) {
    console.log('[LangfuseN8nHandler] handleLLMStart invoked');
    this.startTime = new Date();
    this.llmName = llm?.model || 'ollama';
    let raw = Array.isArray(prompts) ? prompts[0] : prompts;
    this.input = typeof raw === 'string'
      ? raw.replace(/^Human:\s*/, '')
      : raw?.text || String(raw);
    console.log('[LangfuseN8nHandler] Captured input:', this.input);
  }

  async handleLLMEnd(output, runId, parentRunId, tags, metadata) {
    console.log('[LangfuseN8nHandler] handleLLMEnd invoked');
    metadata = metadata || {};

    // Parse the response text
    let text = '[missing output]';
    if (output?.generations) {
      const gens = output.generations;
      text = Array.isArray(gens[0]) ? gens[0][0]?.text : gens[0]?.text;
    }
    console.log('[LangfuseN8nHandler] Parsed output:', text);

    const endTime = new Date();

    // Extract token usage if available
    const usage = metadata.tokenUsage || {};
    const promptTokens    = usage.promptTokens    || 0;
    const completionTokens= usage.completionTokens || 0;
    const totalTokens     = promptTokens + completionTokens;

    // Create the trace with only non-input/output metadata
    const trace = this.langfuse.trace({
      name: metadata.traceName   || `${this.llmName}-trace`,
      userId: metadata.userId    || 'n8n-user',
      sessionId: metadata.sessionId,
      tags: metadata.tags        || tags || [],
      metadata: {
        model: this.llmName,
        promptTokens,
        completionTokens,
        totalTokens,
        ...(metadata.extraMetadata || {}),
      },
    });
    console.log('[LangfuseN8nHandler] Created trace:', trace.id);

    // Update trace-level input/output fields (so they show up correctly)
    await trace.update({
      input: this.input,
      output: text,
    });
    console.log('[LangfuseN8nHandler] Updated trace input/output');

    // Create and complete a span for inference
    const span = trace.span({ name: `${this.llmName}-inference` });
    await span.update({
      startTime: this.startTime,
      endTime,
      input: this.input,
      output: text,
    });
    await span.end();
    console.log('[LangfuseN8nHandler] Completed span:', span.id);

    // Flush events to Langfuse
    await (this.langfuse.flushAsync ? this.langfuse.flushAsync() : this.langfuse.flush());
    console.log('[LangfuseN8nHandler] Flushed trace and span to Langfuse');
  }
}

module.exports = { LangfuseN8nHandler };