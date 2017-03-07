
all: js/* 
	cp ../server/js/ktm.js js/
	cp ../server/js/predict.js js/
	cp ../server/js/dist.js js/
	python collectscripts.py
	node js/test-evaluator.js


clean: js/*
	rm js/dist.js js/ktm.js js/evaluator_*.js js/predict_*.js
