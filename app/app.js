const { remote, ipcRenderer } = require("electron");
const path = require("path");
const Ractive = require("ractive");
const ractiveEventsTap = require("ractive-events-tap");
const sander = require("sander");
const Mousetrap = require("mousetrap");
const Hamster = require("hamsterjs");

const displayableExtensions = [
  "jpg", "jpeg", "png", "gif",
  "webp", "bmp", "svg"
];

const cwd = remote.process.cwd();
const inputArgs = remote.process.argv;
  let inputPath = inputArgs.pop();
const templateString = sander.readFileSync(
  path.join(__dirname, "template.html"),
  { encoding: "utf-8" }
);

const app = new Ractive({
  el: "#viewer",
  template: templateString,

  events: {
    tap: ractiveEventsTap
  },

  data: function() {
    return {
      currentIndex: 0,
      files: []
    };
  },

  computed: {
    currentImage: function()
    {
      const files = this.get("files");
      const currentIndex = this.get("currentIndex");
      return files[currentIndex] || "";
    },
    previousButtonHidden: function(){
      return ! this.hasPreviousImage() ? "hidden" : "";
    },
    nextButtonHidden: function(){
      return ! this.hasNextImage() ? "hidden" : "";
    }
  },

  onconfig: function()
  {
    this.on({
      input: function (data) {
        const { files, index } = this.parseInput(data);
        this.set("files", files);
        this.set("currentIndex", index);
      },

      previousImage: function () {
        if( this.hasPreviousImage() ) {
          this.subtract("currentIndex");
        }
      },

      nextImage: function () {
        if( this.hasNextImage() ) {
          this.add("currentIndex");
        }
      },

      escape: function(){
        if( this.get("maximized") ) {
          ipcRenderer.send("unmaximize");
        } else {
          ipcRenderer.send("quit");
        }
      }
    });

    Mousetrap.bind(["left"], () => this.fire("previousImage"));
    Mousetrap.bind(["right"], () => this.fire("nextImage"));
    Mousetrap.bind(["escape"], () => this.fire("escape"));
    Mousetrap.bind(["f"], () => this.toggleFullscreen());

    Hamster(document).wheel(
      (...args) => this.handleMouseWheel(...args)
    );
    
    this.fire("input", inputPath);
  },

  parseInput: function( inputPath = "", dir = cwd )
  {
    if( ! path.isAbsolute(inputPath) ) {
      inputPath = path.resolve(dir, inputPath);
    }

    let files = [];
    let index = 0;
    let inputFile = "";
    let inputDir = inputPath;

    if( sander.existsSync(inputPath) )
    {
      if( this.isDisplayableImage(inputPath) )
      {
        inputFile = path.basename(inputPath);
        inputDir = path.dirname(inputPath);
      }
      
      if( this.isDirectory(inputDir) )
      {
        files = sander.readdirSync(inputDir)
          .filter(this.isDisplayableImage)
          .map(fileName => path.join(inputDir, fileName));
      }

      if( files.length && inputFile ) {
        index = files.indexOf(path.join(inputDir, inputFile));
      }
    }

    return {
      files: files.map(this.slash).map(this.encodeChars),
      index: index
    };
  },

  isDisplayableImage: function ( inputPath ) {
    const ext = path.extname(inputPath).slice(1);
    return ext && displayableExtensions.indexOf(ext) > -1;
  },

  isDirectory: function ( inputPath ) {
    const stats = sander.lstatSync(inputPath);
    return stats.isDirectory();
  },

  slash: function (str) {
    return str.replace(/\\/g, "/");
  },

  encodeChars: function( str ) {
    return str.replace(/\s/g, "%20");
  },

  handleMouseWheel: function(e, d, dx, dy){
    if( dy === 1 ) {
      this.fire("nextImage");
    } else {
      this.fire("previousImage");
    }
  },

  toggleFullscreen: function () {
    if( this.get("maximized") ) {
      ipcRenderer.send("unmaximize");
    } else {
      ipcRenderer.send("maximize");
    }
  },

  hasNextImage: function () {
    const i = this.get("currentIndex");
    const files = this.get("files");
    const len = files.length - 1;
    return i < len;
  },

  hasPreviousImage: function() {
    const i = this.get("currentIndex");
    return i > 0;
  }
});


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
}

document.ondragover = (e) => {
  e.preventDefault();
  app.set("dragover", true);
}

document.ondragleave = document.ondragexit = document.ondragend = (e) => {
  e.preventDefault();
  app.set("dragover", false);
}

document.body.ondrop = (e) => {
  e.preventDefault();
  const inputPath = e.dataTransfer.files[0].path;
  app.fire("input", inputPath);
  app.set("dragover", false);
}
