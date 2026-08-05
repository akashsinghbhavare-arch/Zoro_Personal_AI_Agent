import { app, BrowserWindow, ipcMain, globalShortcut, Notification } from 'electron';
import path from 'path';
import { registerFsIPC } from './ipc/fs';
import { registerSystemIPC } from './ipc/system';
import { registerAutomationIPC } from './ipc/automation';
import { setupTray } from './tray';
import { setupAutoUpdater } from './updater';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#070D18',
    show: false,
    autoHideMenuBar: true,
    title: 'Nova AI — Desktop Assistant',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load Vite Dev Server URL in dev mode, or built index.html in production
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      // Retry if server is still starting
      setTimeout(() => mainWindow?.loadURL(devUrl), 1000);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Close to Tray behavior
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
  });

  // Setup Tray
  setupTray(mainWindow);

  // Register IPC Modules
  registerFsIPC(mainWindow);
  registerSystemIPC(mainWindow);
  registerAutomationIPC();
  setupAutoUpdater(mainWindow);

  // Desktop Notifications handler
  ipcMain.on('desktop:notify', (_event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: path.join(__dirname, '../assets/icon.png') }).show();
    }
  });

  // Auto Start Handler
  ipcMain.handle('app:setAutoStart', (_event, enable: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: app.getPath('exe'),
    });
    return { success: true };
  });

  ipcMain.handle('app:getAutoStart', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  // Global Shortcuts
  registerGlobalShortcuts(mainWindow);
}

function registerGlobalShortcuts(win: BrowserWindow) {
  // Ctrl + Shift + Space -> Toggle Nova AI focus
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (win.isVisible()) {
      if (win.isFocused()) win.hide();
      else win.focus();
    } else {
      win.show();
      win.focus();
    }
  });

  // Ctrl + Alt + N -> Start Voice Mode
  globalShortcut.register('CommandOrControl+Alt+N', () => {
    win.show();
    win.focus();
    win.webContents.send('shortcut:triggered', 'voice-mode');
  });

  // Ctrl + K -> Quick Command Focus
  globalShortcut.register('CommandOrControl+K', () => {
    win.show();
    win.focus();
    win.webContents.send('shortcut:triggered', 'quick-command');
  });

  // Esc -> Stop Speaking
  globalShortcut.register('Escape', () => {
    win.webContents.send('shortcut:triggered', 'stop-speaking');
  });
}

app.on('before-quit', () => {
  isQuitting = true;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
