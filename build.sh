#!/bin/bash

export C_INCLUDE_PATH="$(realpath "./whisper.cpp/include"):$(realpath ./whisper.cpp/ggml/include):$C_INCLUDE_PATH"

# Dynamically add all ggml backend directories to LIBRARY_PATH
BACKEND_PATHS=""
for backend_dir in ./whisper.cpp/build_go/ggml/src/ggml-*/; do
  [ -d "$backend_dir" ] && BACKEND_PATHS="$(realpath "$backend_dir"):$BACKEND_PATHS"
done

export LIBRARY_PATH="$(realpath "./whisper.cpp/build_go/src"):$(realpath ./whisper.cpp/build_go/ggml/src):${BACKEND_PATHS}$LIBRARY_PATH"

wails build "$@"
