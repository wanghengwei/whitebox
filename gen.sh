#!/bin/bash
set -e
cd $(dirname $0)
go build ./tools/codegen
./codegen
