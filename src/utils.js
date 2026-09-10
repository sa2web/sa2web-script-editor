export class Utils {
    static selectorCache = new Map();
    static async isVisible(node) {
        if (!node || !node.isConnected) {
            return false;
        }
        if (node.nodeType != Node.ELEMENT_NODE && node.parentElement) {
            node = node.parentElement;
        }
        return new Promise(resolve => {
            const interObserver = new IntersectionObserver(entries => {
                const entry = entries[0];
                interObserver.disconnect();
                resolve(entry.isIntersecting);
            });
            interObserver.observe(node);
        });
    }
    static async getVisibleRect(node) {
        if (!node || !node.isConnected) {
            return new DOMRectReadOnly(0, 0, 0, 0);
        }
        return new Promise(resolve => {
            const interObserver = new IntersectionObserver(entries => {
                const entry = entries[0];
                interObserver.disconnect();
                resolve(entry.intersectionRect);
            });
            interObserver.observe(node);
        });
    }

    static findElements(doc, cssOrXPathSelector) {

        if (!doc || doc.nodeType !== Node.DOCUMENT_NODE) {
            throw new Error('please pass a document object.');
        }

        const parsed = this._getParsedSelector(cssOrXPathSelector);

        const nodes = this._queryNodes(doc, parsed);

        return this._applyParentLevel(nodes, parsed.level);
    }

    static _getParsedSelector(selector) {

        const cached = this.selectorCache.get(selector);
        if (cached) return cached;

        let fixed = selector.trim();
        let level = 0;
        let isXPath = false;

        const parentMatch = fixed.match(/:p(\d+)?$/);
        if (parentMatch) {
            level = parentMatch[1] ? Number(parentMatch[1]) : 1;
            fixed = fixed.replace(/:p(\d+)?$/, '');
        }

        if (fixed.startsWith('xpath:')) {
            isXPath = true;
            fixed = fixed.slice(6);
        }

        const parsed = {
            level,
            selector: fixed,
            isXPath
        };

        this.selectorCache.set(selector, parsed);
        return parsed;
    }

    static _queryNodes(doc, parsed) {

        if (parsed.isXPath) {
            const result = doc.evaluate(
                parsed.selector,
                doc,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );

            const list = [];
            for (let i = 0; i < result.snapshotLength; i++) {
                const node = result.snapshotItem(i);
                if (node) list.push(node);
            }

            return list;
        }

        return Array.from(doc.querySelectorAll(parsed.selector));
    }

    static _applyParentLevel(nodes, level) {

        if (level <= 0) return nodes;

        const result = [];

        for (const node of nodes) {
            let current = node;
            let i = 0;

            while (current && i < level) {
                current = current.parentNode;
                i++;
            }

            if (current) {
                result.push(current);
            }
        }

        return result;
    }

    static findElement(doc, cssOrXPathSelector) {
        let arr = Utils.findElements(doc, cssOrXPathSelector);
        if (arr && arr.length > 0) {
            return arr[0]
        }
        return null;
    }
    static debounce(fun, delay) {
        let ts;
        return function (...args) {
            const c = this;
            clearTimeout(ts);
            ts = setTimeout(() => fun.apply(c, args), delay);
        };
    }

}