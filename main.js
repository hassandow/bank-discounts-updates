const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let updateCheckRunning = false;

function sendUpdateStatus(status) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('updater:status', status);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 650,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

function configureAutoUpdates() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // تنزيل كامل ملف التثبيت بدلاً من التحديث التفاضلي الذي يحتاج ملف .blockmap.
  autoUpdater.disableDifferentialDownload = true;

  autoUpdater.on('checking-for-update', () => {
    updateCheckRunning = true;
    sendUpdateStatus({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({ type: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    updateCheckRunning = false;
    sendUpdateStatus({ type: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({ type: 'progress', percent: progress.percent });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateCheckRunning = false;
    sendUpdateStatus({ type: 'downloaded', version: info.version });
  });

  autoUpdater.on('error', (error) => {
    updateCheckRunning = false;
    sendUpdateStatus({ type: 'error', message: error && error.message ? error.message : 'خطأ غير معروف' });
  });

  ipcMain.handle('updater:check', async () => {
    if (updateCheckRunning) return { started: true };
    updateCheckRunning = true;
    try {
      await autoUpdater.checkForUpdates();
      return { started: true };
    } catch (error) {
      updateCheckRunning = false;
      sendUpdateStatus({ type: 'error', message: error && error.message ? error.message : 'تعذر فحص التحديثات' });
      throw error;
    }
  });

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall();
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      updateCheckRunning = false;
      sendUpdateStatus({ type: 'error', message: error && error.message ? error.message : 'تعذر فحص التحديثات' });
    });
  }, 7000);
}

app.whenReady().then(() => {
  ipcMain.handle('app:version', () => app.getVersion());
  createWindow();
  configureAutoUpdates();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
