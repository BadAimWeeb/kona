import type { MagickFormat } from "@imagemagick/magick-wasm";
import { APIKey, Image } from "../database";
import { processImage } from "../delivery/process";
import { ErrorCode } from "../error-enum";
import { consumeInput, generateErrorResponse } from "../utils";
import fs from "node:fs";
import path from "node:path";

const MAXIMUM_OUTPUT_IMAGE_EDGE = isNaN(Number(process.env.MAX_OUTPUT_IMAGE_EDGE)) ? 0 : Number(process.env.MAX_OUTPUT_IMAGE_EDGE);

export default async function UploadImage(_url: URL, request: Request) {
    let ownerUUID: string | null = null;
    let master = false;

    if (process.env.API_AUTH_ENABLED === "true") {
        if (!request.headers.has("Authorization"))
            return generateErrorResponse(ErrorCode.MissingAuthorization, "Missing Authorization header", 401);
    }

    let auth = request.headers.get("Authorization");
    if (auth && !auth.startsWith("Bearer "))
        return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);

    if (auth) {
        let key = auth.slice(7);

        // Check if request uses master key
        if (process.env.MASTER_API_KEY && (key === process.env.MASTER_API_KEY)) {
            ownerUUID = null; // master key does not have an owner
            master = true;
        } else {
            if (key.startsWith("kona_sk_")) {
                let apiObject = await APIKey.findOne({
                    where: {
                        key
                    }
                });

                if (!apiObject)
                    return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);

                ownerUUID = apiObject.uuid;
            } else {
                return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);
            }
        }
    }

    switch (request.method) {
        case "POST": {
            try {
                let data = await consumeInput(request) as { uuid: string, targetFormat: string, targetWidth?: number };

                if (!("uuid" in data) || !("targetFormat" in data) || !("targetWidth" in data))
                    return generateErrorResponse(ErrorCode.Unknown, "Missing required parameters", 400);

                let image = await Image.findOne({
                    where: {
                        id: data.uuid,
                        ...(master ? {} : { owner: ownerUUID })
                    }
                });

                if (!image)
                    return generateErrorResponse(ErrorCode.NotFound, "Image not found", 404);

                let targetWidth = data.targetWidth;
                if (targetWidth && (targetWidth < 1 || targetWidth > MAXIMUM_OUTPUT_IMAGE_EDGE))
                    return generateErrorResponse(ErrorCode.InvalidQuery, "Invalid targetWidth", 400);

                if (image.server !== process.env.SERVER_ADDRESS) {
                    return generateErrorResponse(ErrorCode.Unknown, "Wrong server", 404);
                }

                let buf = fs.readFileSync(path.join(process.env.LOCAL_STORAGE_PATH, "image", image.id));

                const i = await processImage(buf, image.format as MagickFormat, data.targetFormat as MagickFormat, image.width, targetWidth);
                const uuid = crypto.randomUUID();

                let newImage = await Image.create({
                    id: uuid,
                    owner: ownerUUID,
                    format: data.targetFormat,
                    width: targetWidth ?? image.width,
                    height: Math.ceil(image.height * (targetWidth ? targetWidth / image.width : 1)),
                    server: process.env.SERVER_ADDRESS,
                    disableResizing: true,
                    ownerString: image.ownerString
                });

                fs.writeFileSync(path.join(process.env.LOCAL_STORAGE_PATH, "image", uuid), i);

                return new Response(JSON.stringify({
                    id: newImage.id,
                    owner: ownerUUID,
                    revokationToken: newImage.revokationToken,
                    imageSourceFormat: data.targetFormat,
                    imageDimensions: {
                        width: newImage.width,
                        height: newImage.height
                    }
                }), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
            } catch (e) {
                console.error("resizeAndConvert", e);
                return generateErrorResponse(ErrorCode.Unknown, "Internal server error", 500);
            }
        }
        default:
            return generateErrorResponse(ErrorCode.MethodNotAllowed, "Method not allowed", 405);
    }
}
