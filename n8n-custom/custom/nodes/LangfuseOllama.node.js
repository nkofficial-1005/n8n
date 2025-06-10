const { Ollama } = require('@langchain/community/llms/ollama');
const { Langfuse } = require('langfuse');

class LangfuseOllama {
  description = {
    displayName: 'Langfuse Ollama',
    name: 'langfuseOllama',
    icon: 'file:bitovi.svg',
    group: ['transform'],
    version: 1,
    description: 'Query Ollama with Langfuse tracing',
    defaults: {
      name: 'Langfuse Ollama',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'ollamaApi',
        required: true,
        displayOptions: {
          show: {},
        },
      },
      {
        name: 'langfuseApi',
        required: true,
        displayOptions: {
          show: {},
        },
      },
    ],
    properties: [
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        default: '',
        required: false,
        description: 'Leave empty to use incoming JSON field `prompt`',
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getOllamaModels',
        },
        default: '',
        required: true,
        description: 'Models will be fetched from your Ollama server after successful connection',
      }
    ],
  };
  methods = {
    loadOptions: {
      async getOllamaModels() {
        const creds = await this.getCredentials('ollamaApi');

        const response = await this.helpers.request({
          method: 'GET',
          uri: `${creds.baseUrl}/api/tags`,
          json: true,
        });

        const models = response.models || response.tags || [];

        return models.map((model) => ({
          name: model.name || model,
          value: model.name || model,
        }));
      },
    },
  };

  async execute() {
    const items = this.getInputData();
    const returnData = [];

    for (let i = 0; i < items.length; i++) {
      let prompt = this.getNodeParameter('prompt', i);

      if (!prompt) {
        prompt = items[i].json.prompt;

        if (!prompt) {
          throw new Error('No prompt provided via parameter or input');
        }

        console.log('[LangfuseOllama] Prompt pulled from input:', prompt);
      } else {
        console.log('[LangfuseOllama] Prompt from UI input:', prompt);
      }

      const model = this.getNodeParameter('model', i);
      
      const langfuseCreds = await this.getCredentials('langfuseApi');
      const { publicKey, secretKey, baseUrl } = langfuseCreds;

      console.log('[LangfuseOllama] Initializing Langfuse...');
      const langfuse = new Langfuse({
        publicKey,
        secretKey,
        baseUrl,
        debug: true,
      });

      console.log('[LangfuseOllama] Creating trace...');
      const trace = langfuse.trace({
        name: 'ollama-node-trace',
        userId: 'n8n-langfuse-node',
      });

      console.log('[LangfuseOllama] Trace ID:', trace.traceId);

      const span = trace.span({
        name: 'ollama-inference',
      });

      console.log('[LangfuseOllama] Created span.');

      try {
        console.log(`[LangfuseOllama] Sending prompt to Ollama (model=${model})...`);
        const ollamaCreds = await this.getCredentials('ollamaApi');
        const llm = new Ollama({
          model,
          baseUrl: ollamaCreds.baseUrl,
        });

        const response = await llm.invoke(prompt);
        console.log('[LangfuseOllama] Ollama response:', response);

        console.log('[LangfuseOllama] Updating span...');
        await span.update({
          input: prompt,
          output: response,
        });

        console.log('[LangfuseOllama] Ending span...');
        await span.end();

        console.log('[LangfuseOllama] Updating trace...');
        await trace.update({
          input: prompt,
          output: response,
        });

        console.log('[LangfuseOllama] Flushing Langfuse...');
        if (typeof langfuse.flush === 'function') {
          await langfuse.flush();
        }

        returnData.push({
          json: {
            response,
            traceId: trace.traceId,
            prompt,
          },
        });
      } catch (error) {
        console.error('[LangfuseOllama] Error occurred:', error);

        await span.update({
          statusMessage: error.message,
        });

        await span.end();
        if (typeof langfuse.flush === 'function') {
          await langfuse.flush();
        }

        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
            },
          });
          continue;
        }

        throw error;
      }
    }

    return this.prepareOutputData(returnData);
  }
}

module.exports = { LangfuseOllama };