const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

// Exercise the actual code injected into the page, including its URL matching.
const preload = fs.readFileSync(path.join(__dirname, '../src/preload.js'), 'utf8');
const start = preload.indexOf('webFrame.executeJavaScript(`(async()=>{') + 'webFrame.executeJavaScript(`'.length;
const injected = preload.slice(start, preload.indexOf('`, true, (result, error)', start));

async function setup(overrides = {}) {
    class Socket extends EventTarget {
        static OPEN = 1;
        constructor(url, protocols) {
            super();
            this.url = url;
            this.protocols = protocols;
            this.sent = [];
        }
        send(data) { this.sent.push(data); }
    }
    const errors = [];
    const context = vm.createContext({
        EventTarget, URL,
        document: { baseURI: 'https://example.com/' },
        console: { log() {}, error(error) { errors.push(error); } },
        WebSocket: Socket,
        EventSource: class {},
        fetch() {},
        calls: [],
        addEventListener() {}
    });
    context.window = context;
    const form = {
        isPage: false, isSSE: true, matchUrl: 'exact:wss://example.com/chat',
        script: "calls.push({data,url,type}); return typeof data === 'string' ? data.replace('old', 'new') : data;",
        ...overrides
    };
    const install = () => vm.runInContext(injected.replace('${jsonData}', JSON.stringify(JSON.stringify(form))), context);
    await install();
    return { context, Socket, errors, install };
}

test('matched sockets rewrite sends synchronously and preserve constructor behavior', async () => {
    const { context, Socket, install } = await setup();
    const socket = new context.WebSocket('wss://example.com/chat', ['chat']);
    assert.ok(socket instanceof Socket);
    assert.ok(socket instanceof context.WebSocket);
    assert.equal(context.WebSocket.OPEN, Socket.OPEN);
    assert.deepEqual(socket.protocols, ['chat']);
    assert.equal(socket.send('old'), undefined);
    assert.deepEqual(socket.sent, ['new']);
    assert.equal(context.calls[0].url, socket.url);
    assert.equal(context.calls[0].type, 'send');
    const binary = new Uint8Array([1, 2]);
    socket.send(binary);
    assert.equal(socket.sent[1], binary);
    const wrapper = context.WebSocket;
    await install();
    assert.equal(context.WebSocket, wrapper);
    socket.send('old');
    assert.equal(context.calls.length, 3);
});

test('receive hook runs once and preserves the original event for listeners', async () => {
    const { context } = await setup();
    const socket = new context.WebSocket('wss://example.com/chat');
    const event = new Event('message');
    Object.defineProperty(event, 'data', { value: 'old' });
    let received;
    socket.addEventListener('message', value => { received = value; });
    socket.dispatchEvent(event);
    assert.equal(received, event);
    assert.equal(received.data, 'old');
    assert.equal(context.calls.length, 1);
    assert.equal(context.calls[0].type, 'message');
});

test('script errors fall back to original send and do not stop incoming listeners', async () => {
    const { context, errors } = await setup({ script: "throw new Error('script failed');" });
    const socket = new context.WebSocket('wss://example.com/chat');
    socket.send('old');
    assert.deepEqual(socket.sent, ['old']);
    let received = false;
    socket.addEventListener('message', () => { received = true; });
    socket.dispatchEvent(new Event('message'));
    assert.equal(received, true);
    assert.equal(errors.length, 2);
});

test('disabled modes and unmatched URLs bypass scripts', async () => {
    for (const overrides of [{ isPage: true }, { isSSE: false }, { matchUrl: '' }, {}]) {
        const { context, Socket } = await setup(overrides);
        if (overrides.isPage || overrides.isSSE === false || overrides.matchUrl === '') {
            assert.equal(context.WebSocket, Socket);
        }
        const socket = new context.WebSocket('wss://example.com/other');
        socket.send('old');
        assert.deepEqual(socket.sent, ['old']);
        assert.equal(context.calls.length, 0);
    }
});
