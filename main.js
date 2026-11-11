const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let updateCheckRunning = false;
let updateLogPath = '';

function writeUpdateLog(level, ...args) {
  try {
    const message = args.map((item) => {
      if (item instanceof Error) return item.stack || item.message;
      if (typeof item === 'string') return item;
      try { return JSON.stringify(item); } catch (_) { return String(item); }
    }).join(' ');
    fs.appendFileSync(updateLogPath, `[${new Date().toISOString()}] [${level}] ${message}\r\n`, 'utf8');
  } catch (_) {
    // Logging must never interrupt application startup or updating.
  }
}

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

  const logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  updateLogPath = path.join(logDir, 'updater.log');

  const updateLogger = {
    info: (...args) => writeUpdateLog('INFO', ...args),
    warn: (...args) => writeUpdateLog('WARN', ...args),
    error: (...args) => writeUpdateLog('ERROR', ...args),
    debug: (...args) => writeUpdateLog('DEBUG', ...args)
  };
  autoUpdater.logger = updateLogger;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableDifferentialDownload = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  writeUpdateLog('INFO', 'Updater initialized', {
    appVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    logPath: updateLogPath
  });

  autoUpdater.on('checking-for-update', () => {
    updateCheckRunning = true;
    writeUpdateLog('INFO', 'Checking for updates');
    sendUpdateStatus({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    writeUpdateLog('INFO', 'Update available', { version: info.version, releaseName: info.releaseName });
    sendUpdateStatus({ type: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', (info) => {
    updateCheckRunning = false;
    writeUpdateLog('INFO', 'No update available', { version: info && info.version });
    sendUpdateStatus({ type: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    writeUpdateLog('INFO', 'Download progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total
    });
    sendUpdateStatus({ type: 'progress', percent: progress.percent });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateCheckRunning = false;
    writeUpdateLog('INFO', 'Update downloaded', { version: info.version });
    sendUpdateStatus({ type: 'downloaded', version: info.version });
  });

  autoUpdater.on('error', (error) => {
    updateCheckRunning = false;
    writeUpdateLog('ERROR', 'Updater error', error);
    sendUpdateStatus({
      type: 'error',
      message: error && error.message ? error.message : 'خطأ غير معروف',
      logPath: updateLogPath
    });
  });

  ipcMain.handle('updater:check', async () => {
    if (updateCheckRunning) return { started: true };
    updateCheckRunning = true;
    writeUpdateLog('INFO', 'Manual update check requested');
    try {
      await autoUpdater.checkForUpdates();
      return { started: true };
    } catch (error) {
      updateCheckRunning = false;
      writeUpdateLog('ERROR', 'checkForUpdates rejected', error);
      sendUpdateStatus({
        type: 'error',
        message: error && error.message ? error.message : 'تعذر فحص التحديثات',
        logPath: updateLogPath
      });
      throw error;
    }
  });

  ipcMain.handle('updater:install', () => {
    writeUpdateLog('INFO', 'User requested update installation');
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle('updater:open-log', async () => {
    if (!updateLogPath) return 'سجل التحديث غير متاح في هذه النسخة';
    const result = await shell.openPath(updateLogPath);
    return result || updateLogPath;
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      updateCheckRunning = false;
      writeUpdateLog('ERROR', 'Automatic update check rejected', error);
      sendUpdateStatus({
        type: 'error',
        message: error && error.message ? error.message : 'تعذر فحص التحديثات',
        logPath: updateLogPath
      });
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
