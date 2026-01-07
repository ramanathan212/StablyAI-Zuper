# Playwright MCP Integration Guide

## ✅ Installation Complete!

Your Playwright MCP server has been successfully installed and configured.

---

## 📦 What Was Installed

### 1. Playwright MCP Package
- **Package**: `@playwright/mcp@0.0.53`
- **Location**: `/Users/zuper/Playwrite-Automation/node_modules/@playwright/mcp/`
- **Binary**: `node_modules/.bin/mcp-server-playwright`

### 2. MCP Configuration
- **Config File**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Server Name**: `playwright-mcp`

---

## 🔧 Configuration Details

Your Claude Desktop now has **TWO MCP servers** configured:

### 1. Custom Zuper Playwright Server
```json
{
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
```

### 2. Official Playwright MCP Server (NEW ✨)
```json
{
  "playwright-mcp": {
    "command": "node",
    "args": ["/Users/zuper/Playwrite-Automation/node_modules/@playwright/mcp/cli.js"],
    "env": {
      "PLAYWRIGHT_PROJECT_PATH": "/Users/zuper/Playwrite-Automation"
    }
  }
}
```

---

## 🚀 How to Activate

### Step 1: Restart Claude Desktop App
The MCP servers are loaded when Claude Desktop starts. To activate the new Playwright MCP:

1. **Quit Claude Desktop** completely (Cmd+Q on Mac)
2. **Reopen Claude Desktop**
3. The MCP server will auto-start

### Step 2: Verify MCP Tools Are Available
After restarting Claude Desktop, you should see MCP tools available in the conversation. Look for tool indicators like:
- 🔧 Tool icons in the UI
- Playwright-specific commands available

---

## 🎯 What Can Playwright MCP Do?

The official `@playwright/mcp` server provides these capabilities:

### 1. **Browser Automation Tools**
- ✅ Launch browsers (Chrome, Firefox, WebKit, Edge)
- ✅ Navigate to URLs
- ✅ Take screenshots
- ✅ Execute JavaScript in browser context
- ✅ Fill forms and click elements
- ✅ Wait for elements and network

### 2. **Testing Capabilities**
- ✅ Run Playwright tests
- ✅ Get test results in real-time
- ✅ Debug test failures
- ✅ Generate test reports

### 3. **Advanced Features**
- ✅ Vision capabilities (screenshot analysis)
- ✅ PDF generation
- ✅ Service worker blocking
- ✅ Origin allow/block lists

---

## 📝 Available MCP Commands

Once activated in Claude Desktop, you can use commands like:

### Browser Control
```
"Launch a Chrome browser and navigate to https://uat.zuperpro.com"
"Take a screenshot of the login page"
"Fill the email field with test@example.com"
```

### Test Execution
```
"Run the Playwright tests in the tests/ folder"
"Show me the test results for the last run"
"Debug why the login test is failing"
```

### Code Generation
```
"Generate a Playwright test for the login flow"
"Create a page object for the Jobs page"
```

---

## 🔍 Verifying Installation

### Manual Test
Run this command to test the MCP server directly:

```bash
cd /Users/zuper/Playwrite-Automation
node node_modules/@playwright/mcp/cli.js --help
```

You should see the Playwright MCP help output.

### Check MCP Server Status
```bash
# List all configured MCP servers
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq '.mcpServers'
```

---

## 🐛 Troubleshooting

### Issue 1: MCP Tools Not Showing in Claude Desktop

**Solution:**
1. Ensure Claude Desktop is **fully quit** (not just minimized)
2. Check the config file exists:
   ```bash
   ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
3. Verify JSON syntax is valid:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
   ```

### Issue 2: "Command Not Found" Error

**Solution:**
Ensure the path to `cli.js` is correct:
```bash
ls -la /Users/zuper/Playwrite-Automation/node_modules/@playwright/mcp/cli.js
```

### Issue 3: Permission Denied

**Solution:**
Make the CLI executable:
```bash
chmod +x /Users/zuper/Playwrite-Automation/node_modules/@playwright/mcp/cli.js
```

---

## 📚 Additional Configuration Options

### Enable Vision Capabilities
Edit the config to add vision support:

```json
{
  "playwright-mcp": {
    "command": "node",
    "args": [
      "/Users/zuper/Playwrite-Automation/node_modules/@playwright/mcp/cli.js",
      "--caps", "vision,pdf"
    ],
    "env": {
      "PLAYWRIGHT_PROJECT_PATH": "/Users/zuper/Playwrite-Automation"
    }
  }
}
```

### Specify Browser
Default browser is Chrome, but you can change it:

```json
{
  "playwright-mcp": {
    "command": "node",
    "args": [
      "/Users/zuper/Playwrite-Automation/node_modules/@playwright/mcp/cli.js",
      "--browser", "firefox"
    ],
    "env": {
      "PLAYWRIGHT_PROJECT_PATH": "/Users/zuper/Playwrite-Automation"
    }
  }
}
```

### Block Service Workers
Useful for testing without caching:

```json
{
  "playwright-mcp": {
    "command": "node",
    "args": [
      "/Users/zuper/Playwrite-Automation/node_modules/@playwright/mcp/cli.js",
      "--block-service-workers"
    ],
    "env": {
      "PLAYWRIGHT_PROJECT_PATH": "/Users/zuper/Playwrite-Automation"
    }
  }
}
```

---

## 🔐 Security Notes

### Credentials in Custom Server
Your custom `zuper-playwright` server contains login credentials in the config. Consider:

1. **Environment Variables**: Move credentials to system environment variables
2. **Separate Config**: Use a `.env` file (not committed to git)
3. **Encryption**: Use OS keychain for sensitive data

### Example: Using Environment Variables
```json
{
  "zuper-playwright": {
    "command": "node",
    "args": ["/Users/zuper/Playwrite-Automation/mcp-server/index.js"],
    "env": {
      "COMPANY_NAME": "${ZUPER_COMPANY_NAME}",
      "LOGIN_EMAIL": "${ZUPER_LOGIN_EMAIL}",
      "LOGIN_PASSWORD": "${ZUPER_LOGIN_PASSWORD}"
    }
  }
}
```

Then set in your shell:
```bash
export ZUPER_COMPANY_NAME="zuper-pro"
export ZUPER_LOGIN_EMAIL="vignesh.s@zuper.co"
export ZUPER_LOGIN_PASSWORD="Vicky@123"
```

---

## 📖 Resources

- **Playwright MCP GitHub**: https://github.com/microsoft/playwright-mcp
- **Playwright Docs**: https://playwright.dev
- **MCP Protocol**: https://modelcontextprotocol.io
- **Claude Desktop MCP**: https://docs.anthropic.com/claude/docs/mcp

---

## 🎉 Next Steps

1. ✅ **Restart Claude Desktop** to activate MCP
2. ✅ **Test basic commands** like "Take a screenshot of google.com"
3. ✅ **Try test execution** with your existing Playwright tests
4. ✅ **Explore advanced features** like vision and PDF capabilities

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Claude Desktop logs
3. Verify MCP server is running: `ps aux | grep mcp`
4. File issues at: https://github.com/microsoft/playwright-mcp/issues

---

**Installation Date**: December 24, 2025
**Installed By**: Claude Code Assistant
**Version**: @playwright/mcp@0.0.53
