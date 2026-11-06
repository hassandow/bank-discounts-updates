const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appUpdater', {
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onStatus: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('updater:status', (_event, status) => callback(status));
  }
});
