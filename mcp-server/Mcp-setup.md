# Zuper Playwright MCP Server

An MCP (Model Context Protocol) server that provides AI assistants like Claude with tools to interact with the Zuper Playwright test automation framework.

## Features

This MCP server provides the following tools:

### Test Execution Tools
- **run_playwright_test** - Run specific test files or all tests with various options (headed mode, debug mode, etc.)
- **run_global_setup** - Execute the global authentication setup
- **regenerate_auth** - Regenerate authentication state

### Test Management Tools
- **list_test_files** - List all available test files with optional filtering
- **get_test_results** - View results from the most recent test run
- **view_test_report** - Open the HTML test report in a browser

### Configuration Tools
- **check_auth_status** - Verify authentication state is valid
- **get_test_data** - Retrieve test data configuration for specific entities
- **get_page_object** - View Page Object Model files

## Installation

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Make the server executable:
```bash
chmod +x index.js
```

## Configuration

### For Claude Desktop

Add this configuration to your Claude Desktop config file:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration:**
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

**Important:** Update the path in `args` to match your actual project location.

### For Other MCP Clients

The server communicates via stdio and follows the Model Context Protocol specification. Configure your MCP client to run:
```bash
node /Users/zuper/Playwrite-Automation/mcp-server/index.js
```

## Available Tools

### 1. run_playwright_test
Run Playwright tests with various options.

**Parameters:**
- `testFile` (required): Path to test file or "all"
- `config` (optional): "e2e" or "unit" (default: "e2e")
- `headed` (optional): Run with visible browser (default: false)
- `debug` (optional): Run in debug mode (default: false)

**Examples:**
```javascript
// Run a specific test
{ "testFile": "tests/complete-vendor-mr-po-flow-refactored.spec.js" }

// Run all E2E tests
{ "testFile": "all", "config": "e2e" }

// Run with visible browser
{ "testFile": "tests/create-customer.spec.js", "headed": true }
```

### 2. list_test_files
List all test files in the project.

**Parameters:**
- `pattern` (optional): Filter by pattern (e.g., "vendor", "customer")

**Example:**
```javascript
{ "pattern": "vendor" }
```

### 3. get_test_results
View results from the most recent test run.

**Parameters:**
- `format` (optional): "summary" or "detailed" (default: "summary")

### 4. view_test_report
Open the HTML test report in a browser. This starts a local server at http://localhost:9323.

### 5. check_auth_status
Check if authentication state exists and is valid.

### 6. regenerate_auth
Regenerate the authentication state by running the global setup script.

### 7. get_test_data
Retrieve test data configuration.

**Parameters:**
- `entity` (required): Entity type - "login", "vendor", "materialRequest", "purchaseOrder", "customer", "organization", "part", or "all"

**Example:**
```javascript
{ "entity": "vendor" }
```

### 8. get_page_object
View the content of a Page Object Model file.

**Parameters:**
- `page` (required): Page name (e.g., "LoginPage", "VendorPage")

**Example:**
```javascript
{ "page": "VendorPage" }
```

### 9. run_global_setup
Execute the global authentication setup script.

## Usage Examples

### With Claude Desktop

After configuring the MCP server in Claude Desktop, you can interact with it using natural language:

**Example conversations:**

1. "Run the vendor test in headed mode"
   - Claude will use `run_playwright_test` with appropriate parameters

2. "What test files do we have for customers?"
   - Claude will use `list_test_files` with pattern "customer"

3. "Check if authentication is working"
   - Claude will use `check_auth_status`

4. "Show me the VendorPage code"
   - Claude will use `get_page_object` with page "VendorPage"

5. "Run all E2E tests and show me the results"
   - Claude will use `run_playwright_test` followed by `get_test_results`

## Architecture

The MCP server is built using:
- **@modelcontextprotocol/sdk** - Official MCP SDK
- **Node.js** child_process for executing Playwright commands
- **File system operations** for reading test configurations and results

## Project Structure

```
mcp-server/
├── index.js              # Main MCP server implementation
├── package.json          # Node.js dependencies
├── claude-config.json    # Example Claude Desktop config
└── README.md            # This file
```

## Troubleshooting

### Server Not Connecting

1. Check that Node.js is installed: `node --version`
2. Verify dependencies are installed: `npm install`
3. Check the path in your MCP client configuration
4. Look for errors in the Claude Desktop logs

### Authentication Issues

1. Run `check_auth_status` to verify auth state
2. Use `regenerate_auth` to create a new session
3. Check that environment variables are set correctly
4. Verify credentials in the configuration

### Test Execution Failures

1. Ensure Playwright is installed in the main project
2. Check that test files exist at the specified paths
3. Verify the global setup has run successfully
4. Review test results using `get_test_results`

## Security Notes

- The authentication credentials are stored in the MCP server configuration
- The auth state file (`tests/.auth/user.json`) contains session cookies
- Keep these files secure and don't commit them to version control
- Consider using environment variables for sensitive data

## Development

To modify or extend the MCP server:

1. Edit `index.js` to add new tools or modify existing ones
2. Update the tool schemas in `setupToolHandlers()`
3. Test changes by restarting Claude Desktop
4. Monitor logs for errors

## License

MIT
