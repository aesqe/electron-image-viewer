const { remote, ipcRenderer, shell } = require("electron");
const path = require("path");
const Ractive = require("ractive");
const ractiveEventsTap = require("ractive-events-tap");
const jetpack = require("fs-jetpack");
const Mousetrap = require("mousetrap");
const Hamster = require("hamsterjs");
const ElectronStore = require("electron-store");
const trash = require("trash");

const store = new ElectronStore();

const displayableExtensions = [
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"
];

const cwd = remote.process.cwd();
const inputArgs = remote.process.argv;
const inputPath = inputArgs.pop();
const templatePath = path.join(__dirname, "template.html");
const templateString = jetpack.read(templatePath);

const app = new Ractive({
  el: "#viewer",
  template: templateString,

  events: {
    tap: ractiveEventsTap,
  },

  data() {
    return {
      backgroundColor: "#f8f8f8",
      colorPickerVisible: false,
      displayFileName: true,
      currentIndex: 0,
      files: [],
    };
  },

  computed: {
    currentImage() {
      const files = this.get("files");
      const currentIndex = this.get("currentIndex");

      return files[currentIndex] || "";
    },

    previousButtonHidden(){
      return !this.hasPreviousImage() ? "hidden" : "";
    },

    nextButtonHidden(){
      return !this.hasNextImage() ? "hidden" : "";
    }
  },

  onconfig() {
    const self = this;

    this.toggleColorPicker = this.toggleColorPicker.bind(this);
    this.toggleFullscreen = this.toggleFullscreen.bind(this);
    this.handleMouseWheel = this.handleMouseWheel.bind(this);
    this.savePreferences = this.savePreferences.bind(this);
    this.toggleFilename = this.toggleFilename.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.trashFile = this.trashFile.bind(this);

    this.loadPreferences();

    this.on({
      input(ctx, data) {
        const { files, index } = this.parseInput(data);

        this.set("files", files);
        this.set("currentIndex", index);
      },

      previousImage() {
        if (this.hasPreviousImage()) {
          this.subtract("currentIndex");
        }
      },

      nextImage() {
        if (this.hasNextImage()) {
          this.add("currentIndex");
        }
      },

      escape() {
        if (this.get("colorPickerVisible")) {
          this.toggle("colorPickerVisible");
        } else if (this.get("maximized")) {
          ipcRenderer.send("unmaximize");
        } else {
          ipcRenderer.send("quit");
        }
      },
    });

    Mousetrap.bind(["left"], () => this.fire("previousImage"));
    Mousetrap.bind(["right"], () => this.fire("nextImage"));
    Mousetrap.bind(["escape"], () => this.fire("escape"));

    Mousetrap.bind(["b"], () => this.setBackgroundColor("#000000"));
    Mousetrap.bind(["w"], () => this.setBackgroundColor("#ffffff"));
    Mousetrap.bind(["g"], () => this.setBackgroundColor("#888888"));

    Mousetrap.bind(["f"], this.toggleFullscreen);
    Mousetrap.bind(["n"], this.toggleFilename);
    Mousetrap.bind(["c"], this.toggleColorPicker);

    Mousetrap.bind(["del", "command+backspace"], this.trashFile);
    Mousetrap.bind(["shift+del", "shift+command+backspace"], this.deleteFile);

    Hamster(document).wheel(this.handleMouseWheel);
    
    this.fire("input", inputPath);
  },

  loadPreferences() {
    const {
      backgroundColor,
      displayFileName,
    } = store.get();

    if (backgroundColor) {
      this.set({ backgroundColor} );
    }

    if (typeof displayFileName === "boolean") {
      this.set({ displayFileName });
    }
  },

  calculateNextIndex(currentIndex) {
    const files = this.get("files");
    const len = files.length;
    const isLastImage = (currentIndex === len-1);
    const isFirstImage = (currentIndex === 0);

    let nextIndex = currentIndex;

    if (isLastImage) {
      nextIndex = currentIndex - 1;
    } else if (isFirstImage) {
      nextIndex = 0;
    }

    return nextIndex;
  },

  trashFile() {
    if (confirm("Move current file to trash/recycle bin?")) {
      this._deleteFile(false);
    }
  },

  deleteFile() {
    if (confirm("Permanently delete current file?")) {
      this._deleteFile("permanent");
    }
  },

  _deleteFile(permanent = false) {
    const currentImage = this.get("currentImage");
    const currentIndex = this.get("currentIndex");
    const nextIndex = this.calculateNextIndex(currentIndex);
    const deleter = permanent ? jetpack.removeAsync : trash;

    deleter(currentImage).then((data) => {
      this.splice("files", currentIndex, 1);
      this.set("currentIndex", nextIndex);
    });
  },

  setBackgroundColor(color) {
    this.set("backgroundColor", color);
  },

  savePreferences(w) {
    const { backgroundColor, displayFileName } = this.get();

    store.set({
      backgroundColor,
      displayFileName,
    });
  },

  toggleColorPicker() {
    this.toggle("colorPickerVisible");
  },

  parseInput(inputPath = "", dir = cwd) {
    if (!path.isAbsolute(inputPath)) {
      inputPath = path.resolve(dir, inputPath);
    }

    let files = [];
    let index = 0;
    let inputFile = "";
    let inputDir = inputPath;

    if (jetpack.exists(inputPath)) {
      if (this.isDisplayableImage(inputPath)) {
        inputFile = path.basename(inputPath);
        inputDir = path.dirname(inputPath);
      }
      
      if (this.isDirectory(inputDir)) {
        files = jetpack.list(inputDir)
          .filter(this.isDisplayableImage)
          .map((fileName) => path.join(inputDir, fileName));
      }

      if (files.length && inputFile) {
        index = files.indexOf(path.join(inputDir, inputFile));
      }
    }

    return {
      files: files.map(this.slash).map(this.encodeChars),
      index: index
    };
  },

  isDisplayableImage(inputPath) {
    const ext = path.extname(inputPath).slice(1).toLowerCase();
    return ext && displayableExtensions.indexOf(ext) > -1;
  },

  isDirectory(inputPath) {
    return jetpack.exists(inputPath) === "dir";
  },

  slash(str) {
    return str.replace(/\\/g, "/");
  },

  encodeChars(str) {
    return str.replace(/\s/g, "%20");
  },

  handleMouseWheel(e, d, dx, dy){
    const cmd = (dy === 1) ? "previousImage" : "nextImage";

    this.fire(cmd);
  },

  toggleFullscreen() {
    const maximized = this.get("maximized");
    const cmd = maximized ? "unmaximize" : "maximize";

    ipcRenderer.send(cmd);
  },

  toggleFilename() {
    this.toggle("displayFileName");
  },

  hasNextImage() {
    const i = this.get("currentIndex");
    const files = this.get("files");
    const len = files.length - 1;

    return i < len;
  },

  hasPreviousImage() {
    const i = this.get("currentIndex");

    return i > 0;
  }
});



remote.getCurrentWindow().on("close", app.savePreferences);



/* Handle messages from BrowserWindow processes */
ipcRenderer.on("maximize", () => {
  app.set("maximized", true);
});

ipcRenderer.on("unmaximize", () => {
  app.set("maximized", false);
});



/* Drag&drop to open a file/folder */
document.ondragover = document.ondrop = (e) => {
  e.preventDefault();
};

document.ondragover = (e) => {
  e.preventDefault();
  app.set("dragover", true);
};

document.ondragleave = document.ondragexit = document.ondragend = (e) => {
  e.preventDefault();
  app.set("dragover", false);
};

document.body.ondrop = (e) => {
  e.preventDefault();

  const inputPath = e.dataTransfer.files[0].path;

  app.fire("input", inputPath);
  app.set("dragover", false);
};
