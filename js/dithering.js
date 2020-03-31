//   // From https://github.com/openjdk/jdk/blob/master/src/java.desktop/share/classes/java/awt/Color.java
//   function rgb2hsb(r, g, b) {
//   let cmax = (r > g) ? r : g;
//   if (b > cmax) cmax = b;
//   let cmin = r < g ? r : g;
//   if (b < cmin) cmin = b;
//   const brightness = cmax / 255;
//   if (cmax !== 0) {
//     saturation = (cmax - cmin) / cmax
//   } else {
//     saturation = 0;
//   }
//   if (saturation = 0)

// }

// From https://github.com/processing/processing/blob/master/core/src/processing/core/PGraphics.java
function brightness(r, g, b) {
  let cmax = r > g ? r : g;
  if (b > cmax) cmax = b;
  return cmax;

  // return r;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

const MODE_JS = "js";
const MODE_WASM = "wasm";

const gCanvas = document.getElementById("cat-canvas");
const gCtx = gCanvas.getContext("2d");
let gWasmImage, _wasmDither;
let gWidth, gHeight, gStride, gSizeInBytes;
let gMode = MODE_JS;
let gPlaying = false;
// let gSourceEl = document.getElementById("cat-image");
let gSourceEl = document.getElementById("cat-video");

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
  // requestAnimationFrame(() => dither(video));
}

// let video = document.querySelector("#cat-video");

async function videoInit() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
  gSourceEl.srcObject = stream;
  gSourceEl.addEventListener("play", () => {
    commonInit();
    gPlaying = true;
    // requestAnimationFrame(animate);
  });
}

// run();

const MEMORY_PAGE_SIZE = 2 ** 16;
const WASM_URI =
  "ditherify/target/wasm32-unknown-unknown/release/ditherify.wasm";

async function wasmInit() {
  const results = await WebAssembly.instantiateStreaming(fetch(WASM_URI));
  const { instance } = results;
  _wasmDither = instance.exports.dither;
  // gBytes = gBytes.subarray(0, gSizeInBytes);
  gWasmImage = instance.exports.init(gWidth, gHeight);
  const wasmWidth = instance.exports.image_width(gWasmImage);
  const wasmHeight = instance.exports.image_height(gWasmImage);
  console.log(wasmWidth, wasmHeight);
  let gPtr = instance.exports.image_bytes(gWasmImage);
  console.log("IMAGE", gWasmImage, "POINTER", gPtr, "DELTA", gPtr - gWasmImage);
  gBytes = new Uint8ClampedArray(
    instance.exports.memory.buffer,
    gPtr,
    gSizeInBytes
  );
  console.log(gBytes);
  //gBytes = gBytes.subarray(gPtr, gSizeInBytes);
  //console.log(gPtr);
}

function wasmDither() {
  gCtx.drawImage(gSourceEl, 0, 0);
  const imageData = gCtx.getImageData(0, 0, gWidth, gHeight);
  const { data } = imageData;
  gBytes.set(data);
  _wasmDither(gWasmImage);
  data.set(gBytes);
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
  document
    .querySelectorAll('input[type="radio"]')
    .forEach(el => addEventListener("change", onSwitchMode));

  // commonInit();
  await videoInit();
  // setTimeout(async () => {
  // await wasmInit();
  animate();
  // }, 10);
}

main();

// main(document.querySelector("#cat-image"));
// dither(document.querySelector("#cat-image"));
