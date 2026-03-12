import { createContext } from "react";

export interface Point {
	x: number;
	y: number;
}

export interface GestureData {
	point: Point;
	timestamp: number;
}

export interface SocketData {
	lastPointer: Point | null;
	content: any;
}

export interface Data {
	mode: "operation" | "mirror";
	gestures: GestureData[][];
	lastPointer: Point | null;
	tapStatus: "single" | "double" | "long" | null;
	content: any;
	wrapperX: number;
	wrapperY: number;
	wrapperWidth: number;
	wrapperHeight: number;
	resetGestures: () => void;
	// biome-ignore lint: may return a no operation function
	setContent: (content: any) => void | ((content: any) => any);
	setPointerEnabled: (enabled: boolean) => void;
}

export const initialData: Data = {
	mode: "operation",
	gestures: [],
	lastPointer: null,
	tapStatus: null,
	content: {},
	wrapperX: 0,
	wrapperY: 0,
	wrapperWidth: 0,
	wrapperHeight: 0,
	resetGestures: () => {},
	setContent: () => {},
	setPointerEnabled: () => {},
};

export const DataContext = createContext<Data>(initialData);
