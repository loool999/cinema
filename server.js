import express from "express";
import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBareServer } from "@tomphttp/bare-server-node";
import wisp from "wisp-server-node";

import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { scramjetPath } from "@mercuryworkshop/scramjet/lib/index.cjs";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { bareModulePath } from "@mercuryworkshop/bare-as-module3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer();
const bare = createBareServer("/bare/");

// Serve static files
app.use(express.static(join(__dirname, "public")));
app.use("/uv/service/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/scram/", express.static(scramjetPath));
app.use("/baremux/", express.static(baremuxPath));
app.use("/baremod/", express.static(bareModulePath));

// 404 page
app.use((req, res) => {
  res.status(404).sendFile(join(__dirname, "public", "404.html"));
});

// Main request handler
server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

// Upgrade handler
server.on("upgrade", (req, socket, head) => {
    if (req.url.includes("/wisp/")) {
        wisp.routeRequest(req, socket, head);
    } else if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.destroy();
    }
});

const port = process.env.PORT || 8080;

server.on("listening", () => {
  const address = server.address();
  console.log("Listening on:");
  console.log(`	http://localhost:${address.port}`);
  console.log(`	http://${address.family === "IPv6" ? `[${address.address}]` : address.address}:${address.port}`);
});

// Graceful shutdown
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  server.close();
  bare.close();
  process.exit(0);
}

server.listen(port);