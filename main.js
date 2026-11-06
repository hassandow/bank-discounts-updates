const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 650,
    autoHideMenuBar: true,
    webPreferences: {
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
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'تحديث جديد',
      message: 'يوجد تحديث جديد لمنظومة الخصومات المصرفية، وسيتم تنزيله تلقائياً.'
    });
  });
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'التحديث جاهز',
      message: 'تم تنزيل التحديث. سيتم تثبيته عند إغلاق المنظومة وفتحها مرة أخرى.'
    });
  });
  autoUpdater.on('error', (error) => {
    console.error('Auto update error:', error);
  });
  setTimeout(() => autoUpdater.checkForUpdates().catch((error) => {
    console.error('Update check failed:', error);
  }), 5000);
}

app.whenReady().then(() => {
  createWindow();
  configureAutoUpdates();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
