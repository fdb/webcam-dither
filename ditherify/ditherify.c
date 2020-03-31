#include <emscripten.h>
#include <stdint.h>
#include <stdlib.h>

EMSCRIPTEN_KEEPALIVE
int add(int v) {
  return v + 1;
}

EMSCRIPTEN_KEEPALIVE
uint8_t* buffer_new(int width, int height) {
  uint8_t* buffer = malloc(width * height * 4);
  buffer[0] = 42;
  return buffer;
}

EMSCRIPTEN_KEEPALIVE
void buffer_destroy(uint8_t* ptr) {
  free(ptr);
}

EMSCRIPTEN_KEEPALIVE
void dither(uint8_t* bytes, int width, int height) {
  for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
      int pos = y * width * 4 + x * 4;
      bytes[pos + 1] = 0x00;
    }
  }
}