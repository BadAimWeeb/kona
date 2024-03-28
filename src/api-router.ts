import AppAPIKey from "./api/app-api-key";

const API: Record<string, (url: URL, request: Request) => Response | Promise<Response>> = {
    "app-api-key": AppAPIKey
};

export async function handleRouter(url: URL, request: Request): Promise<Response> {
    let route = url.pathname.split("/")[1] ?? "";
    if (route in API) {
        try {
            return API[route](url, request);
        } catch (e) {
            console.log(e);
            return new Response(`{"error":"An unknown error occurred","error_code":2}`, {
                headers: { 'content-type': 'application/json' },
                status: 500,
                statusText: "Internal Server Error"
            });
        }
    } else {
        throw null;
    }      
}
