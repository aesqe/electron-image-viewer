const { app, BrowserWindow } = require("electron");

let mainWindow = null;

app.on("window-all-closed", function() {
  if (process.platform != "darwin")
    app.quit();
});

app.on("ready", function() {

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    'min-width': 500,
    'min-height': 200,
    'accept-first-mouse': true,
    'title-bar-style': 'hidden'
  });

  mainWindow.loadURL("file://" + __dirname + "/index.html");

  mainWindow.on("closed", function() {
    mainWindow = null;
  });

  if (process.env.NODE_ENV !== "production") {
    mainWindow.openDevTools();
  }
});
