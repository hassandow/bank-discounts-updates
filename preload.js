const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appUpdater', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  openUpdateLog: () => ipcRenderer.invoke('updater:open-log'),
  onStatus: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('updater:status', (_event, status) => callback(status));
  }
});
