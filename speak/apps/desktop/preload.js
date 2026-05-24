const { contextBridge, ipcRenderer } = require("electron");

// Bridges the global hotkey from main.js to the renderer (the Expo web build).
// SpeakScreen can listen via window.addEventListener("speak:ptt", ...) if desired,
// or any code can subscribe through window.speak.onPtt(handler).
contextBridge.exposeInMainWorld("speak", {
  onPtt(handler) {
    const listener = (_e, kind) => {
      handler(kind);
      window.dispatchEvent(new CustomEvent("speak:ptt", { detail: kind }));
    };
    ipcRenderer.on("speak:ptt", listener);
    return () => ipcRenderer.removeListener("speak:ptt", listener);
  },
});

// Also dispatch a window event by default so the renderer can listen without explicit subscription.
ipcRenderer.on("speak:ptt", (_e, kind) => {
  window.dispatchEvent(new CustomEvent("speak:ptt", { detail: kind }));
});
