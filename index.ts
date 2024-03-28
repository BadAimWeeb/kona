import packageJSON from "./package.json";
import { handleRouter } from "./src/api-router";
import { generateErrorResponse } from "./src/utils";

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
                return handleRouter(newRequestURL, request);
            } catch {
                return generateErrorResponse(1, "API not found", 404);
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
