const httpServer = Bun.serve({
    fetch(request) {
        return new Response('Hello, world!', {
            headers: { 'content-type': 'text/plain' },
        });
    }
});

process.on("SIGINT", () => {
    console.log("Shutting down Kona server...");
    httpServer.stop();
});
