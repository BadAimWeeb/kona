import path from "node:path";
import { ExtMapping, FormatToMIME } from "./ext-mapping";
import packageJSON from "../../package.json";
import { processImage } from "./process";
import { Image } from "../database";
import fs from "node:fs";
import type { MagickFormat } from "@imagemagick/magick-wasm";

export async function handleHTTPDelivery(url: URL, request: Request): Promise<Response> {
    let fn = url.pathname.split("/")[2] ?? "";

    let ext = path.extname(fn);
    let id = path.basename(fn, ext);

    let m = ExtMapping[ext.toLowerCase()];
    if (!m) {
        return new Response(`Sorry, Kona cannot resolve your required format yet.\n\nKona v${packageJSON.version} - https://github.com/BadAimWeeb/kona`, {
            status: 400,
            headers: {
                "content-type": "text/plain"
            }
        });
    }

    // Check if file metadata exists in database
    let image = await Image.findOne({
        where: {
            id
        }
    });

    if (!image) {
        return new Response(`Sorry, Kona cannot find the requested file.\n\nKona v${packageJSON.version} - https://github.com/BadAimWeeb/kona`, {
            status: 404,
            headers: {
                "content-type": "text/plain"
            }
        });
    }

    let exists = fs.existsSync(path.join(process.env.LOCAL_STORAGE_PATH, "image", image.id));

    if (!exists) {
        if (image.server !== process.env.SERVER_ADDRESS) {
            // This file may not be here. Redirect to the correct server.
            return new Response("", {
                status: 302,
                headers: {
                    "location": `${image.server}/cdn/${image.id}${ext}`
                }
            });
        }

        return new Response(`Sorry, Kona cannot find the requested file.\n\nKona v${packageJSON.version} - https://github.com/BadAimWeeb/kona`, {
            status: 404,
            headers: {
                "content-type": "text/plain"
            }
        });
    }

    let buf = fs.readFileSync(path.join(process.env.LOCAL_STORAGE_PATH, "image", image.id));
    let targetWidth = url.searchParams.has("width") ? +url.searchParams.get("width")! : void 0;
    try {
        if (image.disableResizing) {
            if (image.format !== m) {
                return new Response(`Sorry, Kona cannot process the requested file.\n\nKona v${packageJSON.version} - https://github.com/BadAimWeeb/kona`, {
                    status: 400,
                    headers: {
                        "content-type": "text/plain"
                    }
                });
            }

            if (targetWidth && targetWidth !== image.width) {
                return new Response(`Sorry, Kona cannot process the requested file.\n\nKona v${packageJSON.version} - https://github.com/BadAimWeeb/kona`, {
                    status: 400,
                    headers: {
                        "content-type": "text/plain"
                    }
                });
            }
        }

        let t = await processImage(buf, image.format as unknown as MagickFormat, m, image.width, );
        let mime = FormatToMIME[m];

        return new Response(t, {
            headers: {
                "content-type": mime
            }
        });
    } catch (e) {
        console.error("handleHTTPDelivery: error", String(e));
        return new Response(`Sorry, Kona cannot process the requested file.\n\nKona v${packageJSON.version} - https://github.com/BadAimWeeb/kona`, {
            status: 500,
            headers: {
                "content-type": "text/plain"
            }
        });
    }
}
