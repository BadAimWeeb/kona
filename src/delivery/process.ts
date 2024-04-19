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
export async function processImage(blob: Uint8Array, sourceFormat: MagickFormat, targetFormat: MagickFormat, width?: number, height?: number) {
    // SVG is a special case, since it's a vector format and neither FFmpeg nor ImageMagick can render it natively.
    if (sourceFormat === MagickFormat.Svg) {
        let widthBoundOrHeightBound = width && height ? (width > height ? "width" : "height") : (width ? "width" : height ? "height" : "original");

        const svg = new Resvg(new TextDecoder().decode(blob), (() => {
            switch (widthBoundOrHeightBound) {
                case "width":
                    return {
                        fitTo: {
                            mode: "width",
                            value: width!
                        }
                    };
                case "height":
                    return {
                        fitTo: {
                            mode: "height",
                            value: height!
                        }
                    };
                default:
                    return {};
            }
        })());

        let img = svg.render().asPng();
        let im = ImageMagick.read(img, image => {
            if ((width && image.width !== width) || (height && image.height !== height)) {
                image.resize({
                    ...(width ? { width: width!, height: image.height } : { height: height!, width: image.width }),
                    ignoreAspectRatio: true,
                    isPercentage: false,
                    aspectRatio: false,
                    x: 0,
                    y: 0,
                    fillArea: false,
                    greater: false,
                    less: false,
                    limitPixels: false
                });
            }

            try {
                // Uint8Array.from is used here to copy data from the ImageMagick's internal buffer.
                return image.write(targetFormat, d => Uint8Array.from(d));
            } catch (e) {
                // TODO: ffmpeg fallback on unsupported formats
                console.error("processImage: error", String(e));
                return null;
            }
        });

        if (!im) {
            throw new Error("Failed to render SVG.");
        }

        return im;
    }

    try {
        let im = ImageMagick.read(blob, sourceFormat, image => {
            if ((width && image.width !== width) || (height && image.height !== height)) {
                image.resize({
                    ...(width ? { width: width!, height: image.height } : { height: height!, width: image.width }),
                    ignoreAspectRatio: true,
                    isPercentage: false,
                    aspectRatio: false,
                    x: 0,
                    y: 0,
                    fillArea: false,
                    greater: false,
                    less: false,
                    limitPixels: false
                });
            }

            try {
                // Uint8Array.from is used here to copy data from the ImageMagick's internal buffer.
                return image.write(targetFormat, d => Uint8Array.from(d));
            } catch (e) {
                // TODO: ffmpeg fallback on unsupported formats
                console.error("processImage: error", String(e));
                return null;
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
                if ((width && image.width !== width) || (height && image.height !== height)) {
                    image.resize({
                        ...(width ? { width: width!, height: image.height } : { height: height!, width: image.width }),
                        ignoreAspectRatio: true,
                        isPercentage: false,
                        aspectRatio: false,
                        x: 0,
                        y: 0,
                        fillArea: false,
                        greater: false,
                        less: false,
                        limitPixels: false
                    });
                }

                try {
                    // Uint8Array.from is used here to copy data from the ImageMagick's internal buffer.
                    return image.write(targetFormat, d => Uint8Array.from(d));
                } catch (e) {
                    console.error("processImage: error", String(e));
                    return null;
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
