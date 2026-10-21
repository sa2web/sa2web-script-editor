import { API } from './Api';
import { i18n } from './i18n.renderer';
import { copy, emptyScript, loadPlugin } from './pluginModel';

const SAVE_DELAY_MS = 500;
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '简体中文' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'vi', name: 'Tiếng Việt' }
];

function supportedLanguage(value) {
  const code = (value || 'en').split(/[-_]/)[0].toLowerCase();
  return LANGUAGES.some(language => language.code === code) ? code : 'en';
}

function addFromInput(items, input) {
  const value = input.value.trim();
  if (value) items.push(value);
  input.value = '';
}

function addControl(controls, form) {
  controls.push(copy(form));
  form.url = '*';
  form.selector = [];
}

async function start() {
  const { createApp, reactive, ref, watch } = window.Vue;
  const saved = await window.fileApi.getConfig();
  const systemLanguage = await window.fileApi.getSystemLanguage();
  const language = ref(supportedLanguage(saved.language || systemLanguage));
  await i18n.init(language.value);
  document.documentElement.lang = language.value;
  const initial = loadPlugin(saved);
  const meta = reactive(initial.meta);
  const config = reactive(initial.config);

  let editor;
  let scriptDraft;
  let saveTimer;
  let apiTypes;

  function refreshApiTypes() {
    if (!window.monaco) return;
    apiTypes?.dispose();
    apiTypes = monaco.languages.typescript.javascriptDefaults.addExtraLib(API.getComment());
  }

  function pluginSnapshot() {
    return {
      ...copy(meta),
      config: copy(config),
      draft: copy(scriptDraft)
    };
  }

  function saveNow() {
    clearTimeout(saveTimer);
    return window.fileApi.saveConfig({ plugin: pluginSnapshot() });
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, SAVE_DELAY_MS);
  }

  createApp({
    setup() {
      const newRequestHeader = ref('');
      const newResponseHeader = ref('');
      const newThirdSite = ref('');
      const newSecret = ref('');
      const newBlock = ref('');
      const newRemoveControl = reactive({ url: '*', selector: [] });
      const newRemoveSelector = ref('');
      const newHideControl = reactive({ url: '*', selector: [] });
      const newHideSelector = ref('');
      const newScript = reactive(initial.draft);
      const editingScriptIndex = ref(null);
      const busy = ref(false);
      const status = ref('');
      const localeRevision = ref(0);
      const t = (key, options) => {
        localeRevision.value;
        return i18n.t(key, options);
      };

      scriptDraft = newScript;

      function resetScriptForm() {
        editingScriptIndex.value = null;
        Object.assign(newScript, emptyScript());
        editor?.setValue('');
      }

      function editScript(index) {
        editingScriptIndex.value = index;
        Object.assign(newScript, copy(config.scripts[index]));
        editor?.setValue(newScript.content || '');
        document.getElementById('script-editor').scrollIntoView({ behavior: 'smooth' });
      }

      function addOrUpdateScript() {
        newScript.content = editor?.getValue() ?? newScript.content;

        if (!newScript.name.trim()) {
          status.value = t('editor.scriptNameRequired');
          return false;
        }

        const script = copy(newScript);
        if (editingScriptIndex.value === null) {
          config.scripts.push(script);
        } else {
          config.scripts[editingScriptIndex.value] = script;
        }

        resetScriptForm();
        status.value = t('editor.scriptSaved');
        return true;
      }

      function commitPendingScript() {
        const hasDraft = newScript.name.trim() || newScript.content.trim();
        return !hasDraft || addOrUpdateScript();
      }

      async function launch() {
        if (!meta.name || !meta.token || !meta.testUrl) {
          status.value = t('editor.launchRequired');
          return;
        }
        if (!commitPendingScript()) return;

        try {
          busy.value = true;
          status.value = t('editor.waitingUserCenter');
          await saveNow();

          await window.fileApi.pluginLaunch({
            ...copy(meta),
            config: copy(config)
          });
          status.value = '';
        } catch (error) {
          status.value = error.message;
        } finally {
          busy.value = false;
        }
      }

      function exportPlugin() {
        if (!meta.name?.trim() || !meta.ver?.trim() || !meta.remark?.trim()) {
          status.value = t('editor.exportRequired');
          return;
        }
        if (!commitPendingScript()) return;

        const plugin = {
          name: meta.name,
          ver: meta.ver,
          remark: meta.remark,
          content: copy(config)
        };
        const blob = new Blob([JSON.stringify(plugin, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `${meta.name}_${meta.ver}.json`;
        link.click();
        URL.revokeObjectURL(url);
        status.value = '';
      }

      function addSecret() {
        const secrets = newSecret.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
        config.controls.secrets.push(...secrets);
        newSecret.value = '';
      }

      watch(meta, scheduleSave, { deep: true });
      watch(config, scheduleSave, { deep: true });
      watch(newScript, scheduleSave, { deep: true });
      watch(language, async code => {
        await i18n.changeLanguage(code);
        localeRevision.value++;
        document.documentElement.lang = code;
        status.value = '';
        refreshApiTypes();
        await window.fileApi.setLanguage(code);
      });

      return {
        t,
        language,
        languages: LANGUAGES,
        meta,
        config,
        busy,
        status,
        newRequestHeader,
        newResponseHeader,
        newThirdSite,
        newSecret,
        newBlock,
        newRemoveControl,
        newRemoveSelector,
        newHideControl,
        newHideSelector,
        newScript,
        editingScriptIndex,
        launch,
        exportPlugin,
        saveConfig: saveNow,
        editScript,
        addOrUpdateScript,
        cancelEditScript: resetScriptForm,
        addRequestHeader: () => addFromInput(config.requestHeaders, newRequestHeader),
        removeRequestHeader: index => config.requestHeaders.splice(index, 1),
        addResponseHeader: () => addFromInput(config.responseHeaders, newResponseHeader),
        removeResponseHeader: index => config.responseHeaders.splice(index, 1),
        addThirdSite: () => addFromInput(config.thirdSites, newThirdSite),
        removeThirdSite: index => config.thirdSites.splice(index, 1),
        addSecret,
        removeSecret: index => config.controls.secrets.splice(index, 1),
        addBlock: () => addFromInput(config.controls.blocks, newBlock),
        removeBlock: index => config.controls.blocks.splice(index, 1),
        addRemoveSelector: () => addFromInput(newRemoveControl.selector, newRemoveSelector),
        addRemoveControl: () => addControl(config.controls.remove, newRemoveControl),
        addHideSelector: () => addFromInput(newHideControl.selector, newHideSelector),
        addHideControl: () => addControl(config.controls.hide, newHideControl),
        removeScript: index => config.scripts.splice(index, 1)
      };
    }
  }).mount('#app');

  document.getElementById('app').style.visibility = 'visible';

  function initEditor() {
    refreshApiTypes();
    monaco.editor.defineTheme('plugin-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#F8FAFC',
        'editor.lineHighlightBackground': '#EEF3F8',
        'editorGutter.background': '#F8FAFC'
      }
    });
    editor = monaco.editor.create(document.getElementById('script-editor'), {
      value: scriptDraft.content,
      language: 'javascript',
      theme: 'plugin-light',
      automaticLayout: true
    });
    editor.onDidChangeModelContent(() => {
      scriptDraft.content = editor.getValue();
    });
  }

  if (window.monaco) {
    initEditor();
  } else {
    window.addEventListener('monaco-ready', initEditor, { once: true });
  }
}

window.addEventListener('load', start);
