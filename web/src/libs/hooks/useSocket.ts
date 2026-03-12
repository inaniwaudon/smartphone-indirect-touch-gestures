import { useCallback, useEffect, useState } from "react";

import type { Point } from "../data";
import {
	connectWebSocket,
	disconnectWebSocket,
	sendMessage,
} from "../websocket";

export const useSocket = (
	mode: "mirror" | "operation",
	lastPointer: Point | null,
	pointerEnabled: boolean,
	tapStatus: "single" | "double" | "long" | null,
	content: any,
	port: string,
) => {
	const [socketLastPointer, setSocketLastPointer] = useState<Point | null>(
		null,
	);
	const [socketPointerEnabled, setSocketPointerEnabled] =
		useState<boolean>(true);
	const [socketTapStatus, setSocketTapStatus] = useState<
		"single" | "double" | "long" | null
	>(null);
	const [socketContent, setSocketContent] = useState<any>({});

	const onMessage = useCallback(
		(event: MessageEvent) => {
			if (mode === "operation") {
				return;
			}
			try {
				// Apply received data to state
				const data = JSON.parse(event.data);
				if ("lastPointer" in data) {
					setSocketLastPointer(data.lastPointer);
				}
				if ("pointerEnabled" in data) {
					setSocketPointerEnabled(data.pointerEnabled);
				}
				if ("tapStatus" in data) {
					setSocketTapStatus(data.tapStatus);
				}
				if (data.content) {
					setSocketContent(data.content);
				}

				// Display log
				if (data.log) {
					console.log("[WebSocket] Log", data.log);
				}
			} catch (e) {
				console.error("[WebSocket] JSON parse error", e);
			}
		},
		[mode],
	);

	useEffect(() => {
		// Send to WebSocket when state changes
		if (mode === "operation") {
			sendMessage(
				JSON.stringify({ lastPointer, pointerEnabled, tapStatus, content }),
			);
		}
	}, [mode, lastPointer, pointerEnabled, tapStatus, content]);

	useEffect(() => {
		// Connect
		connectWebSocket(mode, port, onMessage);
		return () => {
			disconnectWebSocket();
		};
	}, [mode, port, onMessage]);

	// Return values based on mode
	const finalLastPointer =
		mode === "operation" ? lastPointer : socketLastPointer;
	const finalPointerEnabled =
		mode === "operation" ? pointerEnabled : socketPointerEnabled;
	const finalTapStatus = mode === "operation" ? tapStatus : socketTapStatus;
	const finalContent = mode === "operation" ? content : socketContent;

	return {
		finalLastPointer,
		finalPointerEnabled,
		finalTapStatus,
		finalContent,
	};
};
