import { Dialogs } from './Dialogs';
import { i18n } from './i18n.renderer';
import { API } from './Api';
import { Utils } from './utils';

let config = null;
let SaForm = null;
let initConfig = async () => {
    config = await window.fileApi.getConfig();
    if (config) {
        await i18n.init();
        await i18n.changeLanguage(config.language || 'en');
    } else {
        console.error('Failed to load configuration from main process.');
    }
}
const AUTO_SAVE_DELAY = 1000;
let saveContent = async () => {
    if (window['editor']) {
        let editor = window['editor'];
        config.form = JSON.parse(JSON.stringify(SaForm))
        config.form.script = editor.getValue();

        if (config.filePath) {
            await window.fileApi.saveFile(config.filePath, editor.getValue());

        }
        window.fileApi.saveConfig(config);
    }
}


let initApp = () => {
    if (!config.form) {
        config.form = {
            url: "",
            hide: [],
            remove: [],
            requestHeaders: '',
            responseHeaders: '',
            scriptSelector: '',
            urlchangeEvent: true,
            isPage: true,
            isSSE: false,
            matchUrl: '',
            proxy: { // New proxy object
                method: 'fixed_servers', // Default value
                server: '',
                bypassList: '<local>,<loopback>,192.168.0.0/16,172.20.0.0/12,10.0.0.0/8'
            }
        }
    } else {
        if (!config.form.hide) {
            config.form.hide = [];
        }
        if (!config.form.remove) {
            config.form.remove = [];
        }
        if (!config.form.proxy) {
            config.form.proxy = {
                method: 'fixed_servers',
                server: '',
                bypassList: '<local>,<loopback>,192.168.0.0/16,172.20.0.0/12,10.0.0.0/8'
            }
        }

    }

    document.querySelector('#app').style.visibility = 'visible';
    let { createApp, ref, watch, reactive } = Vue;
    const t = (key) => i18n.t(key);

    const app = createApp({
        setup() {
            // Define the SaForm object as a reactive object
            SaForm = reactive(config.form);

            if (!SaForm.product) {
                SaForm.product = {}
            }

            const product = {
                newKey: '',
                newValue: '',
            }
            const newHideRule = ref('');
            const newDeleteRule = ref('');
            const showRuleSections = ref(false); // Initial state is hidden
            const filePath = ref(config.filePath || '');
            if (config.filePath) {
                document.title = `${t('edit')} - ${config.filePath}`;
            }

            watch(
                () => SaForm,
                (newAddress, oldAddress) => {
                    const debouncedSave = Utils.debounce(saveContent, AUTO_SAVE_DELAY);

                    debouncedSave();

                },
                { deep: true }
            );
            const launch = async () => {
                if (!SaForm.url) {
                    Dialogs.alert(t('error'), t('urlRequired'));
                    return;
                }
                try {
                    new URL(SaForm.url);
                } catch (e) {
                    Dialogs.alert(t('error'), t('urlRequired'));
                    return;
                }
                let form = JSON.parse(JSON.stringify(SaForm));
                form.script = window['editor'].getValue();
                await window.fileApi.launch(SaForm.url, form);
                console.log('Lauch URL:', SaForm.url);
                console.log('Start SaForm:', JSON.parse(JSON.stringify(SaForm))); // Log the full SaForm object
                // Add your launch logic here
            };

            const runScript = async () => {

                let form = JSON.parse(JSON.stringify(SaForm));
                form.script = window['editor'].getValue();
                await window.fileApi.runScript(SaForm.url, form);
                // Add your run script logic here
            };

            const addHideRule = () => {
                if (newHideRule.value.trim() !== '') {
                    SaForm.hide.push(newHideRule.value.trim());
                    newHideRule.value = '';
                }
            };

            const removeHideRule = (index) => {
                SaForm.hide.splice(index, 1);
            };

            const addDeleteRule = () => {
                if (newDeleteRule.value.trim() !== '') {
                    SaForm.remove.push(newDeleteRule.value.trim());
                    newDeleteRule.value = '';
                }
            };

            const removeDeleteRule = (index) => {
                SaForm.remove.splice(index, 1);
            };

            const toggleRuleSections = () => {
                showRuleSections.value = !showRuleSections.value;
            };

            const openFile = async () => {
                const result = await window.fileApi.openFile();
                if (!result.canceled) {
                    let editor = window['editor'];
                    editor.setValue(result.content);
                    filePath.value = result.filePath;
                    config.filePath = filePath.value;
                    document.title = `${t('edit')} - ${result.filePath}`;

                    config.form = JSON.parse(JSON.stringify(SaForm))

                    window.fileApi.saveConfig(config);
                    window.fileApi.saveConfig(config);
                }
            };

            const saveFile = async () => {
                let editor = window['editor'];
                const result = await window.fileApi.saveFile(filePath.value, editor.getValue());
                if (!result.canceled) {
                    filePath.value = result.filePath;

                    config.form = JSON.parse(JSON.stringify(SaForm))

                    window.fileApi.saveConfig(config);
                }
            };
            const addProductPair = function () {
                if (!product.newKey || !product.newValue) {
                    Dialogs.alert(t('error'), t('mana.product.config.error.value.null'));
                    return;
                }
                // SaForm.product[product.newKey]=product.newValue;
                SaForm.product[product.newKey.trim()] = product.newValue.trim();
            }
            const deleteProductPair = function (key) {

                delete SaForm.product[key]

            }
            return {
                t,
                product,
                SaForm,
                newHideRule,
                newDeleteRule,
                showRuleSections,
                launch,
                runScript,
                addHideRule,
                removeHideRule,
                addDeleteRule,
                removeDeleteRule,
                toggleRuleSections,
                openFile,
                saveFile,
                addProductPair,
                deleteProductPair,
                filePath
            };
        }
    }).mount('#app');
    window.app = app;
}
let initMonacoEditor = () => {
    monaco.languages.typescript.javascriptDefaults.addExtraLib(`${API.getComment()}`);
    let editorContainer = document.querySelector('.code-editor');
    let script = `
// ${i18n.t('code.tips')}
`

    if (config.form && config.form.script) {
        script = config.form.script;
    }

    const editor = monaco.editor.create(editorContainer, {
        value: script,
        language: 'javascript',
        theme: 'vs-dark'
    });
    window['editor'] = editor;
    window.addEventListener('resize', () => {
        editorContainer.style.height = (window.innerHeight - editorContainer.getBoundingClientRect().top - 20) + 'px';
        editor.layout();

    });
    const debouncedSave = Utils.debounce(saveContent, AUTO_SAVE_DELAY);
    editor.onDidChangeModelContent((event) => {
        const content = editor.getValue();
        debouncedSave(content);
    });

}
let initListeners = () => {
    window.fileApi.onMenuChangeLanguage(async () => {
        const languages = [{ name: 'English', code: 'en' },
        { name: "Français", code: "fr" },
        { name: '中文', code: 'zh' },
        { name: 'Tiếng Việt', code: 'vi' },
        { name: 'Tiếng Nhật', code: 'ja' },
        { code: "ru", name: "Русский" },
        { code: "es", name: "Español" },
        { code: 'in', name: 'Bahasa Indonesia' }];
        const result = await Dialogs.chooseLanguage(languages);
        if (result) {
            let code = result;
            console.log('Selected language code:', code);

            window.fileApi.updateLanguage(code).then(() => {
                i18n.changeLanguage(code).then(() => {
                    // app.$forceUpdate(); // Force Vue to re-render
                });
            }).catch(err => {
                console.error('Error updating language:', err);
            });
        }
    });
    window.fileApi.onMenuOpenFile(() => {
        app.openFile();
    });
    window.fileApi.onMenuSaveFile(() => {
        app.saveFile();
    });
    window.fileApi.onAbout(() => {
        Dialogs.openAbout('1.0.0');
    });
};
window.addEventListener('load', async () => {
    await initConfig();
    const name = await window.fileApi.getName();
    document.title = i18n.t('appTitle', { name });
    initApp();
    initMonacoEditor();
    initListeners();
});
console.log('👋 This message is being logged by "renderer.js", included via webpack');
