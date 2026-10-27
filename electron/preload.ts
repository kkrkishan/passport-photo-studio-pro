import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<boolean>;
  isMaximized: () => Promise<boolean>;
  close: () => Promise<void>;
  openImage: () => Promise<{ path: string; name: string; dataUrl: string } | null>;
  openProject: () => Promise<{ path: string; content: any } | null>;
  saveProject: (projectData: string, defaultName?: string) => Promise<{ success: boolean; canceled?: boolean; filePath?: string }>;
  saveExport: (payload: { dataBase64: string; defaultName: string; format: 'pdf' | 'png' | 'jpg' | 'webp' }) => Promise<{ success: boolean; canceled?: boolean; filePath?: string; verifiedBytes?: number }>;
  verifyFileSize: (filePath: string) => Promise<{ success: boolean; size?: number; error?: string }>;
  printPage: () => Promise<boolean>;
  platform: string;
}

const electronAPI: ElectronAPI = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  close: () => ipcRenderer.invoke('window:close'),
  openImage: () => ipcRenderer.invoke('dialog:openImage'),
  openProject: () => ipcRenderer.invoke('dialog:openProject'),
  saveProject: (projectData, defaultName) => ipcRenderer.invoke('dialog:saveProject', projectData, defaultName),
  saveExport: (payload) => ipcRenderer.invoke('dialog:saveExport', payload),
  verifyFileSize: (filePath) => ipcRenderer.invoke('system:verifyFileSize', filePath),
  printPage: () => ipcRenderer.invoke('system:printPage'),
  platform: process.platform,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
