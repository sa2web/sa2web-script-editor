
const { contextBridge, ipcRenderer, webFrame } = require('electron');
const { UserDataService } = require('./userData');
const { Utils } = require('./utils');
const { Logger } = require('./logger');
const { AjaxDataService } = require('./AjaxData');
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


let proccessAddedNode = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'iframe') {
        try {
            let iframeWindow = node.contentWindow;
            if (iframeWindow) {
                // Initialize API for the iframe window
                // initMutationObserver(iframeWindow);
                initWindow(iframeWindow);
            }
        } catch (e) {
            logger.error('Error accessing iframe contentWindow:', e);
        }
    }
    // If the node has child nodes, recursively process them
    if (node.childNodes && node.childNodes.length > 0) {
        node.childNodes.forEach(childNode => {
            proccessAddedNode(childNode);
        });
    }
}
let handlePageControls = (win) => {
    // Handle page controls for the given window

    if (!saForm) return;
    // Remove elements
    saForm.remove.forEach(selector => {
        let elements = Utils.findElements(win.document, selector, true);
        elements.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            } else {

                logger.warn('Element not found in parent:', el);
            }
        });
    });
    // Hide elements
    saForm.hide.forEach(selector => {
        let elements = Utils.findElements(win.document, selector, true);
        elements.forEach(el => {
            if (el.style.display !== 'none') {
                el.setAttribute('__ignore__', 'true');
                el.style.display = 'none';
            }
        });
    });
}
let handleScripts = (win) => {
    if (!saForm || !saForm.script) return;
    if (!saForm.scriptSelector) {
        return;
    }
    if(!saForm.isPage && !saForm.isSSE ) {
        return;
    }
    let matchEle = Utils.findElement(win.document, saForm.scriptSelector);
    if (!matchEle) {
        return;
    }
    if (matchEle['__script__']) {
        return;
    }
    matchEle['__script__'] = true;
    webFrame.executeJavaScriptInIsolatedWorld(999, [{
        code: '(async()=>{' + saForm.script + '})()'
    }], true, (result, err) => {
        if (err) {
            logger.error(`error: ,script: ${script.name},${script.url},${script.selector}`, err);
        }
    });

}
let initMutationObserver = (win) => {
    if (win.document['__observer__']) return;
    let doc = win.document;
    handleScripts(win);
    handlePageControls(win);
    // Initialize the mutation observer to watch for changes in the DOM
    const observer = new MutationObserver(mutations => {
        handleScripts(win);
        handlePageControls(win);
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    proccessAddedNode(node);
                });
            }
        });
    });
    win.document['__observer__'] = observer;
    // Start observing the document body for child nodes
    observer.observe(doc, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true
    });
}
let initUserScriptApis = (win) => {
    let createMutationObserverImpl = (ele, bindStr, childList, subtree, attributes, characterData, fn) => {
        if (ele[bindStr]) {
            return ele[bindStr];
        }
        let mutationObserver = new MutationObserver((list) => {
            requestAnimationFrame(() => {
                fn(list);
            })

        });
        mutationObserver.observe(ele, {
            childList: childList,
            subtree: subtree,
            attributes: attributes,
            characterData: characterData
        });
        ele[bindStr] = mutationObserver;
        return mutationObserver;
    }
    let removeDirectionFromSelector = (selector) => {
        if (selector.endsWith(':right')) {
            selector = selector.slice(0, selector.length - ':right'.length);
        }
        if (selector.endsWith(':left')) {
            selector = selector.slice(0, selector.length - ':left'.length);
        }
        if (selector.endsWith(':top')) {
            selector = selector.slice(0, selector.length - ':top'.length);
        }
        if (selector.endsWith(':bottom')) {
            selector = selector.slice(0, selector.length - ':bottom'.length);
        }
        return selector;
    }
    class NodeTreeMutationObserver {
        mutationObserver = null;
        list = [];
        constructor() {
            this.mutationObserver = createMutationObserverImpl(document.body, '__nodeTree__', true, true, false, false, (mutations) => {

                this.list.forEach(item => {
                    //   let querySelector=removeDirectionFromSelector(item.querySelector);
                    let ele = api.dom.querySelector(document, removeDirectionFromSelector(item.querySelector));
                    if (ele) {
                        if (!item.isConnected) {
                            item.isConnected = true;
                            logger.warn(`nodeTreeMutationObserver is emerged:${item.querySelector}`)
                            item.callback(item.isConnected);
                        }
                    } else {
                        if (item.isConnected) {
                            item.isConnected = false;
                            logger.warn(`nodeTreeMutationObserver is disappeared:${item.querySelector}`)
                            item.callback(item.isConnected);
                        }
                    }
                })
            })
        }
        addItem(item) {
            item.isConnected = !!api.dom.querySelector(document, removeDirectionFromSelector(item.querySelector));
            let theItem = this.list.find(entry => entry.querySelector == item.querySelector);
            if (!theItem) {
                this.list.push(item);
            } else {
                theItem.callback = item.callback;
            }
        }
    }

    let internalMutationObserver = null;

    let api = {
        user: new UserDataService(),
        http: new AjaxDataService(),
        config: saForm.product || {},
        dom: {
            createMutationObserver: (ele, bindStr, childList, subtree, attributes, characterData, fn) => {
                return createMutationObserverImpl(ele, bindStr, childList, subtree, attributes, characterData, fn);
            },
            isVisible: async (ele) => {
                return Utils.isVisible(ele);
            },
            getVisibleRect: async (ele) => {
                return Utils.getVisibleRect(ele);
            },
            querySelectorAll: (doc, cssOrXPathSelector) => {
                return Utils.findElements(doc, cssOrXPathSelector, false);
            },
            querySelector: (doc, cssOrXPathSelector) => {
                let arr = Utils.findElements(doc, cssOrXPathSelector, false);
                if (arr && arr.length > 0) {
                    return arr[0]
                }
                return null;
            },
            getConnectListeners: () => {
                return internalMutationObserver.list;
            },
            addConnectListener: (cssOrXPathSelector, callback) => {
                if (!internalMutationObserver) {
                    internalMutationObserver = new NodeTreeMutationObserver();
                }
                if (!!api.dom.querySelector(document, removeDirectionFromSelector(cssOrXPathSelector))) {
                    if (callback) {
                        callback(true);
                    }
                }
                internalMutationObserver.addItem({
                    querySelector: cssOrXPathSelector,
                    callback,
                    isConnected: false,
                });
            },
            removeConnectListener: (cssOrXPathSelectors) => {
                if (internalMutationObserver) {
                    internalMutationObserver.list.slice().forEach(item => {
                        if (cssOrXPathSelectors.includes(item.querySelector)) {
                            internalMutationObserver.list.splice(internalMutationObserver.list.indexOf(item), 1);
                        }
                    })
                }
            },
            addResizeListener: (cssOrXPathSelector, bindWindowStr, callback, createObserver = true, delayTime = 500) => {
                if (createObserver && !internalMutationObserver) {
                    internalMutationObserver = new NodeTreeMutationObserver();
                }

                let updateRect = () => {
                    let ele = api.dom.querySelector(document, cssOrXPathSelector);
                    if (ele) {
                        let rect = ele.getBoundingClientRect();
                        if (callback) {
                            callback(rect);
                        }
                        if (!(window)[bindWindowStr]) {
                            (window)[bindWindowStr] = new ResizeObserver((entries) => {
                                setTimeout(() => {
                                    updateRect();
                                }, 0);

                            });
                            (window)[bindWindowStr].observe(ele);
                        }
                    } else {
                        if (callback) {
                            callback(new DOMRect(0, 0, 0, 0));
                        }
                        if ((window)[bindWindowStr]) {
                            (window)[bindWindowStr].disconnect();
                        }
                        delete (window)[bindWindowStr];
                    }
                }

                if (createObserver) {
                    api.dom.addConnectListener(
                        cssOrXPathSelector, (isConnected) => {
                            setTimeout(() => {
                                updateRect();
                            }, delayTime)
                        })
                }

                if (window[bindWindowStr]) {
                    return window[bindWindowStr];
                }
                let syncResize = () => {
                    updateRect();
                }
                syncResize();
                window.addEventListener('resize', syncResize);
                window.addEventListener('scroll', syncResize);
                return syncResize;
            },
            createOverlayBy: (cssOrXPathSelector, bindWindowStr, createObserver = true, delayTime = 500, fn = () => { }) => {
                if ((window)[bindWindowStr]) {
                    if (createObserver && !internalMutationObserver) {
                        internalMutationObserver = new NodeTreeMutationObserver();
                    }
                    let overlay = (window)[bindWindowStr];
                    if ((overlay)['observeItems']) {
                        (overlay)['observeItems'].forEach((item) => {
                            item.callback.call(this, !!api.dom.querySelector(window.document, removeDirectionFromSelector(item.querySelector)));
                            api.dom.addConnectListener(item.querySelector, item.callback);
                        });
                    }
                    return overlay;
                }

                let overlay = window.document.createElement('div');
                overlay.style.position = 'fixed';
                window.document.documentElement.appendChild(overlay);
                window[bindWindowStr] = overlay;

                let updateRect = async () => {
                    let ele = api.dom.querySelector(window.document, cssOrXPathSelector);
                    if (ele) {
                        let rect = await api.dom.getVisibleRect(ele);
                        if (fn) {
                            fn(rect);
                        }
                        overlay.style.top = rect.top + 'px';
                        overlay.style.left = rect.left + 'px';
                        overlay.style.width = rect.width + 'px';
                        overlay.style.height = rect.height + 'px';
                        if (!(overlay['resizeObserver']) || overlay['resizeObserver'].ele != ele) {
                            overlay['resizeObserver'] = {
                                observer: new ResizeObserver((entries) => {
                                    setTimeout(() => {
                                        updateRect();
                                    }, 0);
                                }),
                                ele: ele
                            };
                            overlay['resizeObserver'].observer.observe(ele);
                        }
                    } else {
                        overlay.style.width = '0px';
                        overlay.style.height = '0px';
                        if ((overlay)['resizeObserver']) {
                            (overlay)['resizeObserver'].observer.disconnect();
                        }
                        delete (overlay)['resizeObserver']
                    }
                }
                if (createObserver) {
                    if (!internalMutationObserver) {
                        internalMutationObserver = new NodeTreeMutationObserver();
                    }
                    const item = {
                        querySelector: cssOrXPathSelector,
                        isConnected: false,
                        callback: (isConnected) => {
                            setTimeout(() => {
                                updateRect();
                            }, delayTime)
                        }
                    }
                    internalMutationObserver.addItem(item)
                }

                let syncOverlay = () => {
                    if (!overlay.isConnected) {
                        window.removeEventListener('resize', syncOverlay);
                        window.removeEventListener('scroll', syncOverlay);
                        if (overlay['resizeObserver']) {
                            overlay['resizeObserver'].observer.disconnect();
                            delete overlay['resizeObserver'];
                        }
                        return;
                    }
                    updateRect();
                }

                syncOverlay();
                window.addEventListener('resize', () => {
                    syncOverlay();
                });
                window.addEventListener('scroll', () => {
                    syncOverlay();
                });
                return overlay;
            },
            createOverlayByBorder: (bindWindowStr, top, right, bottom, left, createObserver = true, delayTime = 500) => {
                let orginTop = top;
                let orginRight = right;
                let orginBottom = bottom;
                let orginLeft = left;
                let rightBorder = 'left';
                if (typeof right === 'string') {
                    if (right.endsWith(':right')) {
                        rightBorder = 'right';
                        right = right.slice(0, right.length - ':right'.length);
                     }else if(right.endsWith(':left')){
                        right = right.slice(0, right.length - ':left'.length);
                    }
                }
                let leftBorder = 'right';
                if (typeof left === 'string') {
                    if (left.endsWith(':left')) {
                        leftBorder = 'left';
                        left = left.slice(0, left.length - ':left'.length);
                    } else if (left.endsWith(':right')) {
                        left = left.slice(0, left.length - ':right'.length);
                    }
                }
                let topBorder = 'bottom';
                if (typeof top === 'string') {
                    if (top.endsWith(':top')) {
                        topBorder = 'top';
                        top = top.slice(0, top.length - ':top'.length);
                    } else if (top.endsWith(':bottom')) {
                        topBorder = 'bottom';
                        top = top.slice(0, top.length - ':bottom'.length);
                    }
                }
                let bottomBorder = 'top';
                if (typeof bottom === 'string') {
                    if (bottom.endsWith(':bottom')) {
                        bottomBorder = 'bottom';
                        bottom = bottom.slice(0, bottom.length - ':bottom'.length);
                    } else if (bottom.endsWith(':top')) {
                        bottomBorder = 'top';
                        bottom = bottom.slice(0, bottom.length - ':top'.length);
                    }
                }
                if ((window)[bindWindowStr]) {
                    if (createObserver && !internalMutationObserver) {
                        internalMutationObserver = new NodeTreeMutationObserver();

                    }
                    let overlay = (window)[bindWindowStr];
                    if ((overlay)['observeItems']) {
                        (overlay)['observeItems'].forEach((item) => {
                            item.callback.call(this, !!api.dom.querySelector(window.document, removeDirectionFromSelector(item.querySelector)));
                            api.dom.addConnectListener(item.querySelector, item.callback);
                        });
                    }
                    return overlay;
                }
                logger.info("createOverlay2");
                let overlay = window.document.createElement('div');
                overlay.style.position = 'fixed';
                window.document.documentElement.appendChild(overlay);
                (window)[bindWindowStr] = overlay;

                let updateHeight = async () => {
                    if (typeof top === 'number') {
                        overlay.style.top = top + 'px';
                    } else {
                        let ret = api.dom.querySelector(window.document, top);
                        if (ret) {
                            let topRect = await api.dom.getVisibleRect(ret);
                            if (topBorder == 'bottom') {
                                overlay.style.top = topRect.bottom + 'px';
                            } else {
                                overlay.style.top = topRect.top + 'px';
                            }
                            if (!((overlay)['topEleObserver']) || ((overlay)['topEleObserver'])['ele'] != ret) {
                                (overlay)['topEleObserver'] = {
                                    observer: new ResizeObserver((entries) => {
                                        setTimeout(() => {
                                            updateHeight();
                                        }, 0);
                                    }),
                                    ele: ret
                                };
                                (overlay)['topEleObserver'].observer.observe(ret);
                            }
                        } else {
                            overlay.style.height = '0px';
                            if ((overlay)['topEleObserver']) {
                                (overlay)['topEleObserver'].observer.disconnect();
                            }
                            delete (overlay)['topEleObserver']
                        }
                    }
                    if (typeof bottom === 'number') {
                        overlay.style.bottom = bottom + 'px';
                    } else {
                        let ret = api.dom.querySelector(window.document, bottom);
                        if (ret) {
                            let height = 0;
                            if (!(await api.dom.isVisible(ret))) {

                            } else {
                                let bottomRect = await api.dom.getVisibleRect(ret);

                                if (bottomBorder == 'bottom') {
                                    height = bottomRect.bottom - overlay.getBoundingClientRect().top;
                                } else {
                                    height = bottomRect.top - overlay.getBoundingClientRect().top;
                                }
                            }

                            overlay.style.height = height + 'px';
                            if (!((overlay)['bottomEleObserver']) || ((overlay)['bottomEleObserver'])['ele'] != ret) {
                                (overlay)['bottomEleObserver'] = {
                                    observer: new ResizeObserver((entries) => {
                                        updateHeight();
                                    }),
                                    ele: ret
                                };
                                (overlay)['bottomEleObserver'].observer.observe(ret);
                            }
                        } else {
                            overlay.style.height = '0px';
                            if ((overlay)['bottomEleObserver']) {
                                (overlay)['bottomEleObserver'].observer.disconnect();
                            }
                            delete (overlay)['bottomEleObserver']
                        }
                    }
                }
                let updateWidth = async () => {
                    if (typeof left === 'number') {
                        overlay.style.left = left + 'px';
                    } else {
                        let ret = api.dom.querySelector(window.document, left);
                        if (ret) {

                            let leftRect = await api.dom.getVisibleRect(ret);
                            if (leftBorder == 'left') {
                                overlay.style.left = leftRect.left + 'px';
                            } else {
                                overlay.style.left = leftRect.right + 'px';
                            }
                            if (!((overlay)['leftEleObserver']) || ((overlay)['leftEleObserver'])['ele'] != ret) {
                                let observer = new ResizeObserver((entries) => {
                                    updateWidth();
                                });
                                (overlay)['leftEleObserver'] = { observer, ele: ret }
                                observer.observe(ret);
                            }
                        } else {
                            overlay.style.width = '0px';
                            if ((overlay)['leftEleObserver']) {
                                (overlay)['leftEleObserver'].observer.disconnect();
                            }
                            delete (overlay)['leftEleObserver']
                        }
                    }
                    if (typeof right === 'number') {
                        overlay.style.right = right + 'px';
                    } else {
                        let ret = api.dom.querySelector(window.document, right);
                        if (ret) {
                            let width = 0;
                            if (!(await api.dom.isVisible(ret))) {

                            } else {
                                let rightRect = await api.dom.getVisibleRect(ret);

                                if (rightBorder == 'right') {
                                    width = rightRect.right - overlay.getBoundingClientRect().left;
                                } else {
                                    width = rightRect.left - overlay.getBoundingClientRect().left;
                                }
                            }
                            overlay.style.width = width + 'px';
                            if (!((overlay)['rightEleObserver']) || ((overlay)['rightEleObserver'])['ele'] != ret) {
                                (overlay)['rightEleObserver'] = {
                                    observer: new ResizeObserver((entries) => {
                                        updateWidth();
                                    }),
                                    ele: ret
                                };
                                (overlay)['rightEleObserver'].observer.observe(ret);
                            }
                        } else {
                            overlay.style.width = '0px';
                            if ((overlay)['rightEleObserver']) {
                                (overlay)['rightEleObserver'].observer.disconnect();
                            }
                            delete (overlay)['rightEleObserver']
                        }
                    }
                }
                if (createObserver) {
                    if (!internalMutationObserver) {
                        internalMutationObserver = new NodeTreeMutationObserver();

                    }
                    let observeItems = [];
                    if (typeof orginTop == 'string') {
                        let item = {
                            querySelector: orginTop, isConnected: false, callback: (isConnected) => {
                                setTimeout(() => {
                                    updateHeight();
                                }, delayTime);

                            }
                        };
                        observeItems.push(item);
                        internalMutationObserver.addItem(item);
                    }
                    if (typeof orginBottom == 'string') {
                        let item = {
                            querySelector: orginBottom, isConnected: false, callback: (isConnected) => {
                                setTimeout(() => {
                                    updateHeight();
                                }, delayTime);
                            }
                        };
                        observeItems.push(item);
                        internalMutationObserver.addItem(item);
                    }
                    if (typeof orginRight == 'string') {
                        let item = {
                            querySelector: orginRight, isConnected: false, callback: (isConnected) => {
                                setTimeout(() => {
                                    updateWidth();
                                }, delayTime);
                            }
                        };
                        observeItems.push(item);
                        internalMutationObserver.addItem(item);
                    }
                    if (typeof orginLeft == 'string') {
                        let item = {
                            querySelector: orginLeft, isConnected: false, callback: (isConnected) => {
                                setTimeout(() => {
                                    updateWidth();
                                }, delayTime);
                            }
                        };
                        observeItems.push(item);
                        internalMutationObserver.addItem(item);
                    }
                    (overlay)['observeItems'] = observeItems;
                }
                let syncOverlay = () => {
                    if (!overlay.isConnected) {
                        window.removeEventListener('resize', syncOverlay);
                        window.removeEventListener('scroll', syncOverlay);
                        if ((overlay)['topEleObserver']) {
                            (overlay)['topEleObserver'].observer.disconnect();
                            delete (overlay)['topEleObserver']
                        }
                        if ((overlay)['rightEleObserver']) {
                            (overlay)['rightEleObserver'].observer.disconnect();
                            delete (overlay)['rightEleObserver']
                        }
                        if ((overlay)['bottomEleObserver']) {
                            (overlay)['bottomEleObserver'].observer.disconnect();
                            delete (overlay)['bottomEleObserver']
                        }
                        if ((overlay)['leftEleObserver']) {
                            (overlay)['leftEleObserver'].observer.disconnect();
                            delete (overlay)['leftEleObserver']
                        }

                        return;
                    }
                    if (typeof top === 'number') {
                        overlay.style.top = top + 'px';
                    } else {
                        updateHeight();
                    }
                    if (typeof right === 'number') {
                        overlay.style.right = right + 'px';
                    } else {
                        updateWidth();
                    }
                    if (typeof bottom === 'number') {
                        overlay.style.bottom = bottom + 'px';
                    } else {
                        updateHeight();

                    }
                    if (typeof left === 'number') {
                        overlay.style.left = left + 'px';
                    } else {
                        updateWidth();
                    }
                }
                syncOverlay();
                window.addEventListener('resize', () => {
                    syncOverlay();
                });
                window.addEventListener('scroll', () => {
                    syncOverlay();
                });

                return overlay;
            }
        },
        utils: {
            wait: (fn, timeoutMs, intervalMs = 100) => {
                const start = Date.now();
                return new Promise((resolve, reject) => {
                    function check() {
                        try {
                            if (fn()) {
                                return resolve();
                            }
                            if (Date.now() - start >= timeoutMs) {
                                return reject(new Error("Timeout: function did not return true in time."));
                            }
                            setTimeout(check, intervalMs);
                        } catch (err) {
                            return reject(err);
                        }
                    }
                    check();
                });
            },
            runScript: (code, callback) => {
                return webFrame.executeJavaScript(code, true, callback);
            }
        },
        header: async (headerName, isRequestHeader) => {
            const headerValue = await ipcRenderer.invoke('getHeader', headerName, isRequestHeader);
            if (isRequestHeader) {
                return headerValue;
            } else {
                return JSON.parse(headerValue);
            }
        }
    };

    win.api = api;
}
let initWindow = (win, tries = 0) => {
    const jsonData = JSON.stringify(JSON.stringify(saForm));


    webFrame.executeJavaScript(`(async()=>{
        let saForm=JSON.parse(${jsonData});
    function newUuid(){
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }
        
    function checkUrl(matchExpr,url){
        url=new URL(url,document.baseURI).href;
        if(matchExpr==='*'){
            return true;
        }
        else if(matchExpr.startsWith('regex:')){
            return new RegExp(matchExpr.substring('regex:'.length)).test(url);
        }else if(matchExpr.startsWith('exact:')){
            return matchExpr.substring('exact:'.length)==url;
        }else if(matchExpr.startsWith('script:')){
            let func=new Function('url','return ('+matchExpr.substring('script:'.length)+')');
            return func(url);
        }else if(url.startsWith(matchExpr)){
            return true;
        }
        return false;
    }
    let msgMap=new Map();
    window.addEventListener('message',(event)=>{
        let data=event.data;
        if(data.type=='doReplySSE'){
            let item=msgMap.get(data.mid);
            if(item){
                item.resolve(data.data);
            }
        }
    });
    postIpcMessage= async (type,data)=>{
        let mid=newUuid();
        data.mid=mid;
        data.type=type;
        return new Promise((resolve,reject)=>{
            msgMap.set(mid,{resolve,reject});
            window.postMessage(data,'*');
        });
    }
        if(saForm && saForm.urlchangeEvent){
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            if(window==window.top){
                function fireUrlChangeEvent(oldUrl,newUrl) {
                    const event = new CustomEvent('urlchange', {
                        detail: {
                            oldUrl: oldUrl,
                            url: newUrl
                        }
                    });
                    window.top.dispatchEvent(event);
                }
        
                history.pushState = function(...args) {
                    let oldUrl=location.href;
                    originalPushState.apply(this, args);
                    fireUrlChangeEvent(oldUrl,location.href);
                };
                history.replaceState = function(...args) {
                    let oldUrl=location.href;
                    originalReplaceState.apply(this, args);
                    fireUrlChangeEvent(oldUrl,location.href);
                };
                window.addEventListener('popstate', ()=>{
                    fireUrlChangeEvent(null,location.href);
                });
            }
        }


        const OriginalEventSource = window.EventSource;
    const eventTypes = ['open', 'message', 'error'];

    window.EventSource = new Proxy(OriginalEventSource, {
        construct(Target, args) {
            const url = args[0];
            const rawEs = new Target(...args);
            const wrappedListeners = {};

            function wrapListener(type, originalFn) {
                return async function (event) {
                    if (type === 'message') {
                        console.log('[proxyed message] origin data:', event.data);

                        let isMatchUrl=false;
                        if(saForm && saForm.matchUrl && !saForm.isPage && saForm.isSSE && checkUrl(saForm.matchUrl,url)){
                            isMatchUrl=true;
                        }
                        if(!isMatchUrl){
                            originalFn.call(this, event);
                            return;
                        }
                        let result=await postIpcMessage('doSSE',{data:event.data,url:url});
                        
                        let newData = result;
                        const newEvent = new MessageEvent('message', {
                            data: newData,
                            origin: event.origin,
                            lastEventId: event.lastEventId,
                            source: event.source,
                        });

                        return originalFn.call(this, newEvent);
                    } else {
                        return originalFn.call(this, event);
                    }
                };
            }

            const proxy = new Proxy(rawEs, {
                get(target, prop) {
                    if (prop === 'addEventListener') {
                        return function (type, fn, options) {
                            if (eventTypes.includes(type)) {
                                const wrapped = wrapListener(type, fn);
                                wrappedListeners[type] = wrappedListeners[type] || [];
                                wrappedListeners[type].push({ original: fn, wrapped });
                                return target.addEventListener(type, wrapped, options);
                            }
                            return target.addEventListener(type, fn, options);
                        };
                    }

                    if (prop === 'removeEventListener') {
                        return function (type, fn, options) {
                            const match = (wrappedListeners[type] || []).find(e => e.original === fn);
                            if (match) {
                                return target.removeEventListener(type, match.wrapped, options);
                            }
                            return target.removeEventListener(type, fn, options);
                        };
                    }

                    if (prop.startsWith('on') && eventTypes.includes(prop.substring(2))) {
                        return target['__wrapped_'+prop] || null;
                    }
                    if (prop === 'close') {
                        return () => {
                            target.close();
                        };
                    }

                    return Reflect.get(target, prop);
                },

                set(target, prop, value) {
                    if (prop.startsWith('on') && eventTypes.includes(prop.substring(2))) {
                        const type = prop.substring(2);
                        if (target['__wrapped_'+prop]) {
                            target.removeEventListener(type, target['__wrapped_'+prop]);
                        }
                        const wrapped = wrapListener(type, value);
                        target['__wrapped_'+prop] = wrapped;
                        target.addEventListener(type, wrapped);
                        return true;
                    }

                    return Reflect.set(target, prop, value);
                }
            });

            return proxy;
        }
    });

const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch(...args);
  
  const isSSE = response.headers.get('Content-Type')?.includes('text/event-stream');
  let isMatchUrl=false;
  if(saForm && saForm.matchUrl && !saForm.isPage && saForm.isSSE && checkUrl(saForm.matchUrl,response.url)){
    isMatchUrl=true;
  }
  if (isSSE && response.body && response.body.getReader && isMatchUrl) {
    const reader = response.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value);
          let result=await postIpcMessage('doSSE',{data:chunkText,url:response.url});
          const modifiedText = result;
          controller.enqueue(encoder.encode(modifiedText));
        }
        controller.close();
      }
    });

    return new Response(stream, response);
  }

  return response;
};
            })();
        `, true, (result, error) => {
        if (error) {
            logger.error(error);
        }

    });
    initUserScriptApis(win);
    try {
        if (!win.document || !win.document.body || win.document.documentElement.outerHTML.trim() == '<html><head></head><body></body></html>') {
            if (tries < 20) {
                setTimeout(() => {
                    tries++;
                    initWindow(win, tries);
                }, 200);
                return;
            }
        }
    } catch (err) {
        return;
    }
    win.addEventListener('message', async (event) => {
        let data = event.data;
        if (data.type == 'doSSE') {
            let mid = data.mid;
            let text = data.data;
            let func = new Function('data', 'return (async(data)=>{' + saForm.script + '})(data)');
            let ret = await func(text);
            console.log(ret);
            win.postMessage({ type: 'doReplySSE', mid, data: ret }, '*');
        }
    });
    initMutationObserver(win);
}

ipcRenderer.invoke('getSaForm').then(form => {

    if (!form) {
        logger.error('Form not found. Please ensure the form is correctly initialized.');
        return;
    }
    saForm = form;
    logger.info('Form fetched successfully:', form);
    initWindow(window);

}).catch(err => {
    logger.error('Error fetching form:', err);
});

