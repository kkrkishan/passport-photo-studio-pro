const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

const outputDir = path.join(__dirname, '../release/store_assets');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function getCanvasGeneratorHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
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

    function drawCameraIcon(ctx, cx, cy, size) {
      ctx.save();
      ctx.translate(cx, cy);
      const s = size / 24;
      ctx.lineWidth = 1.8 * s;
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Camera body
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

      // Camera lens
      ctx.beginPath();
      ctx.arc(12 * s - 12 * s, 13 * s - 12 * s, 3.5 * s, 0, Math.PI * 2);
      ctx.stroke();

      // Small flash
      ctx.beginPath();
      ctx.arc(7 * s - 12 * s, 10 * s - 12 * s, 0.7 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    }

    window.renderBoxArt = function(width, height) {
      const c = document.getElementById('c');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');
      const scale = width / 1080;

      // 1. Radial Background
      const bgGrad = ctx.createRadialGradient(width / 2, height * 0.35, 10, width / 2, height * 0.35, width * 0.85);
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(0.45, '#0f172a');
      bgGrad.addColorStop(1, '#050811');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Grid pattern
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
      ctx.lineWidth = 1 * scale;
      const gridSize = 54 * scale;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Glow sphere
      const glowGrad = ctx.createRadialGradient(width / 2, height * 0.35, 0, width / 2, height * 0.35, 320 * scale);
      glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
      glowGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.16)');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.35, 320 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Icon Container
      const iconSize = 310 * scale;
      const iconX = (width - iconSize) / 2;
      const iconY = height * 0.22;
      const iconR = 60 * scale;

      // Icon shadow
      ctx.save();
      ctx.shadowColor = 'rgba(37, 99, 235, 0.45)';
      ctx.shadowBlur = 40 * scale;
      ctx.shadowOffsetY = 16 * scale;
      const iconGrad = ctx.createLinearGradient(iconX, iconY, iconX + iconSize, iconY + iconSize);
      iconGrad.addColorStop(0, '#2563eb');
      iconGrad.addColorStop(0.5, '#4f46e5');
      iconGrad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = iconGrad;
      roundRect(ctx, iconX, iconY, iconSize, iconSize, iconR);
      ctx.fill();
      ctx.restore();

      // Icon border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 4 * scale;
      roundRect(ctx, iconX, iconY, iconSize, iconSize, iconR);
      ctx.stroke();

      // Camera inside icon
      drawCameraIcon(ctx, width / 2, iconY + iconSize / 2, 170 * scale);

      // Text: PASSPORT PHOTO
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 ' + Math.round(58 * scale) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PASSPORT PHOTO', width / 2, height * 0.64);

      // Text: STUDIO PRO with gradient
      const textGrad = ctx.createLinearGradient(width / 2 - 200 * scale, 0, width / 2 + 200 * scale, 0);
      textGrad.addColorStop(0, '#38bdf8');
      textGrad.addColorStop(0.5, '#818cf8');
      textGrad.addColorStop(1, '#c084fc');
      ctx.font = '900 ' + Math.round(54 * scale) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = textGrad;
      ctx.fillText('STUDIO PRO', width / 2, height * 0.72);

      // Pill Badge: PASSPORT • SCANNER • RESIZER
      const pillW = 480 * scale;
      const pillH = 48 * scale;
      const pillX = (width - pillW) / 2;
      const pillY = height * 0.81;
      
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2 * scale;
      roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.stroke();

      ctx.font = '700 ' + Math.round(20 * scale) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('PASSPORT  •  SCANNER  •  RESIZER', width / 2, pillY + pillH / 2);

      return c.toDataURL('image/png');
    };

    window.renderPosterArt = function(width, height) {
      const c = document.getElementById('c');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');
      const scale = width / 720;

      // 1. Radial Background
      const bgGrad = ctx.createRadialGradient(width / 2, height * 0.22, 10, width / 2, height * 0.22, height * 0.7);
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(0.45, '#0f172a');
      bgGrad.addColorStop(1, '#050811');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Grid pattern
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
      ctx.lineWidth = 1 * scale;
      const gridSize = 45 * scale;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Glow sphere
      const glowGrad = ctx.createRadialGradient(width / 2, height * 0.24, 0, width / 2, height * 0.24, 260 * scale);
      glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.32)');
      glowGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.18)');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.24, 260 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Top Header Badge
      const topBadgeW = 260 * scale;
      const topBadgeH = 34 * scale;
      const topBadgeX = (width - topBadgeW) / 2;
      const topBadgeY = 55 * scale;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      roundRect(ctx, topBadgeX, topBadgeY, topBadgeW, topBadgeH, topBadgeH / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1.5 * scale;
      roundRect(ctx, topBadgeX, topBadgeY, topBadgeW, topBadgeH, topBadgeH / 2);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 ' + Math.round(14 * scale) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('WINDOWS 10 & 11 APP', width / 2, topBadgeY + topBadgeH / 2);

      // Icon Container
      const iconSize = 210 * scale;
      const iconX = (width - iconSize) / 2;
      const iconY = 120 * scale;
      const iconR = 48 * scale;

      ctx.save();
      ctx.shadowColor = 'rgba(37, 99, 235, 0.45)';
      ctx.shadowBlur = 36 * scale;
      ctx.shadowOffsetY = 14 * scale;
      const iconGrad = ctx.createLinearGradient(iconX, iconY, iconX + iconSize, iconY + iconSize);
      iconGrad.addColorStop(0, '#2563eb');
      iconGrad.addColorStop(0.5, '#4f46e5');
      iconGrad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = iconGrad;
      roundRect(ctx, iconX, iconY, iconSize, iconSize, iconR);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 3.5 * scale;
      roundRect(ctx, iconX, iconY, iconSize, iconSize, iconR);
      ctx.stroke();

      drawCameraIcon(ctx, width / 2, iconY + iconSize / 2, 115 * scale);

      // Title: PASSPORT PHOTO
      ctx.font = '900 ' + Math.round(44 * scale) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PASSPORT PHOTO', width / 2, 385 * scale);

      // Title: STUDIO PRO
      const textGrad = ctx.createLinearGradient(width / 2 - 150 * scale, 0, width / 2 + 150 * scale, 0);
      textGrad.addColorStop(0, '#38bdf8');
      textGrad.addColorStop(0.5, '#818cf8');
      textGrad.addColorStop(1, '#c084fc');
      ctx.font = '900 ' + Math.round(40 * scale) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = textGrad;
      ctx.fillText('STUDIO PRO', width / 2, 435 * scale);

      // 3 Feature Cards
      const cardW = width - 80 * scale;
      const cardH = 82 * scale;
      const cardX = 40 * scale;

      const cards = [
        { icon: '📸', color: '#3b82f6', bg: 'rgba(37,99,235,0.2)', title: 'Passport Photo Studio', desc: '35×45mm, 2×2", Biometrics & A4 Print Sheets', y: 510 * scale },
        { icon: '📄', color: '#10b981', bg: 'rgba(16,185,129,0.2)', title: 'Document Scanner Studio', desc: '4-Corner Perspective Warp & Dual-Page A4 ID', y: 615 * scale },
        { icon: '⚡', color: '#f59e0b', bg: 'rgba(245,158,11,0.2)', title: 'Photo & Document Resizer', desc: 'Target KB, 0-100% Quality Slider & PDF Compress', y: 720 * scale }
      ];

      cards.forEach(c => {
        // Card bg
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        roundRect(ctx, cardX, c.y, cardW, cardH, 18 * scale);
        ctx.fill();
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
        ctx.lineWidth = 1.5 * scale;
        roundRect(ctx, cardX, c.y, cardW, cardH, 18 * scale);
        ctx.stroke();

        // Icon badge
        const badgeSize = 48 * scale;
        const badgeX = cardX + 16 * scale;
        const badgeY = c.y + (cardH - badgeSize) / 2;
        ctx.fillStyle = c.bg;
        roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 12 * scale);
        ctx.fill();
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.5 * scale;
        roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 12 * scale);
        ctx.stroke();

        ctx.font = Math.round(22 * scale) + 'px sans-serif';
        ctx.fillText(c.icon, badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 1 * scale);

        // Texts
        ctx.textAlign = 'left';
        ctx.font = '800 ' + Math.round(18 * scale) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(c.title, badgeX + badgeSize + 16 * scale, c.y + 30 * scale);

        ctx.font = '500 ' + Math.round(13.5 * scale) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(c.desc, badgeX + badgeSize + 16 * scale, c.y + 54 * scale);
        ctx.textAlign = 'center';
      });

      // Footer
      ctx.textAlign = 'center';
      ctx.font = '700 ' + Math.round(15 * scale) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.fillText('🔒 100% Offline & Private Processing', width / 2, 860 * scale);

      ctx.font = '500 ' + Math.round(13 * scale) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Available on Microsoft Store', width / 2, 890 * scale);

      return c.toDataURL('image/png');
    };
  </script>
</body>
</html>`;
}

function saveBase64Png(dataUrl, outputPath) {
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
}

app.whenReady().then(async () => {
  try {
    console.log('Rendering pixel-exact Store Artwork via HTML5 Canvas Buffer...\n');
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        offscreen: true,
      }
    });

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(getCanvasGeneratorHtml()));
    await new Promise(resolve => win.webContents.once('did-finish-load', resolve));

    // 1. Poster Art (720 x 1080)
    console.log('Rendering Poster 720 x 1080...');
    const poster720 = await win.webContents.executeJavaScript('window.renderPosterArt(720, 1080)');
    saveBase64Png(poster720, path.join(outputDir, 'Poster_720x1080.png'));

    // 2. Poster Art (1440 x 2160)
    console.log('Rendering Poster 1440 x 2160...');
    const poster1440 = await win.webContents.executeJavaScript('window.renderPosterArt(1440, 2160)');
    saveBase64Png(poster1440, path.join(outputDir, 'Poster_1440x2160.png'));

    // 3. Box Art (1080 x 1080)
    console.log('Rendering Box Art 1080 x 1080...');
    const box1080 = await win.webContents.executeJavaScript('window.renderBoxArt(1080, 1080)');
    saveBase64Png(box1080, path.join(outputDir, 'BoxArt_1080x1080.png'));

    // 4. Box Art (2160 x 2160)
    console.log('Rendering Box Art 2160 x 2160...');
    const box2160 = await win.webContents.executeJavaScript('window.renderBoxArt(2160, 2160)');
    saveBase64Png(box2160, path.join(outputDir, 'BoxArt_2160x2160.png'));

    win.close();
    console.log('\n🎉 ALL 4 ASSETS RENDERED WITH EXACT RESOLUTION!');
    app.quit();
  } catch (err) {
    console.error('Error generating assets:', err);
    app.quit();
  }
});
