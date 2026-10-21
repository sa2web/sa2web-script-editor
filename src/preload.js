
const { contextBridge, ipcRenderer, webFrame } = require('electron');
const { Logger } = require('./logger');
let saForm = null;
const logger = new Logger("preload");
contextBridge.exposeInMainWorld('fileApi', {
    launch: (url, saForm) => ipcRenderer.invoke('launch', url, saForm),
    openFile: () => ipcRenderer.invoke('open-file'),
    saveFile: (filePath, content) => ipcRenderer.invoke('save-file', { filePath, content }),
    onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', callback),
    onMenuSaveFile: (callback) => ipcRenderer.on('menu-save-file', callback),
    getConfig: () => ipcRenderer.invoke('getConfig'),
    onMenuChangeLanguage: (callback) => ipcRenderer.on('menu-change-language', callback),
    updateLanguage: (language) => ipcRenderer.invoke('update-language', language),
    runScript: (url, form) => ipcRenderer.invoke('run-script', url, form),
    saveConfig: (config) => ipcRenderer.invoke('saveConfig', config),
    onAbout: (callback) => ipcRenderer.on('menu-about', callback),
    getName: () => ipcRenderer.invoke('getName')
});


ipcRenderer.invoke('getSaForm').then(form => {
    if (!form) {
        logger.error('Form not found. Please ensure the form is correctly initialized.');
        return;
    }
    saForm = form;
    logger.info('Form fetched successfully:', form);
    //initWindow(window);

}).catch(err => {
    logger.error('Error fetching form:', err);
});

