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

export const ImageMagick = IM;

import ffmpeg from "ffmpeg-static";
import ffprobeI from "@ffprobe-installer/ffprobe";
export const ffmpegPath = ffmpeg; // ffmpeg-static already read the path from the environment variable.
export const ffprobePath = process.env.FFPROBE_PATH || ffprobeI.path;

import childProcess from "node:child_process";
import type { FFprobeProbeResult } from "./ffprobe-json";

export function ffprobeExec(file: Uint8Array | string) {
    return new Promise<Required<Pick<FFprobeProbeResult, "streams" | "format">>>(async (resolve, reject) => {
        const args = ['-show_streams', '-show_format', '-print_format', 'json'];

        if (typeof file === 'string') {
            args.unshift(file);
        } else {
            args.unshift('-i', '-');
        }

        const ffprobe = childProcess.spawn(ffprobePath, args);
        if (typeof file !== 'string') {
            ffprobe.stdin.write(file);
            ffprobe.stdin.end();
        }

        let output = '';
        ffprobe.stdout.on('data', (data) => {
            output += data;
        });

        await new Promise((resolve) => {
            ffprobe.once('close', resolve);
            ffprobe.once('error', () => {
                ffprobe.removeAllListeners();
                reject();
            });
        });

        resolve(JSON.parse(output));
    });
}
