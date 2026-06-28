import "fake-indexeddb/auto";

// crypto.randomUUID polyfill (node 16에선 없을 수 있음, 안전망)
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => Math.random().toString(36).slice(2) },
  });
}
