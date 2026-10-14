import { createReadStream, promises as fs } from "node:fs";
import { createServer } from "node:http";
import { extname, isAbsolute, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handler as apiHandler } from "./index.js";

const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp"
};

export function createLocalHandler(rootDirectory = process.cwd(), api = apiHandler) {
    const root = resolve(rootDirectory);

    return async (request, response) => {
        const requestUrl = new URL(request.url || "/", "http://localhost");
        if (requestUrl.pathname.startsWith("/api/") || request.method === "OPTIONS") {
            return api(request, response);
        }
        if (!["GET", "HEAD"].includes(request.method)) {
            response.writeHead(405, { Allow: "GET, HEAD, OPTIONS" });
            response.end();
            return;
        }

        let pathname;
        try {
            pathname = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
        } catch {
            response.writeHead(400);
            response.end();
            return;
        }

        pathname = normalize(pathname).replaceAll("\\", "/");
        const isPublicFile = pathname === "/index.html"
            || ["/css/", "/imagens/", "/js/", "/paginas/"].some((prefix) => pathname.startsWith(prefix));
        if (!isPublicFile) {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Arquivo não encontrado.");
            return;
        }

        const filePath = resolve(root, `.${pathname}`);
        const relativePath = relative(root, filePath);
        if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
            response.writeHead(403);
            response.end();
            return;
        }

        try {
            const fileInfo = await fs.stat(filePath);
            if (!fileInfo.isFile()) throw new Error("Not a file");
            response.writeHead(200, {
                "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
                "Content-Length": fileInfo.size,
                "X-Content-Type-Options": "nosniff"
            });
            if (request.method === "HEAD") response.end();
            else createReadStream(filePath).pipe(response);
        } catch {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Arquivo não encontrado.");
        }
    };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const port = Number(process.env.PORT || 3000);
    createServer(createLocalHandler()).listen(port, "0.0.0.0", () => {
        console.log(`Yokai Tales disponível em http://localhost:${port}`);
    });
}
