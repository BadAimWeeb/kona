import { APIKey, Image } from "../database";
import { ErrorCode } from "../error-enum";
import { generateErrorResponse } from "../utils";
import { Op, type FindOptions, type InferAttributes } from "sequelize";

export default async function MasterAPIKey(url: URL, request: Request) {
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
        }
    }

    switch (request.method) {
        case "GET": {
            let limit = +(url.searchParams.get("limit") ?? "10");
            if (isNaN(limit) || limit < 1 || limit > 100)
                return generateErrorResponse(ErrorCode.InvalidQuery, "Invalid limit query", 400);

            let cursor = url.searchParams.get("cursor");
            let cPtr: number | void = void 0;
            if (cursor) {
                cPtr = parseInt(cursor);
                if (isNaN(cPtr))
                    return generateErrorResponse(ErrorCode.InvalidQuery, "Invalid cursor query", 400);
            }

            let queryObj: FindOptions<InferAttributes<Image>> = {
                where: {}
            };

            if (cPtr) {
                // @ts-ignore
                queryObj.where.createdAt = {
                    [Op.lt]: new Date(cPtr)
                }
            }
            queryObj.limit = limit;

            if (ownerUUID !== null) {
                // @ts-ignore
                queryObj.where.ownerUUID = ownerUUID;
            }

            queryObj.order = [["createdAt", "DESC"]];

            let images = imageKeyQuery ? [imageKeyQuery] : await Image.findAll(queryObj);
            let nextCursor = imageKeyQuery ? null : (images.length === limit ? images.at(-1)!.createdAt.getTime().toString() : null);

            return new Response(JSON.stringify({
                images: images.map((img) => {
                    return {
                        id: img.id,
                        ownerUUID: img.owner,
                        originalOwnerUUID: img.ownerString,
                        createdAt: img.createdAt.getTime(),
                        sourceFormat: img.format,
                        sourceDimensions: {
                            width: img.width,
                            height: img.height
                        }
                    };
                }),
                nextCursor
            }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            });
        }
        default:
            return generateErrorResponse(ErrorCode.MethodNotAllowed, "Method not allowed", 405);
    }
}
