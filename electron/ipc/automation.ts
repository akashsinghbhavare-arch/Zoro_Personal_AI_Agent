import { ipcMain, shell } from 'electron';

export function registerAutomationIPC() {
  // Search Google
  ipcMain.handle('automation:searchGoogle', async (_event, query: string) => {
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      await shell.openExternal(url);
      return { success: true, url };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Open YouTube
  ipcMain.handle('automation:openYouTube', async (_event, query?: string) => {
    try {
      const url = query
        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
        : 'https://www.youtube.com';
      await shell.openExternal(url);
      return { success: true, url };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Open Gmail
  ipcMain.handle('automation:openGmail', async () => {
    try {
      await shell.openExternal('https://mail.google.com');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
