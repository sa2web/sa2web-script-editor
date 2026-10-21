export function emptyPluginConfig() {
  return {
    requestHeaders: [],
    responseHeaders: [],
    thirdSites: [],
    scripts: [],
    controls: {
      remove: [],
      hide: [],
      secrets: [],
      blocks: []
    }
  };
}

export function emptyScript() {
  return {
    name: '',
    url: '',
    pageScript: true,
    sseScript: false,
    selector: '',
    content: ''
  };
}

export function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function splitHeaders(value) {
  return (value || '').split(',').map(header => header.trim()).filter(Boolean);
}

function migrateLegacyForm(form) {
  const config = emptyPluginConfig();
  config.requestHeaders = splitHeaders(form.requestHeaders);
  config.responseHeaders = splitHeaders(form.responseHeaders);
  config.controls.hide = (form.hide || []).map(selector => ({ url: '*', selector: [selector] }));
  config.controls.remove = (form.remove || []).map(selector => ({ url: '*', selector: [selector] }));

  if (form.script) {
    config.scripts.push({
      name: 'Migrated script',
      url: form.matchUrl || '*',
      pageScript: !!form.isPage,
      sseScript: !!form.isSSE,
      selector: form.scriptSelector || '',
      content: form.script
    });
  }

  return { config };
}

export function loadPlugin(saved) {
  const plugin = saved.plugin || (saved.form ? migrateLegacyForm(saved.form) : {});
  const original = plugin.config || emptyPluginConfig();

  return {
    meta: {
      name: plugin.name || '',
      ver: plugin.ver || '',
      remark: plugin.remark || '',
      token: plugin.token || '',
      testUrl: plugin.testUrl || plugin.launchUrl || plugin.loginUrl || ''
    },
    config: {
      requestHeaders: original.requestHeaders || [],
      responseHeaders: original.responseHeaders || [],
      thirdSites: original.thirdSites || [],
      scripts: original.scripts || [],
      controls: { ...emptyPluginConfig().controls, ...(original.controls || {}) }
    },
    draft: { ...emptyScript(), ...(plugin.draft || {}) }
  };
}
