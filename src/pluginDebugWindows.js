import { BrowserWindow, dialog, ipcMain, session } from 'electron';
import { i18n } from './i18n';

const SESSION_PARTITION = 'persist:sa2web-plugin-debug';
const DEBUG_COOKIE = 'plugin-token';
const SYNC_PATH = '/api/v1/admin/site-plugins/debug-sync';
const USER_CENTER_PATH = '/app/index';

let launchWindow;

function httpUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(i18n.t('editor.httpUrlOnly'));
  }
  return url;
}

function watchJavaScriptDialogs(window) {
  const debuggerApi = window.webContents.debugger;

  // Do not wait for the debugger before navigating. Page.enable can remain
  // pending on an empty BrowserWindow, leaving the Launch window white.
  window.webContents.once('did-finish-load', () => {
    try {
      debuggerApi.attach('1.3');
      debuggerApi.on('message', (_event, method) => {
        if (method !== 'Page.javascriptDialogClosed') return;

        // Let Chromium finish unblocking the renderer before checking focus.
        setTimeout(async () => {
          if (window.isDestroyed() || !window.isFocused()) return;

          try {
            const pageHasFocus = await window.webContents.executeJavaScript('document.hasFocus()');
            if (window.isDestroyed() || !window.isFocused() || pageHasFocus) return;

            window.blur();
            window.focus();
            window.webContents.focus();
          } catch (error) {
            console.warn('Could not restore page focus after dialog:', error);
          }
        }, 50);
      });
      debuggerApi.sendCommand('Page.enable').catch(error => {
        console.warn('Could not watch JavaScript dialogs:', error);
        if (debuggerApi.isAttached()) debuggerApi.detach();
      });
    } catch (error) {
      console.warn('Could not watch JavaScript dialogs:', error);
    }
  });
}

function createBrowserWindow(browserSession, width, height) {
  const window = new BrowserWindow({
    width,
    height,
    webPreferences: {
      session: browserSession,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Electron 37 can leave a page blurred after a native alert or confirm.
  watchJavaScriptDialogs(window);
  return window;
}

function closeWindow(window) {
  if (window && !window.isDestroyed()) window.close();
}

async function loadTestUrl(window, url) {
  try {
    await window.loadURL(url.toString());
  } catch (error) {
    closeWindow(window);
    throw new Error(i18n.t('editor.openUrlFailed', { message: error.message }));
  }
}

function syncScript(payload) {
  // Encode the JSON before placing it in page JavaScript. Plugin scripts may contain
  // backticks or interpolation markers, which must not become executable code here.
  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json, 'utf8').toString('base64');

  return `(async () => {
    const accessToken = localStorage.getItem('accessToken');
    const bytes = Uint8Array.from(atob('${base64}'), character => character.charCodeAt(0));
    const body = new TextDecoder().decode(bytes);
    const response = await fetch('${SYNC_PATH}', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {})
      },
      body
    });
    return { httpStatus: response.status, data: await response.json() };
  })()`;
}

async function showSyncSuccessTooltip(window) {
  const message = JSON.stringify(i18n.t('editor.syncSuccess'));
  const script = `(() => {
    const tooltip = document.createElement('div');
    tooltip.setAttribute('role', 'status');
    tooltip.textContent = ${message};
    Object.assign(tooltip.style, {
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: '2147483647',
      padding: '10px 16px',
      color: '#14532d',
      background: '#ecfdf3',
      border: '1px solid #86d3a4',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(31, 41, 55, 0.16)',
      font: '24px sans-serif'
    });
    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 5000);
  })()`;

  try {
    await window.webContents.executeJavaScript(script);
  } catch (error) {
    console.warn('Plugin synced, but the success tooltip could not be shown:', error);
  }
}

function waitForUserCenter(window, siteOrigin) {
  return new Promise((resolve, reject) => {
    const webContents = window.webContents;

    function stopWatching() {
      webContents.off('did-finish-load', checkAddress);
      webContents.off('did-navigate-in-page', checkAddress);
      window.off('closed', onClosed);
    }

    function checkAddress() {
      if (window.isDestroyed()) return;

      let current;
      try {
        current = new URL(webContents.getURL());
      } catch {
        return;
      }
      if (current.origin !== siteOrigin || current.pathname !== USER_CENTER_PATH) return;

      stopWatching();
      resolve();
    }

    function onClosed() {
      stopWatching();
      reject(new Error(i18n.t('editor.closedBeforeUserCenter')));
    }

    webContents.on('did-finish-load', checkAddress);
    webContents.on('did-navigate-in-page', checkAddress);
    window.on('closed', onClosed);
    checkAddress();
  });
}

async function launch(payload) {
  const testUrl = httpUrl(payload.testUrl);
  if (!payload.name?.trim() || !payload.token?.trim()) {
    throw new Error(i18n.t('editor.syncRequired'));
  }

  const browserSession = session.fromPartition(SESSION_PARTITION);
  await browserSession.cookies.remove(testUrl.origin, DEBUG_COOKIE);

  closeWindow(launchWindow);
  launchWindow = createBrowserWindow(browserSession, 1200, 850);
  await loadTestUrl(launchWindow, testUrl);

  try {
    await waitForUserCenter(launchWindow, testUrl.origin);

    const sync = await launchWindow.webContents.executeJavaScript(syncScript({
      name: payload.name,
      token: payload.token,
      config: payload.config
    }), true);

    if (sync.httpStatus !== 200 || sync.data?.status !== true) {
      const invalidToken = sync.data?.msg === 'Plugin name or debug token is invalid';
      const fallback = i18n.t('editor.syncFailed', { status: sync.httpStatus });
      throw new Error(invalidToken ? i18n.t('editor.invalidPlugin') : (sync.data?.msg || fallback));
    }

    await browserSession.cookies.set({
      url: testUrl.origin,
      name: DEBUG_COOKIE,
      value: payload.token,
      path: '/',
      sameSite: 'lax',
      secure: testUrl.protocol === 'https:',
      httpOnly: true
    });
    await loadTestUrl(launchWindow, testUrl);
    await showSyncSuccessTooltip(launchWindow);

    return { status: true, siteId: sync.data.siteId };
  } catch (error) {
    if (!launchWindow.isDestroyed()) {
      await dialog.showMessageBox(launchWindow, {
        type: 'error',
        title: i18n.t('editor.launchFailed'),
        message: error.message
      });
    }
    throw error;
  }
}

export function registerPluginDebugHandlers() {
  ipcMain.handle('plugin-launch', (event, payload) => launch(payload));
}
