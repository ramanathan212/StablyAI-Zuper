# MCP Server Setup Guide

This guide will help you set up the Zuper Playwright MCP Server with Claude Desktop.

## Prerequisites

- Node.js installed (v18 or higher)
- Claude Desktop application installed
- Zuper Playwright project set up

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd /Users/zuper/Playwrite-Automation/mcp-server
npm install
```

### 2. Configure Claude Desktop

1. **Locate Claude Desktop config file:**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Edit the config file** (create it if it doesn't exist):

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

3. **Update the configuration:**
   - Replace `/Users/zuper/Playwrite-Automation/mcp-server/index.js` with the actual path to your MCP server
   - Update the environment variables with your actual credentials

### 3. Restart Claude Desktop

After saving the config file, completely quit and restart Claude Desktop for the changes to take effect.

### 4. Verify Installation

1. Open Claude Desktop
2. Start a new conversation
3. Look for a 🔌 icon or MCP indicator showing that the server is connected
4. Try asking Claude: "What Playwright test tools are available?"

Claude should be able to list the available MCP tools.

## Quick Test

Try these commands with Claude to verify everything is working:

1. **List test files:**
   ```
   List all the Playwright test files in the project
   ```

2. **Check authentication:**
   ```
   Check the authentication status for the tests
   ```

3. **View a page object:**
   ```
   Show me the VendorPage code
   ```

4. **Run a test:**
   ```
   Run the vendor test in headed mode
   ```

## Troubleshooting

### MCP Server Not Showing Up

1. **Check config file location:**
   ```bash
   # macOS
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Validate JSON syntax:**
   - Use a JSON validator to ensure the config file is valid
   - Check for missing commas, brackets, or quotes

3. **Check Node.js installation:**
   ```bash
   node --version
   ```

4. **View Claude Desktop logs:**
   - macOS: `~/Library/Logs/Claude/`
   - Look for MCP-related error messages

### MCP Server Crashes

1. **Test the server manually:**
   ```bash
   node /Users/zuper/Playwrite-Automation/mcp-server/index.js
   ```
   - The server should start without errors
   - Press Ctrl+C to stop

2. **Check dependencies:**
   ```bash
   cd /Users/zuper/Playwrite-Automation/mcp-server
   npm install
   ```

### Authentication Issues

1. **Verify credentials in config:**
   - Make sure COMPANY_NAME, LOGIN_EMAIL, and LOGIN_PASSWORD are correct

2. **Regenerate auth state:**
   - Ask Claude: "Regenerate the authentication state"

3. **Check auth file:**
   ```bash
   ls -la /Users/zuper/Playwrite-Automation/tests/.auth/user.json
   ```

### Test Execution Fails

1. **Verify Playwright is installed:**
   ```bash
   cd /Users/zuper/Playwrite-Automation
   npx playwright --version
   ```

2. **Check test files exist:**
   ```bash
   ls -la tests/*.spec.js
   ```

3. **Run tests manually first:**
   ```bash
   npm run test:e2e
   ```

## Environment Variables

You can override test configuration using environment variables in the MCP config:

```json
{
  "mcpServers": {
    "zuper-playwright": {
      "command": "node",
      "args": ["/Users/zuper/Playwrite-Automation/mcp-server/index.js"],
      "env": {
        "COMPANY_NAME": "your-company",
        "LOGIN_EMAIL": "your-email@example.com",
        "LOGIN_PASSWORD": "your-password",
        "NODE_ENV": "test"
      }
    }
  }
}
```

## Security Best Practices

1. **Protect your config file:**
   ```bash
   chmod 600 ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Use environment variables:**
   - Consider storing credentials in a separate `.env` file
   - Reference them in the MCP config

3. **Don't commit credentials:**
   - Add `claude_desktop_config.json` to `.gitignore`
   - Never share your config file publicly

## Advanced Configuration

### Running Multiple MCP Servers

You can configure multiple MCP servers in Claude Desktop:

```json
{
  "mcpServers": {
    "zuper-playwright": {
      "command": "node",
      "args": ["/Users/zuper/Playwrite-Automation/mcp-server/index.js"]
    },
    "another-server": {
      "command": "node",
      "args": ["/path/to/another/server.js"]
    }
  }
}
```

### Custom Timeouts

Modify the MCP server code to adjust command timeouts:

```javascript
// In index.js, modify execAsync calls:
const { stdout, stderr } = await execAsync(command, {
  cwd: PROJECT_ROOT,
  maxBuffer: 10 * 1024 * 1024,
  timeout: 300000 // 5 minutes
});
```

## Support

If you encounter issues:

1. Check the Claude Desktop logs
2. Test the MCP server manually
3. Verify all dependencies are installed
4. Ensure file paths are absolute and correct
5. Review the troubleshooting section above

## Next Steps

Once the MCP server is set up, you can:

- Ask Claude to run specific tests
- View test results and reports
- Inspect Page Object Models
- Manage authentication state
- Get test data configurations

Example conversations:
- "Run all E2E tests and show me the results"
- "What's in the VendorPage Page Object?"
- "Check if authentication is working"
- "List all test files related to customers"
