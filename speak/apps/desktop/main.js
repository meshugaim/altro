const { app, BrowserWindow, globalShortcut, session } = require("electron");
const path = require("node:path");

const DEV_URL = process.env.SPEAK_DEV_URL; // e.g. http://localhost:8081 when iterating with `expo start --web`
const WEB_BUILD_INDEX = path.join(__dirname, "web-build", "index.html");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    title: "Speak",
    backgroundColor: "#0e1014",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Auto-grant microphone in this window. The Next.js server still gates the NVIDIA API key.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === "media" || permission === "microphone");
  });

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(WEB_BUILD_INDEX);
  }
}

function sendPtt(eventName) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("speak:ptt", eventName);
  }
}

app.whenReady().then(() => {
  createWindow();

  // Global PTT — tap to start, tap again to stop. Avoids OS-level keydown-repeat issues.
  globalShortcut.register("CommandOrControl+Shift+Space", () => sendPtt("toggle"));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
