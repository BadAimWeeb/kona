import fs from "fs";
import packageJSON from "./package.json";
import { handleRouter } from "./src/api-router";
import { generateErrorResponse } from "./src/utils";
import { handleHTTPDelivery } from "./src/delivery/http";
import Swagger from "swagger-ui-dist";
import path from "path";

const SwaggerPath = Swagger.getAbsoluteFSPath();

const httpServer = Bun.serve({
    async fetch(request) {
        const requestURL = new URL(request.url);

        if (requestURL.pathname.startsWith("/api/")) {
            // Check if target can accept JSON
            let acceptHeader = request.headers.get("Accept");
            if (acceptHeader) {
                let acceptTypes = acceptHeader.split(",").map((x) => x.trim());
                let isOK = false;
                for (let type of acceptTypes) {
                    switch (type.split(";")[0]) {
                        case "*/*":
                        case "application/*":
                        case "application/json":
                            isOK = true;
                            break;
                    }
                }

                if (!isOK) {
                    return new Response(`HTTP 406 Not Acceptable. API endpoint can only return JSON (application/json), please include it in Accept headers.\n\nKona v${packageJSON.version} - https://github.com/BadAimWeeb/kona`, {
                        headers: { 'content-type': 'text/plain' },
                        status: 404,
                        statusText: "Not Found"
                    });
                }
            }

            let newRequestURL = new URL(requestURL.href.replace("/api/", "/"));

            try {
                let api = await handleRouter(newRequestURL, request);
                api.headers.set("access-control-allow-origin", "*");

                return api;
            } catch {
                return generateErrorResponse(1, "API not found", 404);
            }
        }

        if (requestURL.pathname.startsWith("/cdn/")) {
            let rt = await handleHTTPDelivery(requestURL, request);
            rt.headers.set("access-control-allow-origin", "*");

            return rt;
        }

        if (requestURL.pathname === "/openapi.yaml") {
            let oapi = fs.readFileSync("./openapi.yaml", "utf-8");
            return new Response(oapi
                // .replace("- url: https", `- url: ${requestURL.protocol}//${requestURL.hostname}${requestURL.port !== (requestURL.protocol === "https:" ? "443" : "80") ? (":" + requestURL.port) : ""}`)
                , {
                headers: { 'content-type': 'application/yaml', 'access-control-allow-origin': '*' }
            });
        }

        // this code kinda sucks
        if (requestURL.pathname.startsWith("/docs/") || requestURL.pathname === "/docs") {
            if (requestURL.pathname === "/docs") {
                // Redirect to /docs/
                return new Response("", {
                    status: 301,
                    headers: { 'location': '/docs/' }
                });
            }

            if (requestURL.pathname === "/docs/swagger-initializer.js") {
                return new Response(`
                    window.onload = function() {
                        window.ui = SwaggerUIBundle({
                            //url: "${requestURL.protocol}//${requestURL.hostname}${requestURL.port !== (requestURL.protocol === "https:" ? "443" : "80") ? (":" + requestURL.port) : ""}/openapi.yaml",
                            url: "/openapi.yaml",
                            dom_id: '#swagger-ui',
                            deepLinking: true,
                            presets: [
                                SwaggerUIBundle.presets.apis,
                                SwaggerUIStandalonePreset
                            ],
                            plugins: [
                                SwaggerUIBundle.plugins.DownloadUrl
                            ],
                            layout: "StandaloneLayout"
                        });
                    };
                `, {
                    headers: { 'content-type': 'application/javascript' }
                })
            }

            let filePath = path.join(SwaggerPath, requestURL.pathname.replace("/docs", ""));
            if (fs.existsSync(filePath)) {
                if (fs.statSync(filePath).isDirectory()) {
                    filePath = path.join(filePath, "index.html");
                    if (fs.existsSync(filePath)) {
                        return new Response(Bun.file(filePath));
                    }
                } else {
                    return new Response(Bun.file(filePath));
                }
            }
        }

        return new Response(`HTTP 404 Not Found. Are you sure you're at the right address?\n\nKona v${packageJSON.version} - https://github.com/BadAimWeeb/kona`, {
            headers: { 'content-type': 'text/plain' },
            status: 404,
            statusText: "Not Found"
        });
    }
});

console.log(`Kona server v${packageJSON.version} is now running on port ${httpServer.port}`);

process.on("SIGINT", () => {
    console.log("Shutting down Kona server...");
    httpServer.stop();
});
