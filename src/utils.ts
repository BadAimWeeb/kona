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
