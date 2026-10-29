const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

const outputDir = path.join(__dirname, '../release/store_assets');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function getBoxArtHtml(width, height) {
  const scale = width / 1080;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      background: radial-gradient(circle at 50% 35%, #1e293b 0%, #0f172a 40%, #060913 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .grid-pattern {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
      background-size: ${60 * scale}px ${60 * scale}px;
      opacity: 0.6;
    }
    .glow-sphere {
      position: absolute;
      width: ${600 * scale}px;
      height: ${600 * scale}px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%);
      top: 15%;
      border-radius: 50%;
      filter: blur(${40 * scale}px);
    }
    .content {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .icon-container {
      width: ${320 * scale}px;
      height: ${320 * scale}px;
      background: linear-gradient(135deg, #2563eb, #4f46e5 50%, #06b6d4);
      border-radius: ${64 * scale}px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 
        0 ${20 * scale}px ${50 * scale}px rgba(37, 99, 235, 0.4),
        0 0 0 ${4 * scale}px rgba(255, 255, 255, 0.2),
        inset 0 ${2 * scale}px ${8 * scale}px rgba(255, 255, 255, 0.4);
      margin-bottom: ${50 * scale}px;
      position: relative;
    }
    .icon-svg {
      width: ${180 * scale}px;
      height: ${180 * scale}px;
      filter: drop-shadow(0 ${8 * scale}px ${16 * scale}px rgba(0,0,0,0.3));
    }
    .title-main {
      font-size: ${62 * scale}px;
      font-weight: 900;
      letter-spacing: ${6 * scale}px;
      color: #ffffff;
      text-transform: uppercase;
      margin-bottom: ${8 * scale}px;
      text-shadow: 0 ${4 * scale}px ${20 * scale}px rgba(0,0,0,0.6);
    }
    .title-sub {
      font-size: ${56 * scale}px;
      font-weight: 900;
      letter-spacing: ${10 * scale}px;
      background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: uppercase;
      margin-bottom: ${36 * scale}px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: ${14 * scale}px ${36 * scale}px;
      background: rgba(30, 41, 59, 0.8);
      border: ${2 * scale}px solid rgba(56, 189, 248, 0.4);
      border-radius: ${999 * scale}px;
      color: #e2e8f0;
      font-size: ${22 * scale}px;
      font-weight: 700;
      letter-spacing: ${3 * scale}px;
      text-transform: uppercase;
      box-shadow: 0 ${8 * scale}px ${24 * scale}px rgba(0,0,0,0.4);
    }
    .badge span {
      color: #38bdf8;
      margin: 0 ${12 * scale}px;
    }
  </style>
</head>
<body>
  <div class="grid-pattern"></div>
  <div class="glow-sphere"></div>
  <div class="content">
    <div class="icon-container">
      <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
        <circle cx="12" cy="13" r="3.5"/>
        <path d="M12 9.5v.01"/>
        <path d="M7 10h.01"/>
      </svg>
    </div>
    <div class="title-main">PASSPORT PHOTO</div>
    <div class="title-sub">STUDIO PRO</div>
    <div class="badge">
      PASSPORT<span>•</span>SCANNER<span>•</span>RESIZER
    </div>
  </div>
</body>
</html>`;
}

function getPosterArtHtml(width, height) {
  const scale = width / 720;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      background: radial-gradient(circle at 50% 25%, #1e293b 0%, #0f172a 45%, #050811 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: ${70 * scale}px ${40 * scale}px;
      overflow: hidden;
      position: relative;
    }
    .grid-pattern {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
      background-size: ${50 * scale}px ${50 * scale}px;
      opacity: 0.7;
    }
    .glow-sphere {
      position: absolute;
      width: ${500 * scale}px;
      height: ${500 * scale}px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, rgba(99, 102, 241, 0.2) 50%, transparent 70%);
      top: 15%;
      border-radius: 50%;
      filter: blur(${50 * scale}px);
    }
    .header-badge {
      display: inline-flex;
      align-items: center;
      padding: ${10 * scale}px ${24 * scale}px;
      background: rgba(30, 41, 59, 0.9);
      border: ${1.5 * scale}px solid rgba(56, 189, 248, 0.5);
      border-radius: ${999 * scale}px;
      color: #38bdf8;
      font-size: ${16 * scale}px;
      font-weight: 800;
      letter-spacing: ${2 * scale}px;
      text-transform: uppercase;
      box-shadow: 0 ${4 * scale}px ${16 * scale}px rgba(0,0,0,0.3);
      position: relative;
      z-index: 10;
    }
    .main-visual {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 10;
      margin-top: ${10 * scale}px;
    }
    .icon-container {
      width: ${240 * scale}px;
      height: ${240 * scale}px;
      background: linear-gradient(135deg, #2563eb, #4f46e5 50%, #06b6d4);
      border-radius: ${54 * scale}px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 
        0 ${20 * scale}px ${50 * scale}px rgba(37, 99, 235, 0.45),
        0 0 0 ${4 * scale}px rgba(255, 255, 255, 0.25),
        inset 0 ${2 * scale}px ${6 * scale}px rgba(255, 255, 255, 0.4);
      margin-bottom: ${36 * scale}px;
    }
    .icon-svg {
      width: ${130 * scale}px;
      height: ${130 * scale}px;
      filter: drop-shadow(0 ${6 * scale}px ${12 * scale}px rgba(0,0,0,0.3));
    }
    .title-main {
      font-size: ${48 * scale}px;
      font-weight: 900;
      letter-spacing: ${4 * scale}px;
      color: #ffffff;
      text-transform: uppercase;
      margin-bottom: ${6 * scale}px;
      text-align: center;
      text-shadow: 0 ${4 * scale}px ${20 * scale}px rgba(0,0,0,0.7);
    }
    .title-sub {
      font-size: ${44 * scale}px;
      font-weight: 900;
      letter-spacing: ${8 * scale}px;
      background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: uppercase;
      margin-bottom: ${24 * scale}px;
      text-align: center;
    }
    .features-list {
      display: flex;
      flex-direction: column;
      gap: ${14 * scale}px;
      width: 100%;
      max-width: ${560 * scale}px;
      position: relative;
      z-index: 10;
    }
    .feature-card {
      background: rgba(15, 23, 42, 0.75);
      border: ${1.5 * scale}px solid rgba(51, 65, 85, 0.9);
      border-radius: ${20 * scale}px;
      padding: ${16 * scale}px ${22 * scale}px;
      display: flex;
      align-items: center;
      gap: ${18 * scale}px;
      box-shadow: 0 ${8 * scale}px ${20 * scale}px rgba(0,0,0,0.4);
      backdrop-filter: blur(${10 * scale}px);
    }
    .feature-icon {
      width: ${48 * scale}px;
      height: ${48 * scale}px;
      border-radius: ${14 * scale}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${22 * scale}px;
      flex-shrink: 0;
    }
    .f-icon-blue { background: rgba(37, 99, 235, 0.25); border: ${1.5 * scale}px solid #3b82f6; }
    .f-icon-green { background: rgba(16, 185, 129, 0.25); border: ${1.5 * scale}px solid #10b981; }
    .f-icon-amber { background: rgba(245, 158, 11, 0.25); border: ${1.5 * scale}px solid #f59e0b; }
    .feature-text {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    .feature-title {
      font-size: ${19 * scale}px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: ${0.5 * scale}px;
    }
    .feature-desc {
      font-size: ${14 * scale}px;
      color: #94a3b8;
      margin-top: ${2 * scale}px;
    }
    .footer-bar {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 10;
      gap: ${6 * scale}px;
    }
    .privacy-tag {
      font-size: ${15 * scale}px;
      font-weight: 700;
      letter-spacing: ${2 * scale}px;
      color: #10b981;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: ${8 * scale}px;
    }
    .store-tag {
      font-size: ${13 * scale}px;
      color: #64748b;
      letter-spacing: ${1 * scale}px;
    }
  </style>
</head>
<body>
  <div class="grid-pattern"></div>
  <div class="glow-sphere"></div>
  
  <div class="header-badge">
    WINDOWS 10 & 11 APP
  </div>

  <div class="main-visual">
    <div class="icon-container">
      <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
        <circle cx="12" cy="13" r="3.5"/>
        <path d="M12 9.5v.01"/>
        <path d="M7 10h.01"/>
      </svg>
    </div>
    <div class="title-main">PASSPORT PHOTO</div>
    <div class="title-sub">STUDIO PRO</div>
  </div>

  <div class="features-list">
    <div class="feature-card">
      <div class="feature-icon f-icon-blue">📸</div>
      <div class="feature-text">
        <div class="feature-title">Passport Photo Studio</div>
        <div class="feature-desc">35×45mm, 2×2", Biometrics & 4×6"/A4 Print Sheets</div>
      </div>
    </div>
    <div class="feature-card">
      <div class="feature-icon f-icon-green">📄</div>
      <div class="feature-text">
        <div class="feature-title">Document Scanner Studio</div>
        <div class="feature-desc">4-Corner Perspective Warp & Dual-Page A4 ID</div>
      </div>
    </div>
    <div class="feature-card">
      <div class="feature-icon f-icon-amber">⚡</div>
      <div class="feature-text">
        <div class="feature-title">Photo & Document Resizer</div>
        <div class="feature-desc">Target KB, 0-100% Quality Slider & PDF Compress</div>
      </div>
    </div>
  </div>

  <div class="footer-bar">
    <div class="privacy-tag">
      <span>🔒</span> 100% Offline & Private Processing
    </div>
    <div class="store-tag">
      Available on Microsoft Store
    </div>
  </div>
</body>
</html>`;
}

async function renderImage(html, width, height, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const win = new BrowserWindow({
        width,
        height,
        show: false,
        useContentSize: true,
        webPreferences: {
          offscreen: true,
        }
      });

      win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      win.webContents.once('did-finish-load', async () => {
        // Wait 300ms for layout & font rendering
        await new Promise(r => setTimeout(r, 400));
        const image = await win.webContents.capturePage({ x: 0, y: 0, width, height });
        fs.writeFileSync(outputPath, image.toPNG());
        console.log(`✅ Generated: ${path.basename(outputPath)} (${width}x${height} px, ${fs.statSync(outputPath).size.toLocaleString()} bytes)`);
        win.close();
        resolve(outputPath);
      });
    } catch (err) {
      reject(err);
    }
  });
}

app.whenReady().then(async () => {
  try {
    console.log('Generating Microsoft Store Artwork Assets...\n');

    // 1. Poster Art (9:16 / 2:3)
    await renderImage(getPosterArtHtml(720, 1080), 720, 1080, path.join(outputDir, 'Poster_720x1080.png'));
    await renderImage(getPosterArtHtml(1440, 2160), 1440, 2160, path.join(outputDir, 'Poster_1440x2160.png'));

    // 2. Box Art (1:1)
    await renderImage(getBoxArtHtml(1080, 1080), 1080, 1080, path.join(outputDir, 'BoxArt_1080x1080.png'));
    await renderImage(getBoxArtHtml(2160, 2160), 2160, 2160, path.join(outputDir, 'BoxArt_2160x2160.png'));

    console.log('\n🎉 ALL MICROSOFT STORE ARTWORK GENERATED SUCCESSFULLY!');
    app.quit();
  } catch (err) {
    console.error('Error rendering artwork:', err);
    app.quit();
  }
});
