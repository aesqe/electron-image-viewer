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

function parseInput( inputPath = "", dir = cwd )
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
    if( isDisplayableImage(inputPath) )
    {
      inputFile = path.basename(inputPath);
      inputDir = path.dirname(inputPath);
    }

    files = sander.readdirSync(inputDir)
      .filter(isDisplayableImage)
      .map(fileName => path.join(inputDir, fileName));

    if( inputFile ) {
      index = files.indexOf(path.join(inputDir, inputFile));
    }
  }

  return {
    files: files.map(slash).map(encodeChars),
    index: index
  };
}

function slash (str) {
  return str.replace(/\\/g, "/");
}

function encodeChars( str ) {
  return str.replace(/\s/g, "%20");
}

function isDisplayableImage ( inputPath )
{
  const ext = path.extname(inputPath).slice(1);
  return ext && displayableExtensions.indexOf(ext) > -1;
}

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
      images: []
    };
  },

  computed: {
    currentImage: function()
    {
      const images = this.get("images");
      const currentIndex = this.get("currentIndex");
      return images[currentIndex] || "";
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
        const { files, index } = parseInput(data);
        this.set("images", files);
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
    const images = this.get("images");
    const len = images.length - 1;
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
  app.set("dragover", true);
  e.preventDefault();
}

document.ondragleave = document.ondragexit = document.ondragend = (e) => {
  app.set("dragover", false);
  e.preventDefault();
}

document.body.ondrop = (e) => {
  app.set("dragover", false);
  const inputPath = e.dataTransfer.files[0].path;
  app.fire("input", inputPath);
  e.preventDefault();
}
