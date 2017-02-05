all: pb

pb: *.proto
	protoc --js_out=import_style=commonjs,binary:../js/ table.proto
	protoc --python_out=../py/ table.proto

