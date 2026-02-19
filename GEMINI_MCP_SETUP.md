# Gemini Code Assist MCP Setup

To use the Playwright tools and your custom Zuper automation tools within **Gemini Code Assist**, you need to configure the Model Context Protocol (MCP) server settings.

## 1. Locate Settings File
Gemini Code Assist uses a global settings file located at:

**Mac/Linux**: `~/.gemini/settings.json`  
**Windows**: `C:\Users\<YourUser>\.gemini\settings.json`

## 2. Configuration to Add
Copy the following JSON configuration into your `settings.json` file. 

> [!NOTE]
> If the file already exists, add these entries to the existing `mcpServers` object. If the file doesn't exist, create it with this content.

```json
{
  "mcpServers": {
    "playwright-mcp": {
      "command": "node",
      "args": [
        "/Users/zuper/Playwrite-Automation/node_modules/@playwright/mcp/cli.js"
      ],
      "env": {
        "PLAYWRIGHT_PROJECT_PATH": "/Users/zuper/Playwrite-Automation"
      }
    },
    "zuper-playwright": {
      "command": "node",
      "args": [
        "/Users/zuper/Playwrite-Automation/mcp-server/index.js"
      ],
      "env": {
        "COMPANY_NAME": "zuper-pro",
        "LOGIN_EMAIL": "vignesh.s@zuper.co",
        "LOGIN_PASSWORD": "Vicky@123"
      }
    }
  }
}
```

## 3. Activate and Verify
1. **Restart your IDE** (VS Code, IntelliJ, etc) to reload the Gemini Code Assist extension.
2. Open the **Gemini Code Assist** chat interface.
3. Try a command like:
   - "Take a screenshot of google.com" (Official Playwright MCP)
   - "Check the status of the Zuper Playwright server" (Custom MCP)
