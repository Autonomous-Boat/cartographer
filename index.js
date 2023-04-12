import * as socketio from "socket.io";
import tilestrata from "tilestrata";
import tilestrataDisk from "tilestrata-disk";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const app = express();
const strata = tilestrata();
const server = http.createServer(app);
const io = new socketio.Server(server);

app.use("/", express.static(path.join(__dirname, "public")));

strata.layer("osm").route("tile.png").use(
    tilestrataDisk.cache({
        dir: path.join(__dirname, "tiles"),
        layer: "osm",
        name: "tile.png",
    })
);
app.use(tilestrata.middleware({server: strata, prefix: "/tiles"}));

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
