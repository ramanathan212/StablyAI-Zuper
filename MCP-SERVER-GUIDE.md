# Zuper Playwright MCP Server - Complete Guide

## Overview

The Zuper Playwright MCP Server enables AI assistants like Claude to directly interact with your Playwright test automation framework. This allows you to run tests, view results, inspect code, and manage authentication through natural language conversations.

## What is MCP?

MCP (Model Context Protocol) is a protocol that allows AI assistants to access external tools and data sources. This MCP server specifically provides tools for Playwright test automation.

## Features

### 🧪 Test Execution
- Run specific test files or all tests
- Control test execution (headed mode, debug mode)
- Support for both E2E and unit tests
- Real-time test results

### 📊 Results & Reporting
- View test results summaries
- Open HTML test reports
- Access detailed execution logs
- Track test history

### 🔐 Authentication Management
- Check authentication status
- Regenerate auth sessions
- Verify saved credentials
- Run global setup

### 📁 Code Inspection
- View Page Object Models
- Access test data configurations
- List all test files
- Filter tests by pattern

## Quick Start

### 1. Installation

```bash
cd /Users/zuper/Playwrite-Automation/mcp-server
npm install
```

### 2. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zuper-playwright": {
      "command": "node",
      "args": ["/Users/zuper/Playwrite-Automation/mcp-server/index.js"],
      "env": {
        "COMPANY_NAME": "zuper-pro",
        "LOGIN_EMAIL": "vignesh.s@zuper.co",
        "LOGIN_PASSWORD": "Vicky@123"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Quit and restart Claude Desktop completely for changes to take effect.

### 4. Verify

Ask Claude: "What Playwright test tools are available?"

## Available Tools

| Tool | Description | Use Case |
|------|-------------|----------|
| `run_playwright_test` | Execute tests | "Run the vendor test" |
| `list_test_files` | List all tests | "What tests do we have?" |
| `get_test_results` | View results | "Show me the last test results" |
| `view_test_report` | Open HTML report | "Open the test report" |
| `check_auth_status` | Verify auth | "Is authentication working?" |
| `regenerate_auth` | Refresh auth | "Regenerate the auth state" |
| `get_test_data` | View test data | "Show me vendor test data" |
| `get_page_object` | View page code | "Show me VendorPage code" |
| `run_global_setup` | Run setup | "Run the global setup" |

## Example Conversations

### Running Tests

**You:** "Run the complete vendor workflow test in headed mode"

**Claude:** Uses `run_playwright_test` with:
- testFile: "tests/complete-vendor-mr-po-flow-refactored.spec.js"
- headed: true

---

**You:** "Run all E2E tests"

**Claude:** Uses `run_playwright_test` with:
- testFile: "all"
- config: "e2e"

### Inspecting Code

**You:** "Show me what's in the VendorPage"

**Claude:** Uses `get_page_object` with page: "VendorPage" and displays the code

---

**You:** "What test data do we have for vendors?"

**Claude:** Uses `get_test_data` with entity: "vendor"

### Managing Tests

**You:** "List all customer-related tests"

**Claude:** Uses `list_test_files` with pattern: "customer"

---

**You:** "What were the results of the last test run?"

**Claude:** Uses `get_test_results` and shows summary

### Authentication

**You:** "Check if authentication is set up correctly"

**Claude:** Uses `check_auth_status` to verify auth state

---

**You:** "The login isn't working, can you regenerate it?"

**Claude:** Uses `regenerate_auth` to create new session

## Project Structure

```
mcp-server/
├── index.js              # Main MCP server (10 tools)
├── package.json          # Dependencies
├── README.md            # Detailed documentation
├── SETUP.md             # Setup instructions
├── claude-config.json   # Example config
├── test-server.js       # Test script
└── .gitignore          # Git ignore rules
```

## How It Works

```
┌─────────────────┐
│  Claude Desktop │
└────────┬────────┘
         │ MCP Protocol
         │
┌────────▼────────┐
│   MCP Server    │
│  (Node.js)      │
└────────┬────────┘
         │ CLI Commands
         │
┌────────▼────────┐
│   Playwright    │
│  Test Suite     │
└─────────────────┘
```

1. You talk to Claude in natural language
2. Claude selects the appropriate MCP tool
3. MCP server executes Playwright commands
4. Results are returned to Claude
5. Claude presents the information to you

## Authentication Flow

The MCP server uses the existing global-setup.js authentication:

```
1. global-setup.js runs → Logs in to Zuper
2. Saves session → tests/.auth/user.json
3. Tests use saved session → No login needed
4. MCP tools can regenerate → If session expires
```

## Troubleshooting

### Server Not Appearing in Claude

1. Check config file location:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. Validate JSON syntax

3. Restart Claude Desktop completely

4. Check Claude logs: `~/Library/Logs/Claude/`

### Tests Failing

1. Verify Playwright is installed:
   ```bash
   npx playwright --version
   ```

2. Check auth state exists:
   ```bash
   ls -la tests/.auth/user.json
   ```

3. Run tests manually first:
   ```bash
   npm run test:e2e
   ```

### Authentication Issues

1. Use `check_auth_status` tool
2. Use `regenerate_auth` tool
3. Verify credentials in config
4. Check the auth file has recent timestamp

## Security Considerations

⚠️ **Important Security Notes:**

1. **Credentials in Config**: Your login credentials are stored in the Claude Desktop config file
2. **Protect Config File**:
   ```bash
   chmod 600 ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
3. **Don't Commit**: Never commit `claude_desktop_config.json` to version control
4. **Auth State**: The `tests/.auth/user.json` file contains session cookies
5. **Access Control**: Only give Claude access to test environments, not production

## Advanced Usage

### Running Specific Test Scenarios

**You:** "Run just the vendor creation test without the full workflow"

**Claude:** Can analyze test files and run specific test blocks if needed

### Debugging Failed Tests

**You:** "The material request test is failing, can you help debug it?"

**Claude:** Can:
1. Run the test to see the error
2. View the Page Object code
3. Check test data configuration
4. Suggest fixes

### Batch Operations

**You:** "Run all tests and create a summary report"

**Claude:** Can:
1. Run all tests
2. Get results
3. Analyze failures
4. Present summary

## Integration with CI/CD

The MCP server can be used locally during development. For CI/CD:

1. Use standard Playwright commands in your pipeline
2. Use environment variables for credentials
3. MCP server is for local development/debugging

## Limitations

- **Local Only**: MCP server runs on your machine
- **Single User**: Designed for individual developer use
- **Test Environment**: Should only access test/UAT environments
- **No Production**: Never point at production systems

## Updates and Maintenance

### Updating the MCP Server

1. Pull latest changes
2. Reinstall dependencies: `npm install`
3. Restart Claude Desktop

### Adding New Tools

Edit `mcp-server/index.js`:

1. Add tool definition in `ListToolsRequestSchema` handler
2. Add implementation in `CallToolRequestSchema` handler
3. Test manually
4. Restart Claude Desktop

## Benefits

✅ **Natural Language Testing**: Ask Claude to run tests conversationally
✅ **Quick Debugging**: Instantly access test code and results
✅ **No Context Switching**: Stay in Claude, don't switch to terminal
✅ **Intelligent Analysis**: Claude can analyze failures and suggest fixes
✅ **Time Saving**: Automate repetitive test management tasks

## Support

For issues:

1. Check the [SETUP.md](mcp-server/SETUP.md) file
2. Review Claude Desktop logs
3. Test the server manually: `node mcp-server/test-server.js`
4. Verify Playwright installation
5. Check authentication state

## Files Reference

| File | Purpose |
|------|---------|
| [mcp-server/index.js](mcp-server/index.js) | Main server implementation |
| [mcp-server/README.md](mcp-server/README.md) | Detailed documentation |
| [mcp-server/SETUP.md](mcp-server/SETUP.md) | Step-by-step setup |
| [mcp-server/test-server.js](mcp-server/test-server.js) | Server test script |
| [tests/global-setup.js](tests/global-setup.js) | Authentication setup |
| [playwright.e2e.config.js](playwright.e2e.config.js) | E2E test config |

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure Claude Desktop
3. ✅ Restart Claude
4. 🎯 Start using: "List all my Playwright tests"
5. 🎯 Run a test: "Run the vendor test in headed mode"
6. 🎯 Debug: "Why is the material request test failing?"

---

**Pro Tip**: You can chain requests naturally with Claude:

"Run all E2E tests, then show me the results, and if anything fails, help me debug it by showing the relevant Page Object code."

Claude will orchestrate multiple MCP tool calls to accomplish this!
