const { remote } = require("electron");
const Ractive = require("ractive");
const path = require("path");
const fs = require("fs");

const displayableExtensions = [
	"jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"
];

const argsOffset = process.env.PRODUCTION ? 1 : 2;
const inputArgs = remote.process.argv.slice(argsOffset);
let inputPath = inputArgs[0];

function determineInput( inputPath, cwd = remote.process.cwd() )
{
	if( ! path.isAbsolute(inputPath) ) {
		inputPath = path.resolve(cwd, inputPath);
	}

	if( fs.existsSync(inputPath) ) {
		const ext = path.extname(inputPath).slice(1);

		if( ext ) {
			const isSingleDisplayableImage = displayableExtensions.indexOf(ext) > -1;

			if( isSingleDisplayableImage ) {
				return inputPath;
			}
		} else {
			// readDir
		}
	}

	return "";
}



const app = new Ractive({
  el: "#viewer",
  template: `
  	<div id="controls">
	</div>

	<div id="display">
		<img src="{{image}}" />
	</div>`,
  data: function() {
  	return {
  		image: determineInput(inputPath)
  	};
  }
});