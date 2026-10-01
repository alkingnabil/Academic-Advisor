import { createServer } from "node:http";

const SELF_PING_INTERVAL_MS = 10 * 60 * 1000;

// Render free tier sleeps the container after ~15 min without inbound HTTP. Long polling is
// outbound-only, so the bot pings its own public URL to reset the idle timer and stay awake.
function startSelfPing(externalUrl) {
  const ping = async () => {
    try {
      const response = await fetch(externalUrl, { signal: AbortSignal.timeout(10_000) });
      console.log("self-ping:", response.status);
    } catch (error) {
      console.error("self-ping failed:", error.message.slice(0, 80));
    }
  };
  ping();
  const timer = setInterval(ping, SELF_PING_INTERVAL_MS);
  timer.unref();
  return timer;
}

export function startKeepalive(port, externalUrl) {
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("FCI Advisor Bot is running\n");
  });
  server.listen(port);
  if (externalUrl) startSelfPing(externalUrl);
  return server;
}
