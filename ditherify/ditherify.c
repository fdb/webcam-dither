#include <emscripten.h>
#include <stdint.h>
#include <stdlib.h>

EMSCRIPTEN_KEEPALIVE
int add(int v)
{
  return v + 1;
}

EMSCRIPTEN_KEEPALIVE
uint8_t *buffer_new(int width, int height)
{
  uint8_t *buffer = malloc(width * height * 4);
  buffer[0] = 42;
  return buffer;
}

EMSCRIPTEN_KEEPALIVE
void buffer_destroy(uint8_t *ptr)
{
  free(ptr);
}

int brightness(int red, int green, int blue)
{
  int cmax = red > green ? red : green;
  cmax = blue > cmax ? blue : cmax;
  return cmax;
}

int clamp(int v, int min, int max)
{
  return v < min ? v : v > max ? max : v;
}

int OFFSETS[6][2] = {{1, 0},
                     {2, 0},
                     {-1, 1},
                     {0, 1},
                     {1, 1},
                     {0, 2}};

EMSCRIPTEN_KEEPALIVE void
dither(uint8_t *bytes, int width, int height)
{
  int stride = width * 4;
  for (int y = 0; y < height; y++)
  {
    for (int x = 0; x < width; x++)
    {
      int pos = y * width * 4 + x * 4;
      int r = bytes[pos + 0];
      int g = bytes[pos + 1];
      int b = bytes[pos + 2];
      int bright = brightness(r, g, b);
      float err;
      if (bright <= 127)
      {
        bytes[pos + 0] = 0x00;
        bytes[pos + 1] = 0x00;
        bytes[pos + 2] = 0x00;
        err = bright;
      }
      else
      {
        bytes[pos + 0] = 0xff;
        bytes[pos + 1] = 0xff;
        bytes[pos + 2] = 0xff;
        err = bright - 255;
      }

      for (int i = 0; i < 6; i++)
      {
        int dx = OFFSETS[i][0];
        int dy = OFFSETS[i][1];
        int x2 = x + dx;
        int y2 = y + dy;
        if (x2 < width && y2 < height)
        {
          int pos2 = y2 * stride + x2 * 4;
          int r2 = bytes[pos2];
          int g2 = bytes[pos2 + 1];
          int b2 = bytes[pos2 + 2];

          float bright2 = brightness(r2, g2, b2);
          bright2 += err * 0.125;
          int gray = clamp(bright2, 0, 255);
          bytes[pos2 + 0] = gray;
          bytes[pos2 + 1] = gray;
          bytes[pos2 + 2] = gray;
        }
      }
    }
  }
}
