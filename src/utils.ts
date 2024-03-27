import crypto from "node:crypto";

export function randomStuff(bytes: number) {
    return Buffer.from(crypto.randomBytes(bytes)).toString("base64url").replace(/[_-]/g, "");
}
