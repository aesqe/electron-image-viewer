const packager = require("electron-packager");
const options = {
  name: "electron-image-viewer",
  dir: ".",
  out: "build",
  overwrite: true,
  platform: "win32",
  arch: "x64",
  ignore: [
    "\.DEV",
    ".DEV",
    "\.gitignore",
    ".gitignore"
  ]
};

packager(options, function (err, appPaths) {
  if( err !== null ) {
    console.log(err, appPaths)
  }
});