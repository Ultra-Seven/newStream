
all: js/* protos/*.proto
	cd protos/; make; cd -;
	browserify js/* -o static/js/index.js

barchart: js/*.js js/visualization/barChartViz/*
	browserify js/*.js js/visualization/barChartViz/* -o static/js/index.js
	python ./server.py

simple: js/*.js js/visualization/simpleViz/* js/test/*
	browserify js/*.js js/visualization/simpleViz/* js/test/* -o static/js/index.js
	python ./server.py

complex: js/*.js js/visualization/complicatedViz/*
	browserify js/*.js js/visualization/complicatedViz/* -o static/js/index.js
	python ./server.py

drag: js/*.js js/visualization/draggingViz/*
	browserify js/*.js js/visualization/draggingViz/* -o static/js/index.js
	python ./server.py
