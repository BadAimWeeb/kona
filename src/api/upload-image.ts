import { APIKey, Image } from "../database";
import { ErrorCode } from "../error-enum";
import { boyerMooreStringSearch, generateErrorResponse } from "../utils";
import path from "node:path";
import { ImageMagick, ffprobeExec } from "../image-process";
import { FFmpegMapping } from "../ffmpeg-codec-map";

export default async function UploadImage(_url: URL, request: Request) {
    let ownerUUID: string | null = null;
    if (process.env.API_AUTH_ENABLED === "true") {
        if (!request.headers.has("Authorization"))
            return generateErrorResponse(ErrorCode.MissingAuthorization, "Missing Authorization header", 401);
    }

    let auth = request.headers.get("Authorization");
    if (auth && !auth.startsWith("Bearer "))
        return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);

    if (auth) {
        let key = auth.slice(7);

        let apiObject = await APIKey.findOne({
            where: {
                key
            }
        });

        if (!apiObject)
            return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);

        ownerUUID = apiObject.uuid;
    }

    switch (request.method) {
        case "POST": {
            if ((request.headers.get("Content-Type") ?? "").split(";")[0] !== "multipart/form-data")
                return generateErrorResponse(ErrorCode.InvalidContentType, "Invalid Content-Type header", 415);

            let formData = await request.formData();
            let image = formData.get("image");

            if (!(image instanceof File))
                return generateErrorResponse(ErrorCode.Unknown, "Missing required parameters: image", 400);

            // redeclare image as a File
            image = image as File;

            if (image.size > Number(process.env.MAX_FILE_SIZE)) {
                return generateErrorResponse(ErrorCode.Unknown, "File size too large", 413);
            }

            try {
                let buf = await image.arrayBuffer();
                let uint8 = new Uint8Array(buf);

                let m: {
                    format: string,
                    dimension: {
                        width: number,
                        height: number
                    }
                }

                let retryFFmpeg = false;
                try {
                    m = ImageMagick.read(uint8, i => {
                        return {
                            format: i.format,
                            dimension: {
                                width: i.width,
                                height: i.height
                            }
                        };
                    });

                    if (m.format === "PNG") {
                        // ImageMagick does not detect APNG since it only assumes PNG and does not read subsequent chunks.
                        // This is a workaround to detect APNG. ffmpeg is used here since ImageMagick cannot read and detect APNG natively.
                        let idatPos = boyerMooreStringSearch(uint8, new TextEncoder().encode("IDAT"));
                        let actlPos = boyerMooreStringSearch(uint8, new TextEncoder().encode("acTL"));

                        if (actlPos + 1 && idatPos + 1 && actlPos < idatPos) {
                            retryFFmpeg = true;
                        }
                    }
                } catch (e) {
                    console.error("upload-image: error\n", e);
                    retryFFmpeg = true;
                }

                if (retryFFmpeg) {
                    try {
                        let probe = await ffprobeExec(uint8);
                        if (!probe.streams.some(x => x.codec_type === "video")) {
                            return generateErrorResponse(ErrorCode.InvalidImageInput, "Invalid image", 400);
                        }

                        // Select first stream that is a video stream
                        let videoStream = probe.streams.find(x => x.codec_type === "video")!;
                        m = {
                            format: FFmpegMapping[videoStream.codec_name],
                            dimension: {
                                width: videoStream.width ?? 0,
                                height: videoStream.height ?? 0
                            }
                        }

                        if (!m.format || !m.dimension.width || !m.dimension.height) {
                            return generateErrorResponse(ErrorCode.InvalidImageInput, "Invalid image", 400);
                        }
                    } catch (e) {
                        console.error("upload-image-retry-ffmpeg: error\n", e);
                        return generateErrorResponse(ErrorCode.InvalidImageInput, "Invalid image", 400);
                    }
                }

                m = m!; // making TypeScript happy

                if (m.format === "UNKNOWN") {
                    return generateErrorResponse(ErrorCode.InvalidImageInput, "Invalid image", 400);
                }

                let server = process.env.SERVER_ADDRESS;

                let newImage = await Image.create({
                    id: crypto.randomUUID(),
                    server,
                    owner: ownerUUID,
                    ownerString: ownerUUID,
                    width: m.dimension.width,
                    height: m.dimension.height,
                    format: m.format
                });

                let fp = path.join(process.env.LOCAL_STORAGE_PATH, "image", newImage.id);
                await Bun.write(fp, buf);
                await newImage.save();

                return new Response(JSON.stringify({
                    id: newImage.id,
                    owner: ownerUUID,
                    revokationToken: newImage.revokationToken,
                    imageSourceFormat: m.format,
                    imageDimensions: m.dimension
                }), {
                    headers: {
                        "content-type": "application/json"
                    }
                });
            } catch (e) {
                console.error("upload-image: error\n", e);
                return generateErrorResponse(ErrorCode.Unknown, "An error occurred while processing the image", 500);
            }
        }
        default:
            return generateErrorResponse(ErrorCode.MethodNotAllowed, "Method not allowed", 405);
    }
}
