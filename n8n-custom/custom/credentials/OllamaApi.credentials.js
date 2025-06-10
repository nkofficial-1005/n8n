class OllamaApi {
  constructor() {
    this.name = 'ollamaApi';
    this.displayName = 'Ollama API';
    this.documentationUrl = 'https://ollama.com';
    this.properties = [
      {
        displayName: 'Base URL',
        name: 'baseUrl',
        type: 'string',
        default: 'http://localhost:11434',
        placeholder: 'http://host.docker.internal:11434',
        required: true,
      },
    ];

    this.authenticate = {
      type: 'generic',
      properties: {
        baseUrl: '={{$credentials.baseUrl}}',
      },
    };

    this.test = {
      request: {
        method: 'GET',
        url: '={{$credentials.baseUrl}}/api/tags',
      },
    };
  }
}

module.exports = {
  OllamaApi,
};
