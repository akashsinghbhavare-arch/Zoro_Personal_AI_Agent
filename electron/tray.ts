import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow): Tray {
  // Use custom PNG or fallback to blank icon
  const iconPath = path.join(app.getAppPath(), 'assets', 'tray-icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    // Generate simple 16x16 fallback image
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Nova AI — Voice & Desktop Assistant');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Nova AI',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'New Chat',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('tray:action', 'new-chat');
      },
    },
    {
      label: 'Voice Mode',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('tray:action', 'voice-mode');
      },
    },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('tray:action', 'settings');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Nova AI',
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}
