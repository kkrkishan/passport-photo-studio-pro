const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

const releaseStoreDir = path.join(__dirname, '../release/playstore_assets');
if (!fs.existsSync(releaseStoreDir)) {
  fs.mkdirSync(releaseStoreDir, { recursive: true });
}

const androidResDir = path.join(__dirname, '../android/app/src/main/res');

function getIconGeneratorHtml() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background: #000; margin: 0; padding: 0;">
  <canvas id="c"></canvas>
  <script>
    function roundRect(ctx, x, y, w, h, r) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawCamera(ctx, cx, cy, size) {
      ctx.save();
      ctx.translate(cx, cy);
      const s = size / 24;
      ctx.lineWidth = 1.8 * s;
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(14.5 * s - 12 * s, 4 * s - 12 * s);
      ctx.lineTo(9.5 * s - 12 * s, 4 * s - 12 * s);
      ctx.lineTo(7 * s - 12 * s, 7 * s - 12 * s);
      ctx.lineTo(4 * s - 12 * s, 7 * s - 12 * s);
      ctx.arcTo(2 * s - 12 * s, 7 * s - 12 * s, 2 * s - 12 * s, 9 * s - 12 * s, 2 * s);
      ctx.lineTo(2 * s - 12 * s, 18 * s - 12 * s);
      ctx.arcTo(2 * s - 12 * s, 20 * s - 12 * s, 4 * s - 12 * s, 20 * s - 12 * s, 2 * s);
      ctx.lineTo(20 * s - 12 * s, 20 * s - 12 * s);
      ctx.arcTo(22 * s - 12 * s, 20 * s - 12 * s, 22 * s - 12 * s, 18 * s - 12 * s, 2 * s);
      ctx.lineTo(22 * s - 12 * s, 9 * s - 12 * s);
      ctx.arcTo(22 * s - 12 * s, 7 * s - 12 * s, 20 * s - 12 * s, 7 * s - 12 * s, 2 * s);
      ctx.lineTo(17 * s - 12 * s, 7 * s - 12 * s);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(12 * s - 12 * s, 13 * s - 12 * s, 3.5 * s, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(7 * s - 12 * s, 10 * s - 12 * s, 0.7 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    }

    // Play Store Square Icon (512x512)
    window.renderPlayStoreIcon = function(size, isRound = false) {
      const c = document.getElementById('c');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      const r = isRound ? size / 2 : size * 0.22;

      // Outer background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, size, size);
      bgGrad.addColorStop(0, '#1d4ed8');
      bgGrad.addColorStop(0.5, '#4338ca');
      bgGrad.addColorStop(1, '#0e7490');
      ctx.fillStyle = bgGrad;
      roundRect(ctx, 0, 0, size, size, r);
      ctx.fill();

      // Border shine
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = size * 0.02;
      roundRect(ctx, 0, 0, size, size, r);
      ctx.stroke();

      // Inner glow
      const glow = ctx.createRadialGradient(size / 2, size * 0.4, 0, size / 2, size * 0.4, size * 0.5);
      glow.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.4, size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Camera Icon
      drawCamera(ctx, size / 2, size * 0.44, size * 0.52);

      // Subtle bottom banner
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 ' + Math.round(size * 0.09) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PASSPORT PRO', size / 2, size * 0.82);

      return c.toDataURL('image/png');
    };

    // Google Play Feature Graphic (1024x500)
    window.renderFeatureGraphic = function(width, height) {
      const c = document.getElementById('c');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');

      // Background
      const bg = ctx.createRadialGradient(width * 0.5, height * 0.3, 10, width * 0.5, height * 0.3, width * 0.7);
      bg.addColorStop(0, '#1e293b');
      bg.addColorStop(0.5, '#0f172a');
      bg.addColorStop(1, '#060913');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Left Icon Box
      const iconSize = 220;
      const iconX = 80;
      const iconY = (height - iconSize) / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(37, 99, 235, 0.5)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      const iconGrad = ctx.createLinearGradient(iconX, iconY, iconX + iconSize, iconY + iconSize);
      iconGrad.addColorStop(0, '#2563eb');
      iconGrad.addColorStop(0.5, '#4f46e5');
      iconGrad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = iconGrad;
      roundRect(ctx, iconX, iconY, iconSize, iconSize, 44);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 3;
      roundRect(ctx, iconX, iconY, iconSize, iconSize, 44);
      ctx.stroke();

      drawCamera(ctx, iconX + iconSize / 2, iconY + iconSize / 2, 120);

      // Right Text Area
      const textX = 350;
      ctx.textAlign = 'left';
      
      // Top Tag
      ctx.font = '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('ANDROID MOBILE APP • 100% OFFLINE', textX, 120);

      // Main Title
      ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PASSPORT PHOTO', textX, 175);

      const titleGrad = ctx.createLinearGradient(textX, 0, textX + 300, 0);
      titleGrad.addColorStop(0, '#38bdf8');
      titleGrad.addColorStop(0.5, '#818cf8');
      titleGrad.addColorStop(1, '#c084fc');
      ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = titleGrad;
      ctx.fillText('STUDIO PRO', textX, 222);

      // Feature Badges
      const features = [
        '📸 35×45mm, 2×2" & A4/4×6" Sheet Maker',
        '📄 4-Point Document Perspective Scanner',
        '⚡ Target KB Resizer & Compressor for Exam Forms'
      ];

      ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      features.forEach((f, i) => {
        ctx.fillText(f, textX, 280 + i * 36);
      });

      // Bottom Trust
      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.fillText('🔒 Zero Cloud Uploads • Private & Secure', textX, 400);

      return c.toDataURL('image/png');
    };
  </script>
</body>
</html>`;
}

function saveBase64Png(dataUrl, outputPath) {
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
  console.log(`✅ Saved: ${path.basename(outputPath)} (${fs.statSync(outputPath).size.toLocaleString()} B)`);
}

app.whenReady().then(async () => {
  try {
    console.log('Generating Android Mipmap Icons & Google Play Store Assets...\n');
    const win = new BrowserWindow({
      width: 1200,
      height: 700,
      show: false,
      webPreferences: { offscreen: true }
    });

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(getIconGeneratorHtml()));
    await new Promise(r => win.webContents.once('did-finish-load', r));

    // 1. Google Play Store 512x512 High-Res Icon
    const playStoreIcon = await win.webContents.executeJavaScript('window.renderPlayStoreIcon(512, false)');
    saveBase64Png(playStoreIcon, path.join(releaseStoreDir, 'playstore_icon_512x512.png'));

    // 2. Google Play Store 1024x500 Feature Graphic
    const featureGraphic = await win.webContents.executeJavaScript('window.renderFeatureGraphic(1024, 500)');
    saveBase64Png(featureGraphic, path.join(releaseStoreDir, 'playstore_feature_graphic_1024x500.png'));

    // 3. Android Mipmap Icons
    const mipmaps = [
      { dir: 'mipmap-mdpi', size: 48 },
      { dir: 'mipmap-hdpi', size: 72 },
      { dir: 'mipmap-xhdpi', size: 96 },
      { dir: 'mipmap-xxhdpi', size: 144 },
      { dir: 'mipmap-xxxhdpi', size: 192 }
    ];

    for (const m of mipmaps) {
      const targetDir = path.join(androidResDir, m.dir);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      // Square
      const squarePng = await win.webContents.executeJavaScript(`window.renderPlayStoreIcon(${m.size}, false)`);
      saveBase64Png(squarePng, path.join(targetDir, 'ic_launcher.png'));

      // Round
      const roundPng = await win.webContents.executeJavaScript(`window.renderPlayStoreIcon(${m.size}, true)`);
      saveBase64Png(roundPng, path.join(targetDir, 'ic_launcher_round.png'));

      // Foreground
      saveBase64Png(squarePng, path.join(targetDir, 'ic_launcher_foreground.png'));
    }

    win.close();
    console.log('\n🎉 ALL ANDROID ICONS & PLAY STORE ASSETS GENERATED SUCCESSFULLY!');
    app.quit();
  } catch (err) {
    console.error('Error generating assets:', err);
    app.quit();
  }
});
