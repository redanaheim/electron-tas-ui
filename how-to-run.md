# How to run

1. Clone this repository:
```
$ git clone https://github.com/tigergold59/electron-tas-ui.git
$ cd electron-tas-ui
```

2. Make sure you have npm and node by running `npm -v`. You can get them [here](https://nodejs.org/en/download/) if you don't have them already.

3. Install command line tools for Electron and TypeScript like so:
```
$ npm i -g electron@latest
$ npm i -g typescript@latest
```
If you get an error about missing permissions, you may have to use sudo and add the `--unsafe-perm` flag in order for them to install correctly.

4. Make sure you're still in the `electron-tas-ui` folder. Run `npm i` and wait a while.

5. You should be ready to go with all dependencies. To run, use
```
$ npm run start
```
This will run `tsc` to compile the TypeScript files and then `electron .` to start the app.

6. (optional) If you want to package the app, install electron-builder. You can use the following command:
```
$ npm i -g electron-builder
```
Then you can use `make` in the main folder to package for Mac, Windows, and Linux, or set up a custom packaging configuration if you know what you're doing.
