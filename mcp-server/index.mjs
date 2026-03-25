#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class ZuperPlaywrightMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'zuper-playwright-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'run_playwright_test',
          description: 'Run a specific Playwright test file or all tests. Supports both E2E and unit tests.',
          inputSchema: {
            type: 'object',
            properties: {
              testFile: {
                type: 'string',
                description: 'Path to the test file (e.g., "tests/complete-vendor-mr-po-flow-refactored.spec.js") or "all" to run all tests',
              },
              config: {
                type: 'string',
                description: 'Configuration to use: "e2e" or "unit". Default is "e2e"',
                enum: ['e2e', 'unit'],
              },
              headed: {
                type: 'boolean',
                description: 'Run tests in headed mode (visible browser). Default is false',
              },
              debug: {
                type: 'boolean',
                description: 'Run tests in debug mode. Default is false',
              },
            },
            required: ['testFile'],
          },
        },
        {
          name: 'list_test_files',
          description: 'List all available Playwright test files in the project',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Optional pattern to filter test files (e.g., "vendor", "customer")',
              },
            },
          },
        },
        {
          name: 'get_test_results',
          description: 'Get the latest test results from the most recent test run',
          inputSchema: {
            type: 'object',
            properties: {
              format: {
                type: 'string',
                description: 'Output format: "summary" or "detailed". Default is "summary"',
                enum: ['summary', 'detailed'],
              },
            },
          },
        },
        {
          name: 'view_test_report',
          description: 'Generate and open the HTML test report in a browser',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'check_auth_status',
          description: 'Check if the authentication state file exists and is valid',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'regenerate_auth',
          description: 'Regenerate the authentication state by running global-setup',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_test_data',
          description: 'Retrieve test data configuration for a specific entity type',
          inputSchema: {
            type: 'object',
            properties: {
              entity: {
                type: 'string',
                description: 'Entity type: "login", "vendor", "materialRequest", "purchaseOrder", "customer", "organization", "part"',
                enum: ['login', 'vendor', 'materialRequest', 'purchaseOrder', 'customer', 'organization', 'part', 'all'],
              },
            },
            required: ['entity'],
          },
        },
        {
          name: 'update_test_data',
          description: 'Update test data configuration (for environment variables)',
          inputSchema: {
            type: 'object',
            properties: {
              entity: {
                type: 'string',
                description: 'Entity type to update',
              },
              data: {
                type: 'object',
                description: 'Data to update',
              },
            },
            required: ['entity', 'data'],
          },
        },
        {
          name: 'get_page_object',
          description: 'Get the content of a specific Page Object Model file',
          inputSchema: {
            type: 'object',
            properties: {
              page: {
                type: 'string',
                description: 'Page name: "LoginPage", "VendorPage", "MaterialRequestPage", "PurchaseOrderPage", etc.',
              },
            },
            required: ['page'],
          },
        },
        {
          name: 'run_global_setup',
          description: 'Run the global setup script to authenticate and save session',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'run_playwright_test':
            return await this.runPlaywrightTest(args);
          case 'list_test_files':
            return await this.listTestFiles(args);
          case 'get_test_results':
            return await this.getTestResults(args);
          case 'view_test_report':
            return await this.viewTestReport();
          case 'check_auth_status':
            return await this.checkAuthStatus();
          case 'regenerate_auth':
            return await this.regenerateAuth();
          case 'get_test_data':
            return await this.getTestData(args);
          case 'update_test_data':
            return await this.updateTestData(args);
          case 'get_page_object':
            return await this.getPageObject(args);
          case 'run_global_setup':
            return await this.runGlobalSetup();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}\n\nStack: ${error.stack}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async runPlaywrightTest(args) {
    const { testFile = 'all', config = 'e2e', headed = false, debug = false } = args;

    let command = 'npx playwright test';

    if (testFile !== 'all') {
      command += ` ${testFile}`;
    }

    command += ` --config=playwright.${config}.config.js`;

    if (headed) {
      command += ' --headed';
    }

    if (debug) {
      command += ' --debug';
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return {
        content: [
          {
            type: 'text',
            text: `Test execution completed!\n\n=== STDOUT ===\n${stdout}\n\n${stderr ? `=== STDERR ===\n${stderr}` : ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Test execution failed!\n\n=== STDOUT ===\n${error.stdout}\n\n=== STDERR ===\n${error.stderr}\n\n=== ERROR ===\n${error.message}`,
          },
        ],
      };
    }
  }

  async listTestFiles(args) {
    const { pattern = '' } = args;

    try {
      const testsDir = join(PROJECT_ROOT, 'tests');
      const files = await readdir(testsDir);
      const testFiles = files
        .filter((file) => file.endsWith('.spec.js'))
        .filter((file) => !pattern || file.toLowerCase().includes(pattern.toLowerCase()))
        .map((file) => `tests/${file}`);

      return {
        content: [
          {
            type: 'text',
            text: `Found ${testFiles.length} test file(s):\n\n${testFiles.map((f, i) => `${i + 1}. ${f}`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to list test files: ${error.message}`);
    }
  }

  async getTestResults(args) {
    const { format = 'summary' } = args;

    try {
      const resultsPath = join(PROJECT_ROOT, 'test-results');
      const dirs = await readdir(resultsPath, { withFileTypes: true });
      const resultDirs = dirs.filter((d) => d.isDirectory()).map((d) => d.name);

      if (resultDirs.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No test results found. Run tests first to generate results.',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Found ${resultDirs.length} test result(s):\n\n${resultDirs.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\nTo view detailed results, use the 'view_test_report' tool.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `No test results found yet. Run tests first: ${error.message}`,
          },
        ],
      };
    }
  }

  async viewTestReport() {
    try {
      const { stdout, stderr } = await execAsync('npx playwright show-report --host=127.0.0.1', {
        cwd: PROJECT_ROOT,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Test report server started!\n\n${stdout}\n\nThe HTML report should open in your browser automatically.\nAccess it at: http://localhost:9323`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to open test report: ${error.message}\n\nMake sure tests have been run and results exist.`,
          },
        ],
      };
    }
  }

  async checkAuthStatus() {
    try {
      const authPath = join(PROJECT_ROOT, 'tests/.auth/user.json');
      const authData = await readFile(authPath, 'utf-8');
      const auth = JSON.parse(authData);

      const cookieCount = auth.cookies?.length || 0;
      const hasOrigins = auth.origins && auth.origins.length > 0;

      return {
        content: [
          {
            type: 'text',
            text: `✓ Authentication state file exists\n\nDetails:\n- Cookies: ${cookieCount}\n- Origins: ${hasOrigins ? 'Yes' : 'No'}\n- File size: ${authData.length} bytes\n\nAuthentication appears to be configured correctly.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `✗ Authentication state file not found or invalid\n\nError: ${error.message}\n\nRun 'regenerate_auth' to create a new authentication state.`,
          },
        ],
      };
    }
  }

  async regenerateAuth() {
    try {
      const { stdout, stderr } = await execAsync('node tests/global-setup.js', {
        cwd: PROJECT_ROOT,
      });

      return {
        content: [
          {
            type: 'text',
            text: `✓ Authentication regenerated successfully!\n\n${stdout}\n\nThe authentication state has been saved to tests/.auth/user.json`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `✗ Failed to regenerate authentication\n\nError: ${error.message}\n\nSTDOUT:\n${error.stdout}\n\nSTDERR:\n${error.stderr}`,
          },
        ],
      };
    }
  }

  async getTestData(args) {
    const { entity } = args;

    try {
      const testDataPath = join(PROJECT_ROOT, 'tests/config/test-data-config.js');
      const content = await readFile(testDataPath, 'utf-8');

      if (entity === 'all') {
        return {
          content: [
            {
              type: 'text',
              text: `Test Data Configuration:\n\n${content}`,
            },
          ],
        };
      }

      // Extract specific entity data from the file
      const entityRegex = new RegExp(`${entity}:\\s*{[^}]*}`, 's');
      const match = content.match(entityRegex);

      if (match) {
        return {
          content: [
            {
              type: 'text',
              text: `Test Data for '${entity}':\n\n${match[0]}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Entity '${entity}' not found in test data configuration.`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get test data: ${error.message}`);
    }
  }

  async updateTestData(args) {
    return {
      content: [
        {
          type: 'text',
          text: 'Test data updates should be done by modifying environment variables or the test-data-config.js file directly.\n\nTo update:\n1. Set environment variables (e.g., COMPANY_NAME, LOGIN_EMAIL, LOGIN_PASSWORD)\n2. Or edit tests/config/test-data-config.js directly',
        },
      ],
    };
  }

  async getPageObject(args) {
    const { page } = args;

    try {
      const pagePath = join(PROJECT_ROOT, 'tests/pages', `${page}.js`);
      const content = await readFile(pagePath, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: `Page Object Model: ${page}\n\nFile: tests/pages/${page}.js\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Page Object '${page}' not found.\n\nAvailable pages:\n- LoginPage\n- VendorPage\n- MaterialRequestPage\n- PurchaseOrderPage\n- PartsPage\n\nError: ${error.message}`,
          },
        ],
      };
    }
  }

  async runGlobalSetup() {
    try {
      const { stdout, stderr } = await execAsync('node tests/global-setup.js', {
        cwd: PROJECT_ROOT,
        env: { ...process.env, NODE_ENV: 'test' },
      });

      return {
        content: [
          {
            type: 'text',
            text: `✓ Global setup completed successfully!\n\n=== OUTPUT ===\n${stdout}\n\n${stderr ? `=== WARNINGS ===\n${stderr}` : ''}\n\nAuthentication state saved to: tests/.auth/user.json`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `✗ Global setup failed!\n\n=== ERROR ===\n${error.message}\n\n=== STDOUT ===\n${error.stdout}\n\n=== STDERR ===\n${error.stderr}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Zuper Playwright MCP Server running on stdio');
  }
}

const server = new ZuperPlaywrightMCPServer();
server.run().catch(console.error);
