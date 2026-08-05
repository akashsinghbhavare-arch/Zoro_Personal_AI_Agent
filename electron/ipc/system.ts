import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import { exec } from 'child_process';
import os from 'os';

export function registerSystemIPC(mainWindow: BrowserWindow) {
  // Launch Application
  ipcMain.handle('system:launchApp', async (_event, appName: string) => {
    const isWin = os.platform() === 'win32';
    const isMac = os.platform() === 'darwin';

    const commands: Record<string, string> = {
      chrome: isWin ? 'start chrome' : isMac ? 'open -a "Google Chrome"' : 'google-chrome',
      edge: isWin ? 'start msedge' : isMac ? 'open -a "Microsoft Edge"' : 'microsoft-edge',
      vscode: 'code',
      explorer: isWin ? 'explorer' : isMac ? 'open .' : 'xdg-open .',
      notepad: isWin ? 'notepad' : isMac ? 'open -a TextEdit' : 'gedit',
      spotify: isWin ? 'start spotify' : isMac ? 'open -a Spotify' : 'spotify',
      discord: isWin ? 'start discord' : isMac ? 'open -a Discord' : 'discord',
      steam: isWin ? 'start steam' : isMac ? 'open -a Steam' : 'steam',
      calculator: isWin ? 'calc' : isMac ? 'open -a Calculator' : 'gnome-calculator',
    };

    const cmd = commands[appName.toLowerCase()];
    if (!cmd) return { success: false, error: `Unknown application: ${appName}` };

    return new Promise((resolve) => {
      exec(cmd, (err) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true });
      });
    });
  });

  // Execute Terminal Command with Confirmation
  ipcMain.handle('system:runCommand', async (_event, commandLine: string) => {
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Execute Command'],
      defaultId: 0,
      cancelId: 0,
      title: 'Security Warning: Execute Terminal Command',
      message: `The AI Assistant is requesting to run a shell command:`,
      detail: `Command:\n${commandLine}\n\nPlease confirm if you trust this command.`,
    });

    if (response.response !== 1) {
      return { success: false, error: 'Command execution cancelled by user' };
    }

    return new Promise((resolve) => {
      exec(commandLine, (err, stdout, stderr) => {
        if (err) resolve({ success: false, error: err.message, stderr });
        else resolve({ success: true, stdout, stderr });
      });
    });
  });

  // Lock Screen
  ipcMain.handle('system:lockScreen', async () => {
    const platform = os.platform();
    let cmd = '';
    if (platform === 'win32') cmd = 'rundll32.exe user32.dll,LockWorkStation';
    else if (platform === 'darwin') cmd = 'pmset displaysleepnow';
    else cmd = 'gnome-screensaver-command -l';

    return new Promise((resolve) => {
      exec(cmd, (err) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true });
      });
    });
  });

  // Shutdown / Restart with Confirmation
  ipcMain.handle('system:power', async (_event, action: 'shutdown' | 'restart') => {
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', action === 'shutdown' ? 'Shutdown Now' : 'Restart Now'],
      defaultId: 0,
      cancelId: 0,
      title: `Confirm System ${action === 'shutdown' ? 'Shutdown' : 'Restart'}`,
      message: `Are you sure you want to ${action} your computer?`,
    });

    if (response.response !== 1) return { success: false, error: 'Cancelled' };

    const isWin = os.platform() === 'win32';
    const cmd = action === 'shutdown'
      ? (isWin ? 'shutdown /s /t 0' : 'shutdown -h now')
      : (isWin ? 'shutdown /r /t 0' : 'shutdown -r now');

    return new Promise((resolve) => {
      exec(cmd, (err) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true });
      });
    });
  });

  // Open External URL
  ipcMain.handle('system:openExternal', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
