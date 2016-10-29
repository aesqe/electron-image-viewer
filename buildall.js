const packager = require("electron-packager");
const options = {
  name: "electron-image-viewer",
  dir: ".",
  out: "build",
  overwrite: true,
  platform: [
    "win32",
    "darwin",
    "linux"
  ],
  arch: [
    "ia32",
    "x64"
  ],
  ignore: [
    "\.DEV",
    ".DEV",
    "\.gitignore",
    ".gitignore",
    "buildall.js",
    "buildwin64.js"
  ]
};

packager(options, function (err, appPaths) {
  if( err !== null ) {
    console.log(err, appPaths);
  }
});
