# Project Notes

## Running the Dev Server

Always start the server via WSL (not Windows directly):

```bash
wsl -e bash -ic "cd /mnt/e/Client_apps/mtnhumancapital && NODE_ENV=development node --import tsx server/index.ts"
```

Run this as a background command. The server starts on port 5000.

## Important Workflow Notes

- Always restart the dev server after UI changes so the user can see them immediately.

## Platform

- Windows machine with WSL Ubuntu
- Node.js is installed via nvm in WSL at `/home/dero/.nvm/versions/node/v20.20.0/`
- Always run via WSL, never directly on Windows
