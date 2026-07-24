import i18next from "i18next";
import HttpBackend from 'i18next-http-backend';


class I18n {
    i18n = null;
    lang = 'en';
    baseUrl = '';

    constructor() {
    }

    async init() {
        if (this.i18n) return this.i18n;
        this.baseUrl = window.location.href.replace(/\/[^/]*$/, '/');
        i18next
            .use(HttpBackend)
            .init({
                fallbackLng: "en",
                debug: false,
                backend: {
                    loadPath: `${this.baseUrl}../locales/messages_{{lng}}.json`
                },
                interpolation: { escapeValue: false }
            });

        this.i18n = i18next;
        await this.i18n.changeLanguage(this.lang)
        return this.i18n;
    }
    t(key, options) {
        if (!this.i18n) {
            this.init();
        }
        return this.i18n.t(key, options);
    }

    async changeLanguage(lang) {
        this.lang = lang;
        if (this.i18n) {
            await this.i18n.changeLanguage(lang);
        }
    }
}
export const i18n = new I18n();