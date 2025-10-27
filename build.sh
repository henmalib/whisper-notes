#!/bin/bash

export C_INCLUDE_PATH="$(realpath "./whisper.cpp/include"):$(realpath ./whisper.cpp/ggml/include):$C_INCLUDE_PATH"
export LIBRARY_PATH="$(realpath "./whisper.cpp/build_go/src"):$(realpath ./whisper.cpp/build_go/ggml/src):$(realpath ./whisper.cpp/build_go/ggml/src/ggml-metal):$(realpath ./whisper.cpp/build_go/ggml/src/ggml-cpu/):$(realpath ./whisper.cpp/build_go/ggml/src/ggml-blas):$LIBRARY_PATH"

wails build "$@"
