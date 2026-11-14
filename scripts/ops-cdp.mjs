import { writeFile } from 'node:fs/promises';
const tabs = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', event => { const msg = JSON.parse(event.data); if (msg.id) { const task = pending.get(msg.id); pending.delete(msg.id); if (msg.error) task.reject(new Error(JSON.stringify(msg.error))); else task.resolve(msg.result); } if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails); });
export function call(method, params = {}) { return new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); }); }
export async function evaluate(expression) { const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; }
export async function navigate(url) { await call('Page.navigate', { url }); await new Promise(r => setTimeout(r, 1700)); }
export async function screenshot(file) { const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(file, Buffer.from(shot.data, 'base64')); }
export function close() { ws.close(); }
export { errors };
await call('Runtime.enable'); await call('Page.enable');

export function onEvent(method,handler){const listener=event=>{const msg=JSON.parse(event.data);if(msg.method===method)void handler(msg.params);};ws.addEventListener("message",listener);return()=>ws.removeEventListener("message",listener);}
