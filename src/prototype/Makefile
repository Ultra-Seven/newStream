
all: js/* protos/*.proto
	cd protos/; make; cd -;
	browserify js/* -o static/js/index.js