import { WebSocketServer, WebSocket } from "ws";
import { writeFile, mkdirSync } from "fs";
import os from "os";
import dotenv from "dotenv";

/**
 * Get the local IPv4 address
 */
const getLocalIpAddress = (): string | undefined => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return undefined;
}

const main = async () => {
  // Configure the environment variables
  dotenv.config();
  const host = getLocalIpAddress();
  const port = Number(process.env.PORT ?? 8765);
  const recordsDir = process.env.RECORDS_DIR ?? "records";

  // Create the output directory if it doesn't exist
  mkdirSync(recordsDir, { recursive: true });

  // Launch the WebSocket server
  const wss = new WebSocketServer({ port, host });

  // Operation client (Smartphone) and mirror client (HMD)
  let clientOperation: WebSocket | null = null;
  let clientMirror: WebSocket | null = null;

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      const text = message.toString("utf-8");
      if (text.includes("log")) {
        console.log("log:", text);
      }

      // Client assignment
      const data = JSON.parse(text);
      if (data.mode === "operation") {
        clientOperation = ws;
        console.log("operation client connected");
      }
      if (data.mode === "mirror") {
        clientMirror = ws;
        console.log("mirror client connected");
      }

      // Receive from Smartphone and forward to HMD
      if (
        ws === clientOperation &&
        clientMirror &&
        clientMirror.readyState === WebSocket.OPEN
      ) {
        clientMirror.send(text);
      }

      // Write the data to a JSON file
      if ("data" in data && data.data.type && data.data.timestamp) {
        const filename = `./${recordsDir}/${data.data.type}-${data.data.timestamp}.json`;
        try {
          writeFile(filename, JSON.stringify(data), "utf8", () => {});
        } catch (e) {
          console.error(`Failed to write ${filename}:`, e);
        }
      }
    });

    // Handle the client disconnection
    ws.on("close", () => {
      if (ws === clientOperation) {
        console.log("operation client disconnected");
        clientOperation = null;
      }
      if (ws === clientMirror) {
        console.log("mirror client disconnected");
        clientMirror = null;
      }
    });
  });

  console.log(`Launched: ws://${host}:${port}`);
}

main()
