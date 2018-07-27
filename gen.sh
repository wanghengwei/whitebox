#!/bin/bash
set -e
go build ./tools/codegen
./codegen
# grpc_tools_node_protoc --js_out=import_style=commonjs,binary:./codegen/ --grpc_out=./codegen --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` ../protos/x51.proto
# grpc_tools_node_protoc --js_out=import_style=commonjs,binary:./codegen/route_guide/ --grpc_out=./node/codegen/route_guide/ --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` route_guide.proto