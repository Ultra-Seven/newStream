
all: js/* protos/*.proto
	cd protos/; make; cd -;
	browserify js/* -o static/js/index.js

barchart: js/*.js js/visualization/barChartViz/*
	browserify js/*.js js/visualization/barChartViz/* -o static/js/index.js
	python ./server.py

simple: js/*.js js/visualization/simpleViz/*
	browserify js/*.js js/visualization/simpleViz/* -o static/js/index.js
	python ./server.py