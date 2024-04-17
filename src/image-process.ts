import { Magick, initializeImageMagick, Quantum, ImageMagick as IM } from "@imagemagick/magick-wasm";
// @ts-ignore
import wasm from "@imagemagick/magick-wasm/magick.wasm" with { type: "webassembly" };

let w: WebAssembly.Module;
if (typeof wasm === "string") {
    // read and run the wasm file
    const buf = await Bun.file(wasm).arrayBuffer();
    w = await WebAssembly.compile(buf);
} else {
    w = wasm;
}

// @ts-ignore
await initializeImageMagick(w);

console.log("");
console.log(Magick.imageMagickVersion);
console.log('Delegates:', Magick.delegates);
console.log('Features:', Magick.features);
console.log('Quantum:', Quantum.depth);
console.log("");
console.log('Supported formats:', Magick.supportedFormats.map(f => f.format).join(', '));
console.log("");

export const ImageMagick = IM;
