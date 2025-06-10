const { INodeType, INodeTypeDescription } = require('n8n-workflow');

class GitHubActionError {
  description = {
    displayName: 'GitHub Action Error',
    name: 'gitHubActionError',
    icon: 'file:github.svg',
    group: ['transform'],
    version: 1,
    description: 'Fetches error information from GitHub Actions and suggests fixes',
    defaults: {
      name: 'GitHub Action Error',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'GitHub API Token',
        name: 'githubApiToken',
        type: 'string',
        default: '',
        typeOptions: {
          password: true,
        },
        description: 'Personal access token for GitHub API authentication',
        required: true,
      },
      {
        displayName: 'Repository Owner',
        name: 'owner',
        type: 'string',
        default: '',
        description: 'GitHub repository owner',
        required: true,
      },
      {
        displayName: 'Repository Name',
        name: 'repo',
        type: 'string',
        default: '',
        description: 'GitHub repository name',
        required: true,
      },
      {
        displayName: 'Run ID',
        name: 'runId',
        type: 'string',
        default: '',
        description: 'The ID of the workflow run',
        required: true,
      },
    ],
  };

  async execute() {
    const items = this.getInputData();
    const returnData = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const githubApiToken = this.getNodeParameter('githubApiToken', i);
        const owner = this.getNodeParameter('owner', i);
        const repo = this.getNodeParameter('repo', i);
        const runId = this.getNodeParameter('runId', i);

        // Set up GitHub API request
        const options = {
          method: 'GET',
          url: `<https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/logs>`,
          headers: {
            'User-Agent': 'n8n',
            Authorization: `token ${githubApiToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
          encoding: null, // Required to download as binary
        };

        // Fetch logs
        const response = await this.helpers.request(options);

        // Process logs (assuming logs are in a ZIP file)
        // Extract error messages from logs (implementation depends on log format)

        // For demonstration, let's assume we have extracted an error message
        const errorMessage = 'Sample error message from logs';

        // Search for possible fixes (e.g., using an AI model or API)
        // Placeholder for actual implementation
        const suggestions = [
          {
            error: errorMessage,
            suggestion: 'Possible fix for the error.',
          },
        ];

        returnData.push({
          json: suggestions[0],
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message } });
          continue;
        }
        throw error;
      }
    }

    return this.prepareOutputData(returnData);
  }
}

module.exports = { GitHubActionError };