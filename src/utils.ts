import packageJSON from "../package.json";
import crypto from "node:crypto";

export function randomStuff(bytes: number) {
    return Buffer.from(crypto.randomBytes(bytes)).toString("base64url").replace(/[_-]/g, "");
}

export function generateErrorJSON(error: number, message: string) {
    return JSON.stringify({ error: message, error_code: error, kona_version: packageJSON.version });
}

export function generateErrorResponse(error: number, message: string, httpError: number = 500) {
    return new Response(generateErrorJSON(error, message), {
        headers: { 'content-type': 'application/json' },
        status: httpError
    });
}

export async function consumeInput(request: Request) {
    let contentType = (request.headers.get("Content-Type") || "application/json").split(";")[0].trim();
    let body = await request.text();
    if (contentType === "application/json") {
        try {
            return JSON.parse(body);
        } catch (e) {
            throw new Error("Invalid JSON body");
        }
    } else if (contentType === "application/x-www-form-urlencoded") {
        let output: Record<string, string> = {};
        for (let pair of body.split("&")) {
            let [key, value] = pair.split("=");
            output[decodeURIComponent(key)] = decodeURIComponent(value);
        }
        return output;
    } else {
        throw new Error("Unsupported Content-Type");
    }
}
