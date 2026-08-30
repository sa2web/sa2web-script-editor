const { app, BrowserWindow, dialog, ipcMain, Menu, screen, net, session } = require('electron');
const fs = require('fs');
const path = require('node:path');

import { init } from 'i18next';
import { i18n } from './i18n.js';
import * as cspParser from 'content-security-policy-parser';
import ajax from './Ajax.js';
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('no-sandbox', 'true');
app.commandLine.appendSwitch('disable-web-security', 'true');
app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
let mainWindow;
let testWindow;
let saForm;
async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: parseInt(width / 3 * 2),
    height: parseInt(height / 3 * 2),
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  let menus = await createMainMenus();
  mainWindow.setMenu(menus);
};

const userHomeDir = app.getPath('home');
const saveConfig = (config) => {
  const configPath = path.join(userHomeDir, '.sa.config');
  // const configPath = path.join(__dirname, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
const readConfig = () => {

  // const configPath = path.join(__dirname, 'config.json');
  const configPath = path.join(userHomeDir, '.sa.config');
  if (fs.existsSync(configPath)) {
    try {


      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.filePath) {
        try {
          const content = fs.readFileSync(config.filePath, 'utf-8');
          if (!config.form) {
            config.form = {}
          }
          console.error(`read file finished-${config.filePath}.`);
          // if(config.form.script!=content){
          config.form.script = content;

        } catch (err) {
          console.error(`error to read file-${config.filePath}:`, err);
          config = {}
        }
      }
      return config;
    } catch (err) {
      return {};
    }
  } else {
    console.error('Configuration file not found:', configPath);

    return {};
  }
}
async function createMainMenus() {
  const template = [
    {
      label: `${i18n.t('menuFile')}`,
      submenu: [
        {
          label: i18n.t('menuNewFile'),
          accelerator: 'Ctrl+N',
          click: () => {
            const config = readConfig();
            if (config.form) {
              delete config.form
            }

            delete config.filePath;
            saveConfig(config);
            mainWindow.webContents.reload();
          }
        },
        {
          label: `${i18n.t('menuOpenFile')}`,
          accelerator: 'Ctrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open-file');
          }
        },
        {
          label: `${i18n.t('menuSaveFile')}`,
          accelerator: 'Ctrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save-file');
          }
        }
      ]
    },
    {
      label: `${i18n.t('menuHelp')}`,
      submenu: [
        {
          label: `${i18n.t('menuChangeLanguage')}`,
          click: () => {

            mainWindow.webContents.send('menu-change-language');
          }
        },
        {
          label: `${i18n.t('menuAbout')}`,
          click: () => {

            mainWindow.webContents.send('menu-about');
          }
        },
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  // Menu.setApplicationMenu(menu);
  return menu;
}
let config = {};
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  const config = readConfig();
  let language = app.getLocale().split('-')[0];

  if (config.language) {
    language = config.language;
  } else {
    config.language = language;
    saveConfig(config);
  }

  if (config.filePath) {
    try {
      const content = fs.readFileSync(config.filePath, 'utf-8');
      if (!config.form) {
        config.form = {}
      }
      console.error(`read file finished-${config.filePath}.`);
      if (config.form.script != content) {
        config.form.script = content;

        saveConfig(config);
      }
    } catch (err) {
      console.error(`error to read file-${config.filePath}:`, err);
    }
  }
  await i18n.changeLanguage(language);


  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
const dataList = [
];
let api = {
  user: {
    put: async (name, value, site = false, account = false, did = false) => {
      let item = dataList.find((item) => item.name == name);
      if (item) {
        item.value = value;
      } else {
        dataList.push({ name, value });
      }
      return { status: true };
    },
    get: async (name, site = false, account = false, did = false) => {
      let item = dataList.find((item) => item.name == name);
      if (item) {
        return { value: item.value, status: true }
      }
      return { value: null, status: true }
    },
    remove: async (name, site = false, account = false, did = false) => {
      let item = dataList.find((item) => item.name == name);
      if (item) {
        let idx = dataList.indexOf(item);
        dataList.splice(idx, 1);
      }
      return { status: true };
    },
    incr: async (name, step = 1, site = false, account = false, did = false) => {
      let item = dataList.find((item) => item.name == name);
      if (item) {
        item.value = Number(item.value) + step;
      } else {
        dataList.push({ name, value: step });
      }
      let value = dataList.find((item) => item.name == name);
      return { status: true, value: value.value };
    },
    decr: async (name, step = 1, site = false, account = false, did = false) => {
      let item = dataList.find((item) => item.name == name);
      if (item) {
        item.value = Number(item.value) - step;
      } else {
        dataList.push({ name, value: step * -1 });
      }
      let value = dataList.find((item) => item.name == name);
      return { status: true, value: value.value };
    },
    startsWith: async (prefix, site = false, account = false, did = false) => {
      let items = dataList.filter((item) => item.name.startsWith(prefix));
      let ret = [];
      items.forEach((item) => {
        ret.push({ name: item.name, value: item.value })
      })
      return ret;
    },
    countAll: async (name, site = false, account = false, did = false) => {
      let items = dataList.filter((item) => item.name == name);

      return { value: items.length, status: true };
    },
    sumAll: async (name, site = false, account = false, did = false) => {
      let items = dataList.filter((item) => item.name == name);
      let sum = 0;
      items.forEach((item) => {
        sum += Number(item.value)
      })
      return { value: sum, status: true };
    }
  }
}
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'All Files', extensions: ['*'] }]
  });
  if (canceled || filePaths.length === 0) return { canceled: true };
  const content = fs.readFileSync(filePaths[0], 'utf-8');
  return { canceled: false, content, filePath: filePaths[0] };
});
ipcMain.handle('getName', async (event) => {
  return app.name
})
ipcMain.handle('save-file', async (event, { filePath, content }) => {
  if (!filePath) {
    const { canceled, filePath: savePath } = await dialog.showSaveDialog({
      filters: [{ name: 'All Files', extensions: ['*'] }]
    });
    if (canceled || !savePath) return { canceled: true };
    filePath = savePath;

  }
  fs.writeFileSync(filePath, content, 'utf-8');
  return { canceled: false, filePath };
});

let createTestWindowMenus = async () => {
  if (!testWindow || testWindow.isDestroyed()) return;

  const customMenu = Menu.buildFromTemplate([
    {
      label: `${i18n.t('menuWindow')}`,
      submenu: [
        { label: `${i18n.t('menuReload')}`, accelerator: 'Ctrl+R', click: () => testWindow.reload() },
        {
          label: `${i18n.t('menuClose')}`, accelerator: 'Ctrl+W', click: () => {
            testWindow.close();
            testWindow = null;
          }
        },
        { label: `${i18n.t('menuDevTools')}`, accelerator: 'Ctrl+I', click: () => testWindow.webContents.openDevTools() }
      ]
    }
  ]);
  testWindow.setMenu(customMenu);
}
const initProxy = (form) => {
  if (!testWindow || testWindow.isDestroyed()) return;
  if (!form || !form.proxy) return;
  console.log('Setting proxy:', form.proxy);

  testWindow.webContents.session.setProxy({
    mode: form.proxy.method,
    proxyRules: form.proxy.server,
    bypassRules: form.proxy.bypassList
  });
}

ipcMain.handle('launch', async (event, url, form) => {
  config.form = form;
  saveConfig(config);
  saForm = null;
  if (testWindow && !testWindow.isDestroyed()) {
    initProxy(form);
    testWindow.loadURL(url);
    return { canceled: false, status: 'already_opened' };
  }
  testWindow = createTestWindow();
  initProxy(form);

  createTestWindowMenus();
  // testWindow.loadURL(url);
  testWindow.loadURL(url);

  return { canceled: false, status: 'success' };
});
let requestHeadersMap = new Map();
let responseHeadersMap = new Map();
let createTestWindow = () => {
  let testWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: true,
      nodeIntegrationInSubFrames: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });
  let winDebugger = testWindow.webContents.debugger;
  winDebugger.attach('1.3');

  function checkUrl(matchExpr, url) {
    if (matchExpr === '*') {
      return true;
    }
    else if (matchExpr.startsWith('regex:')) {
      return new RegExp(matchExpr.substring('regex:'.length)).test(url);
    } else if (matchExpr.startsWith('exact:')) {
      return matchExpr.substring('exact:'.length) == url;
    } else if (matchExpr.startsWith('script:')) {
      let func = new Function('url', 'return (' + matchExpr.substring('script:'.length) + ')');
      return func(url);
    }
    else if (url.startsWith(matchExpr)) {
      return true;
    }
    return false;
  }
  winDebugger.on('message', async (event, method, params) => {
    if (method == 'Fetch.requestPaused') {
      const { requestId, request, responseStatusCode, responseHeaders } = params;
      // console.log(`Fetch.requestPaused`, requestId, request, responseHeaders);

      let isProcessed = false;
      if (!config.form.isPage && !config.form.isSSE) {

        let matchUrl = config.form.matchUrl;

        if (matchUrl && request.url && checkUrl(matchUrl, request.url)) {
          console.log(`${request.url} has matched ${matchUrl}`);
          try {
            let { body, base64Encoded } = await winDebugger.sendCommand('Fetch.getResponseBody', { requestId });
            if (base64Encoded) {
              body = Buffer.from(body, 'base64').toString('utf-8');
            }
            let func = new Function('data', 'api', 'url', 'return (async(data,api,url)=>{' + config.form.script + '})(data,api,url)');
            let ret = await func(body, api, request.url);

            if (base64Encoded) {
              ret = Buffer.from(ret, 'utf-8').toString('base64');
            }
            winDebugger.sendCommand('Fetch.fulfillRequest', {
              requestId,
              responseCode: responseStatusCode,
              responseHeaders: responseHeaders,
              body: ret,
            });
            isProcessed = true;
          } catch (e) {
            console.error(e);
          }

        }
      }
      if (!isProcessed) {
        winDebugger.sendCommand('Fetch.continueRequest', { requestId });
      }
    }
    // console.log(`Debug message: ${method}`, params);
  });
  winDebugger.sendCommand('Debugger.setSkipAllPauses', { skip: true });
  winDebugger.sendCommand('Network.enable');
  // if(!config.form.isPage && !config.form.isSSE){
  winDebugger.sendCommand('Fetch.enable', {
    patterns: [{
      urlPattern: '*',
      requestStage: 'Response'

    }]
  });
  // }
  testWindow.webContents.session.webRequest.onSendHeaders((details) => {
    const url = details.url;

    if (config.form.requestHeaders) {

      config.form.requestHeaders.split(",").forEach(header => {
        if (!header) {
          return;
        }
        if (details.requestHeaders[header]) {
          requestHeadersMap.set(header.toLocaleLowerCase(), details.requestHeaders[header]);
        }
      })
    }
    //  callback({cancel:false,requestHeaders:details.requestHeaders});

  });
  testWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {

    if (details.responseHeaders) {
      if (config.form.responseHeaders) {
        config.form.responseHeaders.split(",").forEach(header => {
          if (!header) {
            return;
          }
          if (details.responseHeaders && details.responseHeaders[header]) {
            responseHeadersMap.set(header.toLocaleLowerCase(), details.responseHeaders[header]);
          }
        })
      }
      let newCsps = [];
      if (details.responseHeaders['content-security-policy']) {
        let csps = details.responseHeaders['content-security-policy'];

        csps.forEach((csp) => {
          const cspMap = cspParser.default(csp);
          if (cspMap.get('connect-src') && cspMap.get('connect-src').length > 0) {
            cspMap.get('connect-src').push(`http://localhost:3000`);
          }
          if (cspMap.entries().length > 0) {
            newCsps.push(cspParser.stringify(cspMap));
          }
        })
      }
      if (newCsps.length > 0) {
        details.responseHeaders['content-security-policy'] = newCsps;

      } else {
        delete details.responseHeaders['content-security-policy'];
      }
    }

    callback({ responseHeaders: details.responseHeaders });
  });
  return testWindow;
}
ipcMain.handle('run-script', async (event, url, form) => {
  config.form = form;
  saveConfig(config);
  saForm = form;
  if (form.userAgent) {
    app.userAgentFallback = form.userAgent;
    session.defaultSession.userAgentFallback = form.userAgent;

    // testWindow.webContents.session.userAgentFallback=form.userAgent;
  }
  if (testWindow && !testWindow.isDestroyed()) {
    if (form.userAgent) {
      testWindow.webContents.session.userAgentFallback = form.userAgent;
    }
    initProxy(form);
    testWindow.loadURL(url);
    return { canceled: false, status: 'already_opened' };
  }

  testWindow = createTestWindow();
  if (form.userAgent) {
    testWindow.webContents.session.userAgentFallback = form.userAgent;
  }
  initProxy(form);

  createTestWindowMenus();
  testWindow.loadURL(url);
  console.log('Launching URL:', url);
  console.log('Form:', form);

  return { canceled: false, status: 'success' };
});
ipcMain.handle('getConfig', async () => {
  return readConfig();
});
ipcMain.handle('update-language', async (event, language) => {
  config.language = language;
  saveConfig(config)
  await i18n.changeLanguage(language);

  if (mainWindow) {
    let menus = await createMainMenus();

    mainWindow.setMenu(menus);
  }
  if (mainWindow) {
    mainWindow.webContents.reload();
  }
});
ipcMain.handle('getSaForm', async (event) => {
  if (event.sender == mainWindow.webContents) {
    return 0;
  }
  if (saForm) {
    return JSON.parse(JSON.stringify(saForm));
  } else {
    return 0;
  }
});


ipcMain.handle('userData.put', async (event, name, value, site = false, account = false, did = false) => {
  return api.user.put(name, value, site, account, did);
});

ipcMain.handle('userData.remove', async (event, name, site = false, account = false, did = false) => {
  return api.user.remove(name, site, account, did);
});

ipcMain.handle('userData.get', async (event, name, site = false, account = false, did = false) => {
  return api.user.get(name, site, account, did);
});
ipcMain.handle('userData.incr', async (event, name, step = 1, site = false, account = false, did = false) => {
  return api.user.incr(name, step, site, account, did);
});
ipcMain.handle('userData.decr', async (event, name, step = 1, site = false, account = false, did = false) => {
  return api.user.decr(name, step, site, account, did);
});
ipcMain.handle('userData.startsWith', async (event, name, site = false, account = false, did = false) => {
  return api.user.startsWith(name, site, account, did);
});
ipcMain.handle('userData.countAll', async (event, name, site = false, account = false, did = false) => {
  return api.user.countAll(name, site, account, did);
});
ipcMain.handle('userData.sumAll', async (event, name, site = false, account = false, did = false) => {
  return api.user.sumAll(name, site, account, did);
});
ipcMain.handle('ajaxData.ajax',async (event,options)=>{
    const {mid,url,method,data,headers,timeout,dataType,contentType,processData} = options;
    const ret=await ajax({
            url,
            method,
            data,
            headers,
            timeout,
            dataType,
            contentType,
            processData
        });
    return ret;
});
ipcMain.handle('getHeader', async (event, name, isRequest) => {
  name = (name || '').toLocaleLowerCase();
  if (isRequest) {

    return requestHeadersMap.get(name);
  } else {
    return JSON.stringify(responseHeadersMap.get(name));
  }
});
ipcMain.handle('saveConfig', async (event, renderConfig) => {
  let language = config.language;
  Object.assign(config, renderConfig);
  config.language = language;
  saveConfig(config);
})