/**
 * PlexDL Media Binary Setup Script
 * Checks and prepares local binaries (yt-dlp and ffmpeg) for media extraction.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const VENDOR_DIR = path.resolve(__dirname, '..', 'vendor');
const YTDLP_PATH = path.join(VENDOR_DIR, 'yt-dlp.exe');

async function main() {
  console.log('[PlexDL] Checking media extraction binaries...');

  // Ensure vendor directory exists
  if (!fs.existsSync(VENDOR_DIR)) {
    fs.mkdirSync(VENDOR_DIR, { recursive: true });
  }

  // Check ffmpeg-static
  try {
    const ffmpegPath = require('ffmpeg-static');
    if (ffmpegPath && fs.existsSync(ffmpegPath)) {
      console.log(`[PlexDL] ✓ ffmpeg-static verified at: ${ffmpegPath}`);
    } else {
      console.warn('[PlexDL] ! ffmpeg-static module located, but executable binary not found.');
    }
  } catch (err) {
    console.warn(`[PlexDL] ! ffmpeg-static check warning: ${err.message}`);
  }

  // Check yt-dlp
  if (fs.existsSync(YTDLP_PATH)) {
    console.log(`[PlexDL] ✓ yt-dlp binary found at: ${YTDLP_PATH}`);
  } else {
    console.log('[PlexDL] yt-dlp binary not found in vendor/. Downloading latest release from GitHub...');
    try {
      await downloadYtDlp(YTDLP_PATH);
      console.log(`[PlexDL] ✓ yt-dlp successfully downloaded to: ${YTDLP_PATH}`);
    } catch (err) {
      console.error(`[PlexDL] Failed to auto-download yt-dlp: ${err.message}`);
      console.log('[PlexDL] You can manually place yt-dlp.exe into the "vendor/" directory.');
    }
  }

  console.log('[PlexDL] Binary setup complete.');
}

function downloadYtDlp(dest) {
  const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  return new Promise((resolve, reject) => {
    function getWithRedirect(targetUrl, maxRedirects = 5) {
      if (maxRedirects <= 0) return reject(new Error('Too many redirects while downloading yt-dlp.exe'));
      
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return getWithRedirect(res.headers.location, maxRedirects - 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP status ${res.statusCode} received from ${targetUrl}`));
        }
        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        fileStream.on('error', (err) => {
          fs.unlink(dest, () => reject(err));
        });
      }).on('error', reject);
    }

    getWithRedirect(url);
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
