import { APIKey, Image } from "../database";
import { ErrorCode } from "../error-enum";
import { generateErrorResponse } from "../utils";
import { Magick } from "magickwand.js";
import path from "node:path";

export default async function UploadImage(_url: URL, request: Request) {
    let ownerUUID: string | null = null;
    if (process.env.API_AUTH_ENABLED) {
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
                let blob = new Magick.Blob(buf);
                let m = new Magick.Image(blob);

                if (!m.isValid()) {
                    return generateErrorResponse(ErrorCode.Unknown, "Invalid image", 400);
                }

                let server = process.env.SERVER_ADDRESS;

                let newImage = await Image.create({
                    id: crypto.randomUUID(),
                    server,
                    owner: ownerUUID,
                    ownerString: ownerUUID
                });

                let fp = path.join(process.env.LOCAL_STORAGE_PATH, "image", newImage.id);
                await Bun.write(fp, buf);
                await newImage.save();

                return new Response(JSON.stringify({
                    id: newImage.id,
                    owner: ownerUUID,
                    revokationToken: newImage.revokationToken
                }), {
                    headers: {
                        "content-type": "application/json"
                    }
                });
            } catch {
                return generateErrorResponse(ErrorCode.Unknown, "An error occurred while processing the image", 500);
            }
        }
        default:
            return generateErrorResponse(ErrorCode.MethodNotAllowed, "Method not allowed", 405);
    }
}
