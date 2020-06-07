.PHONY : clean, all, win, mac, linux

all : 
	-tsc 
	electron-builder build -w -l -m
	@echo "Packaged for all platforms"

clean :
	@echo "Cleaning..."
	-rm -r ./dist
	mv ./src/assets/jquery.min.js ./src/assets/jquery.min
	mv ./src/assets/lodash.min.js ./src/assets/lodash.min
	find ./src -type f -name '*.js' -exec rm {} \;
	find ./src -type f -name '*.js.map' -exec rm {} \;
	mv ./src/assets/jquery.min ./src/assets/jquery.min.js
	mv ./src/assets/lodash.min ./src/assets/lodash.min.js
	@echo "All build files removed"

win :
	-tsc
	electron-builder build -w
	@echo "Packaged for Windows"

mac :
	-tsc
	electron-builder build -m
	@echo "Packaged for Mac"

linux :
	-tsc
	electron-builder build -l
	@echo "Packaged for Linux"