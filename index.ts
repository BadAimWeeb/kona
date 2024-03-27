import packageJSON from "./package.json";

const httpServer = Bun.serve({
    fetch(request) {
        const requestURL = new URL(request.url);

        if (requestURL.pathname.startsWith("/api/")) {
            return new Response(`{"error":"API not found","error_code":1,"kona_version":"${packageJSON.version}"}`, {
                headers: { 'content-type': 'application/json' },
                status: 404,
                statusText: "Not Found"
            });
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
