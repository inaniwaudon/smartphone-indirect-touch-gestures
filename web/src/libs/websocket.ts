const RECONNECTION_MS = 2000;

let socket: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;

/**
 * Connect to WebSocket
 * @param mode Mode
 * @param port Port
 * @param onMessage Callback function called on message received
 */
export const connectWebSocket = (
  mode: "mirror" | "operation",
  port: string,
  onMessage: (event: MessageEvent) => void,
) => {
  // Disconnect if already connected
  if (socket) {
    socket.close();
  }

  const wsUrl = `${import.meta.env.VITE_WEBSOCKET_URL}:${port}`;
  socket = new WebSocket(wsUrl);
  console.log("[WebSocket] Connecting to", wsUrl);

  socket.onopen = () => {
    console.log("[WebSocket] Connected");
    sendMessage(JSON.stringify({ mode }));
  };

  socket.onmessage = onMessage;

  socket.onclose = () => {
    console.log("[WebSocket] Disconnected");
  };

  socket.onerror = (err) => {
    console.error("[WebSocket] Error", err);

    // Attempt reconnection
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    reconnectTimeout = setTimeout(() => {
      connectWebSocket(mode, port, onMessage);
    }, RECONNECTION_MS);
  };
};

/**
 * Disconnect from WebSocket
 */
export const disconnectWebSocket = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
};

/**
 * Send a message
 * @param message Message to send
 */
export const sendMessage = (message: string) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn("[WebSocket] Not connected", message);
    return;
  }
  socket.send(message);
};

/**
 * Send data
 * @param data Data to send
 */
export const sendData = (data: any) => {
  sendMessage(JSON.stringify({ data }));
};

/**
 * Send a log message
 * @param log Log message
 */
export const sendLog = (log: string) => {
  sendMessage(JSON.stringify({ log }));
};
