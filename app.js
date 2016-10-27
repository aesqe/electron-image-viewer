const { remote } = require("electron");
const Ractive = require("ractive");
const path = require("path");
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
				.map(function(fileName){
					return path.join(inputPath, fileName);
				})
				.filter(isDisplayableImage);
		}
	}

	return files;
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

  data: function() {
  	return {
  		currentIndex: 0,
  		images: []
  	};
  },

  onconfig: function()
  {
  	this.on("input", function(data){
  		this.set("images", parseInput(data));
  	});
  }
});

app.fire("input", inputPath);
