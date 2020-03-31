let gWidth, gHeight, gStride, gSizeInBytes;
const gCanvas = document.getElementById("cat-canvas");
const gCtx = gCanvas.getContext("2d");
let gSourceEl = document.getElementById("cat-image");
let gBuffer;
let gExports;
let gImagePtr;

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

function commonInit() {
  gWidth = gSourceEl.naturalWidth | gSourceEl.videoWidth;
  gHeight = gSourceEl.naturalHeight | gSourceEl.videoHeight;
  gStride = gWidth * 4;
  gSizeInBytes = gWidth * gHeight * 4;
  gCanvas.width = gWidth;
  gCanvas.height = gHeight;
}

async function wasmInit() {
  const result = await WebAssembly.instantiateStreaming(
    fetch("ditherify/ditherify.wasm")
  );

  console.log(result);
  console.log(result.instance.exports.add(1));
  const { exports } = result.instance;
  gExports = exports;
  const { memory } = exports;
  gImagePtr = exports.buffer_new(gWidth, gHeight);
  // console.log(imagePtr);
  // exports.buffer_destroy(imagePtr);
  gBuffer = new Uint8ClampedArray(memory.buffer, gImagePtr, gSizeInBytes);
}

function wasmDither() {
  gCtx.drawImage(gSourceEl, 0, 0);

  const imageData = gCtx.getImageData(0, 0, gWidth, gHeight);
  const { data } = imageData;
  gBuffer.set(data);
  gExports.dither(gImagePtr, gWidth, gHeight);
  data.set(gBuffer);
  gCtx.putImageData(imageData, 0, 0);
}

function animate() {
  wasmDither();
  if (gPlaying) {
    requestAnimationFrame(animate);
  }
}

async function main() {
  await videoInit();
  // imageInit();
  commonInit();
  await wasmInit();
  animate();
}

main();
