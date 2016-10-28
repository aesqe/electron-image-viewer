const { remote, ipcRenderer } = require("electron");
const path = require("path");
const Ractive = require("ractive");
const ractiveEventsTap = require("ractive-events-tap");
const sander = require("sander");
const Mousetrap = require("mousetrap");
const Hamster = require("hamsterjs");

const displayableExtensions = [
	"jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"
];

const argsOffset = process.env.PRODUCTION ? 1 : 2;
const inputArgs = remote.process.argv.slice(argsOffset);
let inputPath = inputArgs[0];

function parseInput( inputPath, cwd = remote.process.cwd() )
{
	let files = [];
	let index = 1;
	let inputFile = "";
	let dirname = inputPath;

	if( ! path.isAbsolute(inputPath) ) {
		inputPath = path.resolve(cwd, inputPath);
	}

	if( sander.existsSync(inputPath) )
	{
		if( isDisplayableImage(inputPath) )
		{
			inputFile = path.basename(inputPath);
			inputDir = path.dirname(inputPath);
		}

		files = sander.readdirSync(inputDir)
			.filter(isDisplayableImage)
			.map(function(fileName){
				return path.join(inputDir, fileName);
			});

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

const templateString = sander.readFileSync("template.html", {encoding: "utf-8"});

const app = new Ractive({
	el: "#viewer",
	template: templateString,

	events: {
		tap: ractiveEventsTap,
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
			return ! this.hasPreviousImage();
		},
		nextButtonHidden: function(){
			return ! this.hasNextImage();
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

		Mousetrap.bind(["f", "f"], () => this.toggleFullscreen());
		Mousetrap.bind(["escape"], () => this.fire("escape"));
		Mousetrap.bind(["left"], () => this.fire("previousImage"));
		Mousetrap.bind(["right"], () => this.fire("nextImage"));

		Hamster(document).wheel((...args) => this.handleMouseWheel(...args));
		
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

$body = document.querySelector("body");

ipcRenderer.on("maximize", function(){
	app.set("maximized", true);
});

ipcRenderer.on("unmaximize", function(){
	app.set("maximized", false);
});
