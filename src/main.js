const { app, BrowserWindow, dialog, ipcMain, Menu, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

import { registerPluginDebugHandlers } from './pluginDebugWindows';
import { i18n } from './i18n';

if (require('electron-squirrel-startup')) {
  app.quit();
}

const CONFIG_FILE = '.sa.config';
let mainWindow;
const SUPPORTED_LANGUAGES = new Set(['en', 'zh', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'ru', 'vi']);

function supportedLanguage(value) {
  const code = (value || 'en').split(/[-_]/)[0].toLowerCase();
  return SUPPORTED_LANGUAGES.has(code) ? code : 'en';
}

function systemLanguage() {
  return supportedLanguage(app.getSystemLocale());
}

function configPath() {
  return path.join(app.getPath('home'), CONFIG_FILE);
}

function readConfig() {
  if (!fs.existsSync(configPath())) return {};

  try {
    const config = JSON.parse(fs.readFileSync(configPath(), 'utf8'));

    // Existing users may still have a script in an external file. The renderer
    // converts this legacy form into a plugin script on first opening.
    if (config.filePath && config.form) {
      try {
        config.form.script = fs.readFileSync(config.filePath, 'utf8');
      } catch (error) {
        console.warn('Legacy script file is unavailable:', error);
      }
    }
    return config;
  } catch (error) {
    console.error('Failed to read editor configuration:', error);
    return {};
  }
}

function writeConfig(config) {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf8');
}

function createMenu() {
  return Menu.buildFromTemplate([
    {
      label: i18n.t('menuFile'),
      submenu: [
        {
          label: i18n.t('editor.newPlugin'),
          accelerator: 'Ctrl+N',
          click: () => {
            const config = readConfig();
            delete config.plugin;
            delete config.form;
            delete config.filePath;
            writeConfig(config);
            mainWindow.webContents.reload();
          }
        }
      ]
    },
    {
      label: i18n.t('menuHelp'),
      submenu: [
        {
          label: i18n.t('menuAbout'),
          click: () => dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'sa2web-plugin-editor',
            message: 'sa2web-plugin-editor',
            detail: `${i18n.t('sitePlugin.ver')} ${app.getVersion()}`
          })
        }
      ]
    }
  ]);
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.round(width * 2 / 3),
    height: Math.round(height * 2 / 3),
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenu(createMenu());
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
}

ipcMain.handle('getConfig', readConfig);
ipcMain.handle('getSystemLanguage', systemLanguage);
ipcMain.handle('saveConfig', (event, changes) => {
  const config = { ...readConfig(), ...changes };
  writeConfig(config);
});
ipcMain.handle('setLanguage', async (event, value) => {
  const language = supportedLanguage(value);
  await i18n.changeLanguage(language);
  writeConfig({ ...readConfig(), language });
  mainWindow?.setMenu(createMenu());
});
registerPluginDebugHandlers();

app.whenReady().then(async () => {
  await i18n.init(supportedLanguage(readConfig().language || systemLanguage()));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
