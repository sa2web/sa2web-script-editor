const { i18n } = require("./i18n.renderer");

class AlertDialog extends HTMLElement {
    static TAG = 'alert-dialog-999';
    shadow;
    closeButton;
    overlay;
    modal;

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'closed' });
        this.shadow.innerHTML = `
        <style>
            .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 99999999;
            display: none; 
            justify-content: center;
            align-items: center;
            }

            .dialog {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            width: 300px;
            z-index: 99999999;
            }

            .dialog-header {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
            }

            .dialog-content {
            margin-bottom: 15px;
            
            }

            .dialog-buttons {
            text-align: right;
            }

            button {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            background-color: #007bff;
            color: white;
            cursor: pointer;
            }

            button:hover {
            background-color: #0056b3;
            }
        </style>
        <div class="overlay" id="overlay">
            <div class="dialog">
            <div class="dialog-header">
                <slot name="title"></slot>
            </div>
            <div class="dialog-content">
                <slot></slot>
            </div>
            <div class="dialog-buttons">
                <button id="closeButton">${i18n.t('confirmLabel')}</button>
            </div>
            </div>
        </div>
        `;

        this.closeButton = this.shadow.querySelector('#closeButton');
        this.overlay = this.shadow.querySelector('#overlay');
    }

    init() {
        this.closeButton.addEventListener('click', () => {
            this.close();
        });
        if (!this.modal) {
            this.overlay.addEventListener('click', (event) => {
                if (event.target === this.overlay) {
                    this.close();
                }
            });
        }

    }

    open() {
        this.overlay.style.display = 'flex';
    }

    close() {
        this.overlay.style.display = 'none';
        this.dispatchEvent(new Event('close'));
    }
}

customElements.define(AlertDialog.TAG, AlertDialog);

class ConfirmDialog extends HTMLElement {
    static TAG = 'confirm-dialog-999';
    shadow;
    confirmButton;
    cancelButton;
    overlay;
    modal;
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'closed' });
        this.shadow.innerHTML = `
        <style>
           :host {
            font-size:14px;
           }
            .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 999999999;
            display: none;
            justify-content: center;
            align-items: center;
            }

            .dialog {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            width: 300px;
            z-index: 99999999;
            }

            .dialog-header {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
            }

            .dialog-content {
            margin-bottom: 15px;
            }

            .dialog-buttons {
            text-align: right;
            }

            button {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            background-color: #007bff;
            color: white;
            cursor: pointer;
            margin-left: 5px;
            }

            button:hover {
            background-color: #0056b3;
            }
        </style>
        <div class="overlay" id="overlay">
            <div class="dialog">
            <div class="dialog-header">
                <slot name="title"></slot>
            </div>
            <div class="dialog-content">
                <slot></slot>
            </div>
            <div class="dialog-buttons">
                <button id="cancelButton">${i18n.t('cancelLabel')}</button>
                <button id="confirmButton">${i18n.t('confirmLabel')}</button>
                
            </div>
            </div>
        </div>
        `;

        this.confirmButton = this.shadow.querySelector('#confirmButton');
        this.cancelButton = this.shadow.querySelector('#cancelButton');
        this.overlay = this.shadow.querySelector('#overlay');

    }
    init() {
        if (this.confirmButton) {
            this.confirmButton.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('confirm'));
                this.close();
            });
        }

        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('cancel'));
                this.close();
            });
        }

        if (!this.modal) {
            if (this.overlay) {
                this.overlay.addEventListener('click', (event) => {
                    if (event.target === this.overlay) {
                        this.dispatchEvent(new CustomEvent('cancel'));
                        this.close();
                    }
                });
            }
        }

    }
    open() {
        this.overlay.style.display = 'flex';
    }

    close() {
        this.overlay.style.display = 'none';
    }
}


customElements.define(ConfirmDialog.TAG, ConfirmDialog);
class ChooseLanguageDialog extends HTMLElement {
    static TAG = 'choose-language-dialog';
    shadow;
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.shadow.innerHTML = `
        <style>
           :host {
            font-size:14px;
           }
            .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 999999999;
            display: none;
            justify-content: center;
            align-items: center;
            }

            .dialog {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            width: 300px;
            z-index: 99999999;
            }

            .dialog-header {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
            }

            .dialog-content {
            margin-bottom: 15px;
            }

            .dialog-buttons {
            text-align: right;
            }

            button {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            background-color: #007bff;
            color: white;
            cursor: pointer;
            margin-left: 5px;
            }

            button:hover {
            background-color: #0056b3;
            }
            
        </style>
        <div class="overlay" id="overlay">
            <div class="dialog">
                <div class="dialog-header">
                    <slot name="title"></slot>
                </div>
                <div class="dialog-content">
                    <slot></slot>
                </div>
                <div class="dialog-buttons">
                    <button id="cancelButton">${i18n.t('cancelLabel')}</button>
                </div>
            </div>
        </div>
        `;

        this.confirmButton = this.shadow.querySelector('#confirmButton');
        this.cancelButton = this.shadow.querySelector('#cancelButton');
        this.overlay = this.shadow.querySelector('#overlay');
    }
    init() {

        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('cancel'));
                this.close();
            });
        }

        if (!this.modal) {
            if (this.overlay) {
                this.overlay.addEventListener('click', (event) => {
                    if (event.target === this.overlay) {
                        this.dispatchEvent(new CustomEvent('cancel'));
                        this.close();
                    }
                });
            }
        }

    }
    open() {
        this.overlay.style.display = 'flex';
    }

    close() {
        this.overlay.style.display = 'none';
    }
}
customElements.define(ChooseLanguageDialog.TAG, ChooseLanguageDialog);

class AboutDialog extends HTMLElement {
    static TAG = 'about-dialog';
    shadow;
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.shadow.innerHTML = `
        <style>
        :host {
            font-size:14px;
           }
            .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 99999999;
            display: none;
            justify-content: center;
            align-items: center;
            }

            .dialog {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            width: 400px;
            z-index: 99999999;
            }

            .dialog-header {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
            }

            .dialog-content {
            margin-bottom: 15px;
            }

            .dialog-buttons {
            text-align: right;
            }

            button {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            background-color: #007bff;
            color: white;
            cursor: pointer;
            margin-left: 5px;
            }

            button:hover {
            background-color: #0056b3;
            }
            
        </style>
        <div class="overlay" id="overlay">
            <div class="dialog">
                <div class="dialog-header">
                    <slot name="title"></slot>
                </div>
                <div class="dialog-content">
                    <slot></slot>
                </div>
                <div class="dialog-buttons">
                    <button id="confirmButton">${i18n.t('confirmLabel')}</button>
                </div>
            </div>
        </div>
        `;
        this.overlay = this.shadow.querySelector('#overlay');
        this.confirmButton = this.shadow.querySelector('#confirmButton');
    }
    init() {
        if (this.confirmButton) {
            this.confirmButton.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('confirm'));
                this.close();
            });
        }
    }
    open() {
        this.overlay.style.display = 'flex';
    }

    close() {
        this.overlay.style.display = 'none';
    }
}
customElements.define(AboutDialog.TAG, AboutDialog);

export class Dialogs {
    static async alert(title, message, modal = true, timeout = 0) {
        if (!document.body) {
            return;
        }
        const dialog = document.createElement(AlertDialog.TAG);

        const titleElement = document.createElement('div');
        titleElement.setAttribute('slot', 'title');
        titleElement.textContent = title;
        dialog.appendChild(titleElement);
        const content = document.createElement('div');
        //ellipsis
        content.style.textOverflow = 'ellipsis';
        content.style.overflow = 'hidden';
        content.textContent = message;
        dialog.appendChild(content);
        dialog.modal = modal;
        document.body.appendChild(dialog);
        dialog.init();
        dialog.open();

        return new Promise((resolve) => {
            let dialogTimeout;
            if (timeout > 0) {
                dialogTimeout = setTimeout(() => {
                    document.body.removeChild(dialog);
                    resolve();
                }, timeout);
            }
            dialog.addEventListener('close', () => {
                document.body.removeChild(dialog);
                if (dialogTimeout) {
                    clearTimeout(dialogTimeout);
                }
                resolve();
            });
        });
    }

    static async confirm(title, message, modal = true, timeout = 0) {
        if (!document.body) {
            return false;
        }
        const dialog = document.createElement(ConfirmDialog.TAG);

        const titleElement = document.createElement('div');
        titleElement.setAttribute('slot', 'title');
        titleElement.textContent = title;
        dialog.appendChild(titleElement);
        const content = document.createElement('div');
        content.style.textOverflow = 'ellipsis';
        content.style.overflow = 'hidden';
        content.textContent = message;
        dialog.appendChild(content);
        dialog.modal = modal;
        document.body.appendChild(dialog);
        dialog.init();
        dialog.open();

        return new Promise((resolve) => {
            let dialogTimeout;
            if (timeout > 0) {
                dialogTimeout = setTimeout(() => {
                    document.body.removeChild(dialog);
                    resolve(false);
                }, timeout);
            }
            dialog.addEventListener('confirm', () => {
                document.body.removeChild(dialog);
                if (dialogTimeout) {
                    clearTimeout(dialogTimeout);
                }
                resolve(true);
            });
            dialog.addEventListener('cancel', () => {
                document.body.removeChild(dialog);
                if (dialogTimeout) {
                    clearTimeout(dialogTimeout);
                }
                resolve(false);
            });
        });
    }
    static async chooseLanguage(languages, modal = true) {
        if (!document.body) {
            return null;
        }
        const dialog = document.createElement(ChooseLanguageDialog.TAG);

        const titleElement = document.createElement('div');
        titleElement.setAttribute('slot', 'title');
        titleElement.textContent = i18n.t('menuChangeLanguage');
        dialog.appendChild(titleElement);

        const content = document.createElement('div');
        languages.forEach(lang => {
            const button = document.createElement('button');
            button.textContent = lang.name;
            button.setAttribute('class', 'language-button');
            button.addEventListener('click', () => {
                dialog.dispatchEvent(new CustomEvent('languageSelected', { detail: lang.code }));
                dialog.close();
            });
            content.appendChild(button);
        });

        dialog.appendChild(content);
        dialog.modal = modal;
        document.body.appendChild(dialog);
        dialog.init();
        dialog.open();

        return new Promise((resolve) => {
            dialog.addEventListener('languageSelected', (event) => {
                resolve(event.detail);
            });
            dialog.addEventListener('cancel', () => {
                resolve(null);
            });
        });
    }
    static async openAbout(version) {
        if (!document.body) {
            return null;
        }
        const dialog = document.createElement(AboutDialog.TAG);

        const titleElement = document.createElement('div');
        titleElement.setAttribute('slot', 'title');
        titleElement.textContent = i18n.t('menuAbout');
        dialog.appendChild(titleElement);

        const content = document.createElement('div');
        content.style.textOverflow = 'ellipsis';
        content.style.overflow = 'hidden';
        const name = await window.fileApi.getName();
        content.innerHTML = `<center><h2>${i18n.t('appTitle', { name: name })}</h2><br>${version}<br></center>`
        dialog.appendChild(content);
        dialog.modal = true;
        document.body.appendChild(dialog);
        dialog.init();
        dialog.open();

        return new Promise((resolve) => {
            dialog.addEventListener('close', () => {
                document.body.removeChild(dialog);
                resolve();
            });
        });
    }

}