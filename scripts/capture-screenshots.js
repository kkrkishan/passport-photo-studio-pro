const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1366,
    height: 850,
    show: false,
    frame: false,
    webPreferences: {
      offscreen: true,
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  const outDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const indexPath = path.join(__dirname, '../dist/index.html');
  await win.loadFile(indexPath);

  // Wait 1.5s for React to mount Dashboard
  await new Promise((r) => setTimeout(r, 1500));

  // 1. Capture Dashboard
  let img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, '01_dashboard.png'), img.toPNG());
  console.log('Saved 01_dashboard.png');

  // 2. Switch to Passport Studio
  await win.webContents.executeJavaScript(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Passport Studio'));
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));

  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, '02_passport_studio.png'), img.toPNG());
  console.log('Saved 02_passport_studio.png');

  // 3. Switch to Document Scanner
  await win.webContents.executeJavaScript(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Document Scanner'));
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));

  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, '03_document_scanner.png'), img.toPNG());
  console.log('Saved 03_document_scanner.png');

  // 4. Switch to A4 Layout in Scanner
  await win.webContents.executeJavaScript(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('CREATE A4 SHEET'));
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));

  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, '04_a4_layout.png'), img.toPNG());
  console.log('Saved 04_a4_layout.png');

  console.log('All screenshots captured successfully!');
  app.quit();
});
