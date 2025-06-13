const { INodeType, INodeTypeDescription } = require('n8n-workflow');
const { ChatOllama } = require('@langchain/community/chat_models/ollama');
const { HumanMessage } = require('@langchain/core/messages');
const { N8nLangfuseHandler } = require('../LMOllama/N8nLangfuseHandler');

class LMChatOllama {
  description = {
    displayName: 'Langfuse Ollama Chat',
    name: 'LMChatOllama',         // ← must match class name & file name
    icon: 'file:ollama.svg',
    group: ['transform'],
    version: 1,
    description: 'Ollama chat with optional Langfuse tracing',
    subNode: true,                // ← critical for chat subnode
    subNodeType: 'chat',          // ← critical for chat subnode
    defaults: { name: 'LM Chat Ollama' },
    credentials: [
      { name: 'ollamaApi',   required: true },
      { name: 'langfuseApi', required: false },
    ],
    properties: [
      { displayName: 'Model',   name: 'model',   type: 'string', default: 'llama3' },
      { displayName: 'Message', name: 'message', type: 'string', default: '' },
    ],
  };

  async getModel() {
    const model   = this.getNodeParameter('model', 0);
    const creds   = await this.getCredentials('ollamaApi');
    const lfCreds = await this.getCredentials('langfuseApi', false);
    const callbacks = lfCreds ? [new N8nLangfuseHandler(lfCreds)] : [];

    return new ChatOllama({
      baseUrl:    creds.baseUrl,
      model,
      callbacks,
    });
  }
}

module.exports = { LMChatOllama };