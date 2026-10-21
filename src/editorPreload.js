const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fileApi', {
  getConfig: () => ipcRenderer.invoke('getConfig'),
  getSystemLanguage: () => ipcRenderer.invoke('getSystemLanguage'),
  saveConfig: config => ipcRenderer.invoke('saveConfig', config),
  setLanguage: language => ipcRenderer.invoke('setLanguage', language),
  pluginLaunch: payload => ipcRenderer.invoke('plugin-launch', payload)
});
