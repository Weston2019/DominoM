Migration script

This folder contains a simple Node script to download avatar files listed by your running Render app's `/debug/avatars` endpoint and save them into the local `assets/icons` and `assets/defaults` folders.

Prerequisites
- Node.js installed (12+)
- Network access to your Render instance

Usage (PowerShell):

```powershell
# From the project root
npm install minimist
node .\scripts\migrate_avatars_from_render.js --origin https://dominom.onrender.com
```

Notes
- The script will create `assets/icons` and `assets/defaults` if they don't exist.
- It will skip files that fail to download and continue the rest.
- After running, commit the downloaded files before deploying so they are included in your next build/deploy.
