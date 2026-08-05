import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Desktop Notifications
  sendNotification: (title: string, body: string) => {
    ipcRenderer.send('desktop:notify', { title, body });
  },

  // File System
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    createFolder: (dirPath: string) => ipcRenderer.invoke('fs:createFolder', dirPath),
    deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
    searchFiles: (dir: string, query: string) => ipcRenderer.invoke('fs:searchFiles', dir, query),
    pickFile: () => ipcRenderer.invoke('fs:pickFile'),
  },

  // System Automation
  system: {
    launchApp: (appName: string) => ipcRenderer.invoke('system:launchApp', appName),
    runCommand: (cmd: string) => ipcRenderer.invoke('system:runCommand', cmd),
    lockScreen: () => ipcRenderer.invoke('system:lockScreen'),
    power: (action: 'shutdown' | 'restart') => ipcRenderer.invoke('system:power', action),
    openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  },

  // Web & Browser Automation
  automation: {
    searchGoogle: (query: string) => ipcRenderer.invoke('automation:searchGoogle', query),
    openYouTube: (query?: string) => ipcRenderer.invoke('automation:openYouTube', query),
    openGmail: () => ipcRenderer.invoke('automation:openGmail'),
  },

  // Settings & Auto Start
  setAutoStart: (enable: boolean) => ipcRenderer.invoke('app:setAutoStart', enable),
  getAutoStart: () => ipcRenderer.invoke('app:getAutoStart'),

  // Tray Actions Listener
  onTrayAction: (callback: (action: string) => void) => {
    ipcRenderer.on('tray:action', (_event, action) => callback(action));
  },

  // Shortcuts Listener
  onGlobalShortcut: (callback: (shortcut: string) => void) => {
    ipcRenderer.on('shortcut:triggered', (_event, shortcut) => callback(shortcut));
  },

  // Auto Updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
    onStatus: (callback: (status: string, data?: any) => void) => {
      ipcRenderer.on('updater:status', (_event, status, data) => callback(status, data));
    },
  },

  // Platform info
  platform: process.platform,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
