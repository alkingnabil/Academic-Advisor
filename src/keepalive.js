import { createServer } from "node:http";

export function startKeepalive(port) {
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("FCI Advisor Bot is running\n");
  });
  server.listen(port);
  return server;
}
