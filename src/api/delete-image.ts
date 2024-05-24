import { APIKey, Image } from "../database";
import { ErrorCode } from "../error-enum";
import { consumeInput, generateErrorResponse } from "../utils";
import fs from "node:fs";
import path from "node:path";

export default async function DeleteImage(url: URL, request: Request) {
    if (!request.headers.has("Authorization"))
        return generateErrorResponse(ErrorCode.MissingAuthorization, "Missing Authorization header", 401);

    let auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer "))
        return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);

    let key = auth.slice(7);

    let ownerUUID: string | null = null;
    let imageKeyQuery: Image | null = null;
    // Check if request uses master key
    if (process.env.MASTER_API_KEY && (key === process.env.MASTER_API_KEY)) {
        ownerUUID = null; // master key can see everything
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
        } else if (key.startsWith("kona_ri_")) {
            imageKeyQuery = await Image.findOne({
                where: {
                    revokationToken: key
                }
            });

            if (!imageKeyQuery)
                return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);
        } else {
            return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);
        }
    }

    switch (request.method) {
        case "DELETE": {
            let data = await consumeInput(request) as { uuid: string };
            if (!("uuid" in data))
                return generateErrorResponse(ErrorCode.Unknown, "Missing required parameters", 400);
            
            if (imageKeyQuery && imageKeyQuery.id !== data.uuid)
                return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);

            let image = imageKeyQuery || await Image.findOne({
                where: {
                    id: data.uuid,
                    owner: ownerUUID
                }
            });

            if (!image)
                return generateErrorResponse(ErrorCode.NotFound, "Image not found", 404);

            await fs.promises.unlink(path.join(process.env.LOCAL_STORAGE_PATH, "image", image.id))
                .catch(() => {}); // ignore errors
            await image.destroy();

            return new Response(JSON.stringify({
                message: "Image deleted"
            }), {
                headers: { 'content-type': 'application/json' }
            });
        }
        default:
            return generateErrorResponse(ErrorCode.MethodNotAllowed, "Method not allowed", 405);
    }
}
