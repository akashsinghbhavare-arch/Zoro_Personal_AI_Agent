import { BrowserWindow, ipcMain, app } from 'electron';

let autoUpdater: any = null;

// Dynamically load electron-updater only in packaged production app
// Prevents crash if module is unavailable or update server is not configured
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
} catch (err) {
  console.warn('[Updater] electron-updater not available. Auto-update disabled.', err);
}

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  // No-op IPC stubs for dev / unavailable updater
  ipcMain.handle('updater:check', async () => ({ error: 'Updater not available' }));
  ipcMain.handle('updater:download', async () => ({ error: 'Updater not available' }));
  ipcMain.handle('updater:quitAndInstall', () => {});

  if (!autoUpdater) {
    console.warn('[Updater] Skipped: electron-updater could not be loaded.');
    return;
  }

  // Only run auto-update in packaged production builds
  if (!app.isPackaged) {
    console.log('[Updater] Skipped: running in development mode.');
    return;
  }

  try {
    autoUpdater.autoDownload = false;

    autoUpdater.on('checking-for-update', () => {
      mainWindow.webContents.send('updater:status', 'checking');
    });

    autoUpdater.on('update-available', (info: any) => {
      mainWindow.webContents.send('updater:status', 'available', info);
    });

    autoUpdater.on('update-not-available', () => {
      mainWindow.webContents.send('updater:status', 'not-available');
    });

    autoUpdater.on('error', (err: Error) => {
      console.error('[Updater] Error:', err.message);
      mainWindow.webContents.send('updater:status', 'error', err.message);
    });

    autoUpdater.on('download-progress', (progressObj: any) => {
      mainWindow.webContents.send('updater:progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info: any) => {
      mainWindow.webContents.send('updater:status', 'downloaded', info);
    });

    // Re-register IPC with real updater now that it's confirmed available
    ipcMain.removeHandler('updater:check');
    ipcMain.removeHandler('updater:download');
    ipcMain.removeHandler('updater:quitAndInstall');

    ipcMain.handle('updater:check', async () => {
      try {
        return await autoUpdater.checkForUpdates();
      } catch (err: any) {
        return { error: err.message };
      }
    });

    ipcMain.handle('updater:download', async () => {
      try {
        return await autoUpdater.downloadUpdate();
      } catch (err: any) {
        return { error: err.message };
      }
    });

    ipcMain.handle('updater:quitAndInstall', () => {
      autoUpdater.quitAndInstall();
    });

    // Start checking for update (non-blocking, errors are caught by the error event)
    autoUpdater.checkForUpdates().catch((err: Error) => {
      console.warn('[Updater] checkForUpdates error (non-fatal):', err.message);
    });

  } catch (err: any) {
    console.error('[Updater] setup failed (non-fatal):', err.message);
  }
}
