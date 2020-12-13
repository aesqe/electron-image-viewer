# Electron image viewer

A quick and dirty image viewer made in 8 hours over 5 days.

Uses [Electron](https://github.com/electron/electron) + [Ractive](https://github.com/ractivejs/ractive) + [Photon](https://github.com/connors/photon/).

Supports only those image formats supported by Chromium: JPG, PNG, GIF, BPM, WEBP and SVG.

## Shortcuts
* left and right arrow for previous/next image
* "f" to toggle fullscreen
* "n" to toggle filename display
* "c" to toggle background color colorpicker
* esc to exit fullscreen or quit the application
* del or command+backspace to trash current image, hold shift for permanent deletion

## Screenshot
![A screen shot](https://cloud.githubusercontent.com/assets/291348/19836170/9d499500-9e98-11e6-9252-7d68b27d5e2d.PNG)

A Turkish cat sleeping on a pile of books picture source: http://cuteoverload.com/2013/06/23/turkey-cat/

The font used for the app icon is [SF Alien Encounters by ShyFoundry](http://shyfoundry.com/fonts/shareware/sfalienenc.html).

## How to run:
- Clone the repo
- Install the dependencies: 
  ```npm install```
- Run the app: 
  ```npm start```

## Create an installer for your platform
```npm run-script dist```
