import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

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

app.whenReady().then(() => {
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
