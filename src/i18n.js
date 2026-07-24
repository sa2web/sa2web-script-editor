import i18next from "i18next";
import path from "path";
import backendModule from 'i18next-fs-backend';
let FsBackend = backendModule.default || backendModule;

class I18n {
    i18n = null;
    lang = 'en';
    baseUrl = '';

    constructor() {
        // this.init();
    }

    async init() {
        if (this.i18n) return this.i18n;
        i18next
            .use(FsBackend)
            .init({
                fallbackLng: "en",
                debug: false,
                backend: {
                    loadPath: path.join(__dirname, '../renderer/locales/messages_{{lng}}.json')
                },
                interpolation: { escapeValue: false }
            });

        this.i18n = i18next;
        await this.i18n.changeLanguage(this.lang)
        return this.i18n;
    }
    t(key, options) {

        return this.i18n.t(key, options);
    }

    async changeLanguage(lang) {
        if (!this.i18n) {
            await this.init();
        }
        this.lang = lang;
        if (this.i18n) {
            await this.i18n.changeLanguage(lang);
        }
    }
}
export const i18n = new I18n();