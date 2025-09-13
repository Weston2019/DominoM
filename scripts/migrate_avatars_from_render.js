// Simple migration script: fetch /debug/avatars from your render server and
// download all listed avatar files into local folders `assets/icons` and
// `assets/defaults`.
// Usage: node scripts/migrate_avatars_from_render.js --origin https://dominom.onrender.com

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try {
          const obj = JSON.parse(raw);
          resolve(obj);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function downloadToFile(url, dest) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(dest); } catch(e) {}
        return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      try { file.close(); fs.unlinkSync(dest); } catch (e) {}
      reject(err);
    });
  });
}

(async function main() {
  const argv = require('minimist')(process.argv.slice(2));
  const origin = argv.origin || argv.o || 'https://dominom.onrender.com';
  const debugUrl = `${origin.replace(/\/$/, '')}/debug/avatars`;
  console.log('Fetching manifest from', debugUrl);
  try {
    const data = await fetchJson(debugUrl);
    const avatarFiles = Array.isArray(data.avatarFiles) ? data.avatarFiles : [];
    const defaultFiles = Array.isArray(data.defaultFiles) ? data.defaultFiles : [];

    console.log('avatarFiles:', avatarFiles.length, ', defaultFiles:', defaultFiles.length);

    for (const f of avatarFiles) {
      const remote = `${origin.replace(/\/$/, '')}/assets/icons/${f}`;
      const dest = path.join(__dirname, '..', 'assets', 'icons', f);
      try {
        console.log('Downloading', remote, '->', dest);
        await downloadToFile(remote, dest);
      } catch (e) {
        console.warn('Failed to download', remote, e && e.message);
      }
    }

    for (const f of defaultFiles) {
      const remote = `${origin.replace(/\/$/, '')}/assets/defaults/${f}`;
      const dest = path.join(__dirname, '..', 'assets', 'defaults', f);
      try {
        console.log('Downloading', remote, '->', dest);
        await downloadToFile(remote, dest);
      } catch (e) {
        console.warn('Failed to download', remote, e && e.message);
      }
    }

    console.log('Migration complete.');
  } catch (e) {
    console.error('Migration failed:', e && e.message);
    process.exit(1);
  }
})();
