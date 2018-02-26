const { app, BrowserWindow } = require("electron");
const ElectronStore = require("electron-store");
const { ipcMain } = require("electron");

module.exports = {
  createMainWindow() {
    const store = new ElectronStore();

    let lastWindowState = store.get("lastWindowState");

    if (!lastWindowState) {
      lastWindowState = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        maximized: false,
      };

      store.set("lastWindowState", lastWindowState);
    }

    let win = new BrowserWindow({
      title: "Electron image viewer",
      icon: "images/icon.png",
      position: "center",
      x: lastWindowState.x,
      y: lastWindowState.y,
      width: lastWindowState.width,
      height: lastWindowState.height,
      overlayScrollbars: true,
      resizable: true,
      toolbar: true,
      transparent: false,
      fullscreen: false,
      frame: false,
      show: false,
    });

    win.setMenu(null);

    if (lastWindowState.maximized) {
      win.maximize();
    }

    win.on("close", () => {
      const maximized = win.isMaximized();

      // avoid setting width and height to screen w/h values
      win.unmaximize();

      const bounds = win.getBounds();
      const { x, y, width, height } = bounds;
      const windowState = {
        maximized,
        width,
        height,
        x,
        y,
      };

      store.set("lastWindowState", windowState);
    });

    win.on("unresponsive", (e) => console.log(e));
    win.webContents.on("crashed", (e) => console.log(e));
    process.on("uncaughtException", (e) => console.log(e));

    win.webContents.on("did-finish-load", () => win.show());

    win.on("maximize", () => win.webContents.send("maximize"));
    win.on("unmaximize", () => win.webContents.send("unmaximize"));

    ipcMain.on("maximize", () => win.maximize());
    ipcMain.on("unmaximize", () => win.unmaximize());

    win.on("closed", () => setTimeout(() => (win = null), 250));
    ipcMain.on("quit", () => {
      win.closeDevTools();
      app.quit();
    });

    win.loadURL("file://" + __dirname + "/app/index.html");

    return win;
  }
};
