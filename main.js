const { app, BrowserWindow } = require("electron");
const { createMainWindow } = require("./window.js");

let mainWindow = null;

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate-with-no-open-windows", function () {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});

app.on("ready", function () {
  mainWindow = createMainWindow();

  if (process.env.NODE_ENV === "development") {
    mainWindow.openDevTools();
  }
});
