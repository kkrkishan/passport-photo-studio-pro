import { app, BrowserWindow, ipcMain, dialog, Menu, shell, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Passport Photo Studio Pro',
    backgroundColor: '#0b0f19',
    frame: false, // Custom sleek titlebar with minimize/maximize/close
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // allows preload to access necessary desktop IPC
      webSecurity: true,
    },
    icon: path.join(__dirname, '../public/icon.ico'),
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // In production load dist/index.html, in dev load vite dev server
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external link clicks securely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
  return mainWindow?.isMaximized() ?? false;
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

// File Dialog IPC
ipcMain.handle('dialog:openImage', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Photo / Document',
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const buffer = await fs.promises.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;

  return {
    path: filePath,
    name: path.basename(filePath),
    dataUrl: base64
  };
});

ipcMain.handle('dialog:openProject', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Passport Photo Studio Pro Project',
    filters: [
      { name: 'Passport Photo Studio Pro Project (*.ppsp)', extensions: ['ppsp'] },
      { name: 'JSON Project (*.json)', extensions: ['json'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileContent = await fs.promises.readFile(filePath, 'utf-8');
  return {
    path: filePath,
    content: JSON.parse(fileContent)
  };
});

ipcMain.handle('dialog:saveProject', async (_event, projectData: string, defaultName = 'Studio_Project.ppsp') => {
  if (!mainWindow) return { success: false };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Studio Project',
    defaultPath: defaultName,
    filters: [
      { name: 'Passport Photo Studio Pro Project (*.ppsp)', extensions: ['ppsp'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  await fs.promises.writeFile(result.filePath, projectData, 'utf-8');
  return { success: true, filePath: result.filePath };
});

ipcMain.handle('dialog:saveExport', async (_event, {
  dataBase64,
  defaultName,
  format
}: {
  dataBase64: string;
  defaultName: string;
  format: 'pdf' | 'png' | 'jpg' | 'webp';
}) => {
  if (!mainWindow) return { success: false };

  const extensions = format === 'pdf' ? ['pdf'] : format === 'png' ? ['png'] : format === 'webp' ? ['webp'] : ['jpg', 'jpeg'];
  const filterName = format === 'pdf' ? 'PDF Document (*.pdf)' : format === 'png' ? 'PNG Image (*.png)' : format === 'webp' ? 'WEBP Image (*.webp)' : 'JPEG Image (*.jpg)';

  const downloadsPath = app.getPath('downloads');
  const defaultFilePath = path.join(downloadsPath, defaultName);

  const result = await dialog.showSaveDialog(mainWindow, {
    title: `Save ${format.toUpperCase()} File`,
    defaultPath: defaultFilePath,
    filters: [
      { name: filterName, extensions },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  // Extract raw base64 data
  const base64Data = dataBase64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  await fs.promises.writeFile(result.filePath, buffer);
  const stat = await fs.promises.stat(result.filePath);

  return { success: true, filePath: result.filePath, verifiedBytes: stat.size };
});

ipcMain.handle('system:verifyFileSize', async (_event, filePath: string) => {
  try {
    const stat = await fs.promises.stat(filePath);
    return { success: true, size: stat.size };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('system:printPage', async () => {
  if (!mainWindow) return false;
  mainWindow.webContents.print({ silent: false, printBackground: true });
  return true;
});

// Semver comparison helper
function parseSemver(v: string): number[] {
  const cleaned = v.replace(/^v/i, '').trim();
  const parts = cleaned.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isNewerVersion(remoteVer: string, currentVer: string): boolean {
  const [rMajor, rMinor, rPatch] = parseSemver(remoteVer);
  const [cMajor, cMinor, cPatch] = parseSemver(currentVer);
  if (rMajor > cMajor) return true;
  if (rMajor < cMajor) return false;
  if (rMinor > cMinor) return true;
  if (rMinor < cMinor) return false;
  return rPatch > cPatch;
}

function fetchLatestRelease(): Promise<any> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/kkrkishan/passport-photo-studio-pro/releases/latest',
      headers: {
        'User-Agent': 'PassportPhotoStudioPro-DesktopApp'
      }
    };
    const req = https.get(options, (res) => {
      if (res.statusCode === 404 || (res.statusCode && res.statusCode >= 400)) {
        resolve(null);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(6000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Update Checker IPC
ipcMain.handle('system:checkForUpdates', async (_event, simulateTest: boolean = false) => {
  try {
    const currentVersion = app.getVersion();

    // If simulateTest is requested (for demonstration/testing of notifications)
    if (simulateTest) {
      const testInfo = {
        success: true,
        hasUpdate: true,
        currentVersion,
        latestVersion: 'v1.1.0',
        releaseName: 'Passport Photo Studio Pro v1.1.0 Update',
        releaseUrl: 'https://github.com/kkrkishan/passport-photo-studio-pro/releases',
        releaseNotes: '• Added Microsoft Store APPX/MSIX Package Support\n• Added Instant Update Notification System\n• Performance optimizations and bug fixes',
        publishedAt: new Date().toISOString()
      };

      if (Notification.isSupported()) {
        const notif = new Notification({
          title: '🚀 नया अपडेट उपलब्ध है! (Update Available)',
          body: `Passport Photo Studio Pro का नया संस्करण (${testInfo.latestVersion}) उपलब्ध है।`,
          icon: path.join(__dirname, '../public/icon.png')
        });
        notif.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.webContents.send('app:showUpdateModal', testInfo);
          }
        });
        notif.show();
      }

      mainWindow?.webContents.send('app:showUpdateModal', testInfo);
      return testInfo;
    }

    const releaseData = await fetchLatestRelease();

    if (!releaseData || !releaseData.tag_name) {
      return {
        success: true,
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        message: 'आप पहले से ही नवीनतम संस्करण का उपयोग कर रहे हैं।'
      };
    }

    const latestVersion = releaseData.tag_name;
    const hasUpdate = isNewerVersion(latestVersion, currentVersion);

    const updateInfo = {
      success: true,
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseName: releaseData.name || latestVersion,
      releaseUrl: releaseData.html_url || 'https://github.com/kkrkishan/passport-photo-studio-pro/releases',
      releaseNotes: releaseData.body || 'New features, performance enhancements, and bug fixes.',
      publishedAt: releaseData.published_at
    };

    if (hasUpdate) {
      if (Notification.isSupported()) {
        const notif = new Notification({
          title: '🚀 नया अपडेट उपलब्ध है! (Update Available)',
          body: `Passport Photo Studio Pro का नया संस्करण (${latestVersion}) उपलब्ध है। डाउनलोड करने के लिए क्लिक करें।`,
          icon: path.join(__dirname, '../public/icon.png')
        });
        notif.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.webContents.send('app:showUpdateModal', updateInfo);
          }
          if (updateInfo.releaseUrl) {
            shell.openExternal(updateInfo.releaseUrl);
          }
        });
        notif.show();
      }

      mainWindow?.webContents.send('app:showUpdateModal', updateInfo);
    }

    return updateInfo;
  } catch (err: any) {
    return {
      success: false,
      hasUpdate: false,
      error: err.message || 'अपडेट की जांच करने में असमर्थ।'
    };
  }
});

ipcMain.handle('system:openExternal', async (_event, url: string) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.passportphoto.studiopro');
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
