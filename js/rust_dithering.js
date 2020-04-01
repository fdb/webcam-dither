const MODE_JS = "js";
const MODE_WASM = "wasm";

const gCanvas = document.getElementById("cat-canvas");
const gCtx = gCanvas.getContext("2d");
let gWidth, gHeight, gStride, gSizeInBytes;
let gExports, gMemoryBuffer, gImagePtr;
let gPlaying = false;
let gMode = MODE_WASM;
let gSourceEl;

function brightness(r, g, b) {
  let cmax = r > g ? r : g;
  if (b > cmax) cmax = b;
  return cmax;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

const OFFSETS = [
  [1, 0],
  [2, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
  [0, 2]
];

function commonInit() {
  gWidth = gSourceEl.naturalWidth | gSourceEl.videoWidth;
  gHeight = gSourceEl.naturalHeight | gSourceEl.videoHeight;
  gStride = gWidth * 4;
  gSizeInBytes = gWidth * gHeight * 4;
  gCanvas.width = gWidth;
  gCanvas.height = gHeight;
}

function jsDither() {
  gCtx.drawImage(gSourceEl, 0, 0);
  const imageData = gCtx.getImageData(0, 0, gWidth, gHeight);
  const { data } = imageData;
  for (let x = 0; x < gWidth; x++) {
    for (let y = 0; y < gHeight; y++) {
      const pos = y * gStride + x * 4;
      const r = data[pos];
      const g = data[pos + 1];
      const b = data[pos + 2];
      const bright = brightness(r, g, b);
      let err;
      if (bright <= 127) {
        data[pos + 0] = 0x00;
        data[pos + 1] = 0x00;
        data[pos + 2] = 0x00;
        err = bright;
      } else {
        data[pos + 0] = 0xff;
        data[pos + 1] = 0xff;
        data[pos + 2] = 0xff;
        err = bright - 255;
      }
      for (const [dx, dy] of OFFSETS) {
        const x2 = x + dx;
        const y2 = y + dy;
        if (x2 < gWidth && y2 < gHeight) {
          const pos2 = y2 * gStride + x2 * 4;
          const r2 = data[pos2];
          const g2 = data[pos2 + 1];
          const b2 = data[pos2 + 2];

          let bright2 = brightness(r2, g2, b2);
          bright2 += err * 0.125;
          // bright2 = clamp(bright2, 0, 255);
          data[pos2 + 0] = bright2;
          data[pos2 + 1] = bright2;
          data[pos2 + 2] = bright2;
        }
      }
    }
  }
  gCtx.putImageData(imageData, 0, 0);
}

async function videoInit() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
  gSourceEl = document.getElementById("cat-video");
  gSourceEl.srcObject = stream;
  return new Promise(resolve => {
    gSourceEl.addEventListener("play", () => {
      gPlaying = true;
      resolve();
    });
  });
}

function imageInit() {
  gSourceEl = document.getElementById("cat-image");
}

const WASM_URI =
  "ditherify_rs/target/wasm32-unknown-unknown/release/ditherify.wasm";

async function wasmInit() {
  const bytes = await (await fetch(WASM_URI)).arrayBuffer();
  const result = await WebAssembly.instantiate(bytes);
  const { exports } = result.instance;
  gExports = exports;
  const { memory } = exports;
  gImagePtr = exports.image_new(gWidth, gHeight);
  const bytesPtr = gExports.image_bytes(gImagePtr);
  gMemoryBuffer = new Uint8ClampedArray(memory.buffer, bytesPtr, gSizeInBytes);
}

function wasmDither() {
  gCtx.drawImage(gSourceEl, 0, 0);
  const imageData = gCtx.getImageData(0, 0, gWidth, gHeight);
  const { data } = imageData;
  gMemoryBuffer.set(data);
  gExports.image_dither(gImagePtr, gWidth, gHeight);
  data.set(gMemoryBuffer);
  gCtx.putImageData(imageData, 0, 0);
}

function animate() {
  if (gMode === MODE_JS) {
    jsDither();
  } else {
    wasmDither();
  }
  if (gPlaying) {
    requestAnimationFrame(animate);
  }
}

function onSwitchMode(e) {
  // console.log(e.target.value);
  gMode = e.target.value;
}

async function main() {
  await videoInit();
  // imageInit();
  commonInit();
  await wasmInit();
  animate();
}

main();

document.querySelector("#range-error-factor").addEventListener("input", e => {
  const value = parseFloat(e.target.value);
  gExports.image_set_error_factor(gImagePtr, value);
});
