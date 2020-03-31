#!/bin/sh
# source ~/Source/emsdk/emsdk_env.sh 
emcc -O3 -s WASM=1 -o ditherify.wasm ditherify.c
