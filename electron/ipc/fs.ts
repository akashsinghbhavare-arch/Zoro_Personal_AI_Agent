import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export function registerFsIPC(mainWindow: BrowserWindow) {
  // Read File
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Write File
  ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Create Folder
  ipcMain.handle('fs:createFolder', async (_event, dirPath: string) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Delete File with native Confirmation Dialog
  ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Delete Permanently'],
      defaultId: 0,
      cancelId: 0,
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${path.basename(filePath)}"?`,
      detail: `Path: ${filePath}\nThis action cannot be undone.`,
    });

    if (response.response !== 1) {
      return { success: false, error: 'Cancelled by user' };
    }

    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Search Files
  ipcMain.handle('fs:searchFiles', async (_event, targetDir: string, query: string) => {
    try {
      const results: string[] = [];
      async function walk(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.name.toLowerCase().includes(query.toLowerCase())) {
            results.push(fullPath);
          }
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walk(fullPath);
          }
        }
      }
      await walk(targetDir);
      return { success: true, files: results.slice(0, 100) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Open File Dialog
  ipcMain.handle('fs:pickFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return { success: false };
    return { success: true, filePath: result.filePaths[0] };
  });
}
