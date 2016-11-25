const packager = require("electron-packager");
const options = {
  name: "electron-image-viewer",
  dir: ".",
  out: "build",
  overwrite: true,
  platform: "darwin",
  arch: "x64",
  ignore: [
    "\.DEV",
    ".DEV",
    "\.gitignore",
    ".gitignore",
    "buildall.js",
    "buildosx.js",
    "buildwin64.js"
  ]
};

packager(options, function (err, appPaths) {
  if( err !== null ) {
    console.log(err, appPaths)
  }
});
