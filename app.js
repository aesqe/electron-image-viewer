const { remote, ipcRenderer } = require("electron");
const path = require("path");
const Ractive = require("ractive");
const ractiveEventsTap = require("ractive-events-tap");
const sander = require("sander");

const displayableExtensions = [
	"jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"
];

const argsOffset = process.env.PRODUCTION ? 1 : 2;
const inputArgs = remote.process.argv.slice(argsOffset);
let inputPath = inputArgs[0];

function parseInput( inputPath, cwd = remote.process.cwd() )
{
	let files = [];

	if( ! path.isAbsolute(inputPath) ) {
		inputPath = path.resolve(cwd, inputPath);
	}

	if( sander.existsSync(inputPath) )
	{
		if( isDisplayableImage(inputPath) ) {
			files.push(inputPath);
		} else {
			files = sander.readdirSync(inputPath)
				.filter(isDisplayableImage)
				.map(function(fileName){
					return path.join(inputPath, fileName);
				});
		}
	}

	return files.map(slash).map(encodeChars);
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
				this.set("images", parseInput(data));
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

		document.addEventListener("keydown", function(e){
			if (e.keyCode === 37) {
				app.fire("previousImage");
			} else if (e.keyCode === 39) {
				app.fire("nextImage");
			} else if (e.keyCode === 27) {
				app.fire("escape");
			}
		});

		
		this.fire("input", inputPath);
	},

	hasNextImage: function () {
		const i = this.get("currentIndex");
		const len = this.get("images").length - 1;
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
