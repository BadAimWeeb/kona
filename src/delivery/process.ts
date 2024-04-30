import { MagickFormat } from "@imagemagick/magick-wasm";
import { Resvg } from "@resvg/resvg-js";
import { ImageMagick, ffmpegPath } from "../image-process";
import os from "node:os";
import path from "node:path";
import childProcess from "node:child_process";
import fs from "node:fs";

/** 
 * Convert/render and (if required) resize an image.
 */
export async function processImage(blob: Uint8Array, sourceFormat: MagickFormat, targetFormat: MagickFormat, sourceWidth: number, width?: number) {
    // Fast return if the image is already in the target format and no resizing is required.
    if (sourceFormat === targetFormat && (!width || sourceWidth === width)) {
        return blob;
    }

    // SVG is a special case, since it's a vector format and neither FFmpeg nor ImageMagick can render it natively.
    if (sourceFormat === MagickFormat.Svg) {
        const svg = new Resvg(new TextDecoder().decode(blob), width ? {
            fitTo: {
                mode: "width",
                value: width
            }
        } : {});

        let img = svg.render().asPng();

        let im = ImageMagick.read(img, image => {
            try {
                // Uint8Array.from is used here to copy data from the ImageMagick's internal buffer.
                let d = image.write(targetFormat, d => Uint8Array.from(d));
                return d;
            } catch (e) {
                // TODO: ffmpeg fallback on unsupported formats
                console.error("processImage: error", String(e));
                return null;
            } finally {
                image.dispose();
            }
        });

        if (!im) {
            throw new Error("Failed to render SVG.");
        }

        return im;
    }

    try {
        let im = ImageMagick.read(blob, sourceFormat, image => {
            if ((width && image.width !== width)) {
                image.resize(width, 0);
            }

            try {
                // Uint8Array.from is used here to copy data from the ImageMagick's internal buffer.
                let d = image.write(targetFormat, d => Uint8Array.from(d));
                return d;
            } catch (e) {
                // TODO: ffmpeg fallback on unsupported formats
                console.error("processImage: error", String(e));
                return null;
            } finally {
                image.dispose();
            }
        });

        if (!im) {
            throw new Error("Failed to render image.");
        }

        return im;
    } catch (e) {
        // Use ffmpeg to render the image. WEBP is used as intermediate to retain animation.
        // Allocate a temporary file to store intermediate data.
        let tmpFileName = `kona-tmp-${Date.now()}-${Math.random().toString().slice(2, 8)}.webp`;
        let tmpPath = path.join(os.tmpdir(), tmpFileName);

        try {
            let ffmpeg = childProcess.spawn(ffmpegPath, [
                '-i', '-',
                '-lossless', '1',
                '-quality', '0',
                tmpPath
            ]);

            ffmpeg.stdin.write(blob);
            ffmpeg.stdin.end();

            await new Promise((resolve, reject) => {
                ffmpeg.once('close', resolve);
                ffmpeg.once('error', (e) => {
                    ffmpeg.removeAllListeners();
                    reject(e);
                });
            });

            ffmpeg.removeAllListeners();

            let f = Bun.file(tmpPath);

            let im = ImageMagick.read(new Uint8Array(await f.arrayBuffer()), MagickFormat.WebP, image => {
                if ((width && image.width !== width)) {
                    image.resize(width, 0);
                }

                try {
                    // Uint8Array.from is used here to copy data from the ImageMagick's internal buffer.
                    let d = image.write(targetFormat, d => Uint8Array.from(d));
                    return d;
                } catch (e) {
                    // TODO: ffmpeg fallback on unsupported formats
                    console.error("processImage: error", String(e));
                    return null;
                } finally {
                    image.dispose();
                }
            });

            if (!im) {
                throw new Error("Failed to render image.");
            }

            return im;
        } catch (e) {
            console.error("processImage-ffmpeg: error", String(e));
            throw new Error("Failed to render image.");
        } finally {
            await fs.promises.rm(tmpPath, { force: true });
        }
    }
}
