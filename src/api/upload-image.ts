import { APIKey, Image } from "../database";
import { ErrorCode } from "../error-enum";
import { boyerMooreStringSearch, generateErrorResponse } from "../utils";
import path from "node:path";
import { ImageMagick, ffprobeExec } from "../image-process";
import { FFmpegMapping, FFmpegMappingFormat } from "../ffmpeg-codec-map";
import { Resvg } from "@resvg/resvg-js";

const MAXIMUM_EDGE = isNaN(Number(process.env.MAX_IMAGE_EDGE)) ? 0 : Number(process.env.MAX_IMAGE_EDGE);
const MAXIMUM_PIXELS = isNaN(Number(process.env.MAX_IMAGE_PIXELS)) ? 0 : Number(process.env.MAX_IMAGE_HEIGHT);

const CONSTANT_IDAT = new TextEncoder().encode("IDAT");
const CONSTANT_ACTL = new TextEncoder().encode("acTL");

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

        if (process.env.API_AUTH_ENABLED === "true" && process.env.MASTER_API_KEY && key === process.env.MASTER_API_KEY) {
            ownerUUID = null; // master key does not have an owner
        } else {
            if (!key.startsWith("kona_sk_")) {
                return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);
            }

            let apiObject = await APIKey.findOne({
                where: {
                    key
                }
            });

            if (!apiObject)
                return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);

            ownerUUID = apiObject.uuid;
        }
    }

    switch (request.method) {
        case "POST": {
            if ((request.headers.get("Content-Type") ?? "").split(";")[0] !== "multipart/form-data")
                return generateErrorResponse(ErrorCode.InvalidContentType, "Invalid Content-Type header", 415);

            let formData = await request.formData();
            let image = formData.get("image");
            let disableResizingF = formData.get("disableResizing");

            let disableResizing = false;
            if (typeof disableResizingF === "string") {
                disableResizing = disableResizingF === "1";
            }

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

                // TODO: refactor and move this to a separate function
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
                        let o = {
                            format: i.format,
                            dimension: {
                                width: i.width,
                                height: i.height
                            }
                        };

                        i.dispose();

                        return o;
                    });

                    if (m.format === "PNG") {
                        // ImageMagick does not detect APNG since it only assumes PNG and does not read subsequent chunks.
                        // This is a workaround to detect APNG. ffmpeg is used here since ImageMagick cannot read and detect APNG natively.
                        let idatPos = boyerMooreStringSearch(uint8, CONSTANT_IDAT);
                        let actlPos = boyerMooreStringSearch(uint8, CONSTANT_ACTL);

                        if (actlPos + 1 && idatPos + 1 && actlPos < idatPos) {
                            retryFFmpeg = true;
                        }
                    }
                } catch (e) {
                    if (String(e).includes("'inkscape'")) {
                        // Might be SVG.
                        try {
                            const svg = new Resvg(new TextDecoder().decode(uint8));

                            m = {
                                format: "SVG",
                                dimension: {
                                    width: svg.width,
                                    height: svg.height
                                }
                            }
                        } catch (e1) {
                            console.error("upload-image: error", String(e1), "(SVG render attempt) - original", String(e));
                        }
                    } else {
                        console.error("upload-image: error", String(e));
                        retryFFmpeg = true;
                    }
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

                        if (!m.format) {
                            // Try remapping using container format.
                            let containerFormat = FFmpegMappingFormat[probe.format.format_name];

                            if (typeof containerFormat === "function") {
                                m.format = await containerFormat(uint8);
                            } else {
                                m.format = containerFormat;
                            }
                        }

                        if (!m.format || !m.dimension.width || !m.dimension.height) {
                            return generateErrorResponse(ErrorCode.InvalidImageInput, "Invalid image", 400);
                        }
                    } catch (e) {
                        console.error("upload-image-retry-ffmpeg: error", String(e));
                        return generateErrorResponse(ErrorCode.InvalidImageInput, "Invalid image", 400);
                    }
                }

                m = m!; // making TypeScript happy

                if (m.format === "UNKNOWN") {
                    return generateErrorResponse(ErrorCode.InvalidImageInput, "Invalid image", 400);
                }

                let pixels = m.dimension.width * m.dimension.height;
                if (MAXIMUM_PIXELS && pixels > MAXIMUM_PIXELS) {
                    return generateErrorResponse(ErrorCode.InvalidImageInput, `Image resolution too high (maximum ${MAXIMUM_PIXELS}, got ${pixels})`, 413);
                }

                if (MAXIMUM_EDGE && (m.dimension.width > MAXIMUM_EDGE || m.dimension.height > MAXIMUM_EDGE)) {
                    return generateErrorResponse(ErrorCode.InvalidImageInput, `Image dimension too high (maximum edge ${MAXIMUM_EDGE}, got ${m.dimension.width}x${m.dimension.height})`, 413);
                }

                let server = process.env.SERVER_ADDRESS;

                let newImage = await Image.create({
                    id: crypto.randomUUID(),
                    server,
                    owner: ownerUUID,
                    ownerString: ownerUUID,
                    width: m.dimension.width,
                    height: m.dimension.height,
                    format: m.format,
                    disableResizing
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
