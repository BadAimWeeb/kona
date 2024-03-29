import { APIKeys } from "../database";
import { ErrorCode } from "../error-enum";
import { consumeInput, generateErrorResponse, randomStuff } from "../utils";

export default async function MasterAPIKey(_url: URL, request: Request) {
    if (!request.headers.has("Authorization"))
        return generateErrorResponse(ErrorCode.MissingAuthorization, "Missing Authorization header", 401);

    if (!process.env.API_AUTH_ENABLED || !process.env.MASTER_API_KEY || request.headers.get("Authorization") !== `Bearer ${process.env.MASTER_API_KEY}`) {
        return generateErrorResponse(ErrorCode.InvalidAuthorization, "Invalid Authorization header", 401);
    }

    switch (request.method) {
        case "POST":
            let newAPI = await APIKeys.create();
            return new Response(JSON.stringify({
                key: newAPI.key,
                uuid: newAPI.uuid
            }), {
                headers: { 'content-type': 'application/json' }
            });
        case "PATCH":
            let data = await consumeInput(request) as { uuid: string } | { key: string };
            if (!("uuid" in data) && !("key" in data))
                return generateErrorResponse(ErrorCode.Unknown, "Missing required parameters", 400);

            if ("uuid" in data && "key" in data)
                return generateErrorResponse(ErrorCode.Unknown, "Cannot revoke using both key and uuid at the same time", 400);

            if (!("uuid" in data && data.uuid || "key" in data && data.key))
                return generateErrorResponse(ErrorCode.Unknown, "Missing required parameters", 400);
            
            let key = await APIKeys.findOne({
                where: ("uuid" in data && data.uuid) ? { uuid: data.uuid } : ("key" in data && data.key) ? { key: data.key } : { uuid: "NOT_AN_UUID_SHOULD_NOT_REACH" }
            });

            if (!key)
                return generateErrorResponse(ErrorCode.NotFound, "API key not found", 404);

            let newKey = await key.update({ key: "kona_sk_" + randomStuff(32) });

            return new Response(JSON.stringify({
                key: newKey.key,
                uuid: newKey.uuid
            }), {
                headers: { 'content-type': 'application/json' }
            });
        default:
            return generateErrorResponse(ErrorCode.MethodNotAllowed, "Method not allowed", 405);
    }
}
