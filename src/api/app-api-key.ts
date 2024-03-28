import { APIKeys } from "../database";
import { generateErrorResponse } from "../utils";

export default async function MasterAPIKey(url: URL, request: Request) {
    if (!request.headers.has("Authorization"))
        return generateErrorResponse(3, "Missing Authorization header", 401);

    if (!process.env.MASTER_API_KEY || request.headers.get("Authorization") !== `Bearer ${process.env.MASTER_API_KEY}`) {
        console.log(request.headers.get("Authorization"), `Bearer ${process.env.MASTER_API_KEY}`);
        return generateErrorResponse(4, "Invalid Authorization header", 401);
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
        default:
            return generateErrorResponse(5, "Method not allowed", 405);
    }
}
