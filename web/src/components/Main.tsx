import { css, Global } from "@emotion/react";
import styled from "@emotion/styled";
import { useEffect, useRef, useState } from "react";

import { DataContext, type Point } from "@/libs/data";
import {
	DOUBLE_TAP_TIME_THRESHOLD,
	LONG_PRESS_RANGE_THRESHOLD,
	LONG_PRESS_TIME_THRESHOLD,
} from "@/libs/env";
import useGesture from "@/libs/hooks/useGesture";
import { useSocket } from "@/libs/hooks/useSocket";

const pointerRadius = 5;

const globalStyle = css`
  html,
  body {
    width: 100dvw;
    height: 100dvh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #000;
    top: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;

const Wrapper = styled.div<{ select: boolean }>`
  width: 390px;
  height: 800px;
  font-family: system-ui;
  position: relative;
  overflow: hidden;
  user-select: ${({ select }) => (select ? "auto" : "none")};
`;

const Pointer = styled.div<{ x: number; y: number; color: string }>`
  width: ${pointerRadius * 2}px;
  height: ${pointerRadius * 2}px;
  background: ${({ color }) => color};
  border-radius: ${pointerRadius}px;
  position: absolute;
  left: ${({ x }) => x - pointerRadius}px;
  top: ${({ y }) => y - pointerRadius}px;
  z-index: 200;
`;

const DoublePointer = styled.div<{ x: number; y: number }>`
  width: ${pointerRadius * 2}px;
  height: ${pointerRadius * 2}px;
  background: #ff0;
	border: 4px solid #000;
	outline: 2px solid #ff0;
  border-radius: ${pointerRadius + 4}px;
  position: absolute;
  left: ${({ x }) => x - pointerRadius}px;
  top: ${({ y }) => y - pointerRadius}px;
  z-index: 200;
`;

interface AppProps {
	mode: "operation" | "mirror";
	port: string;
	children: React.ReactNode;
}

const Main = ({ mode, port, children }: AppProps) => {
	const type = location.pathname.includes("scroll") ? "scroll" : "pointing";

	const [tapStatus, setTapStatus] = useState<
		"single" | "double" | "long" | null
	>(null);
	const [content, setContent] = useState<any>({});
	const [pointerEnabled, setPointerEnabled] = useState(true);

	const wrapperRef = useRef<HTMLDivElement>(null);
	const lastTouchdownTimeRef = useRef<number | null>(null);
	const touchDownPositionRef = useRef<Point | null>(null);
	const withinLongPressRangeRef = useRef(true);

	// Dictionary to track multiple pointers
	const activePointersRef = useRef<Record<number, { x: number; y: number }>>(
		{},
	);

	// Call start/add/endGesture in each event handler
	const {
		gestures,
		lastPointer,
		startGesture,
		addGesture,
		endGesture,
		resetGestures,
	} = useGesture();

	const {
		finalLastPointer,
		finalContent,
		finalPointerEnabled,
		finalTapStatus,
	} = useSocket(mode, lastPointer, pointerEnabled, tapStatus, content, port);

	// Event handlers
	const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (mode === "mirror") {
			return;
		}
		if (!wrapperRef.current) {
			return;
		}
		event.preventDefault();

		// Events fire one finger at a time, so store in a dictionary and process together
		const point = {
			x: event.clientX - wrapperRef.current.offsetLeft,
			y: event.clientY - wrapperRef.current.offsetTop,
		};
		activePointersRef.current[event.pointerId] = point;
		const pointers = [...Object.values(activePointersRef.current)];
		startGesture(pointers[0]);

		if (
			lastTouchdownTimeRef.current &&
			Date.now() - lastTouchdownTimeRef.current < DOUBLE_TAP_TIME_THRESHOLD
		) {
			setTapStatus("double");
		} else {
			setTapStatus("single");
		}

		lastTouchdownTimeRef.current = Date.now();
		touchDownPositionRef.current = point;
		withinLongPressRangeRef.current = true;
	};

	const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (mode === "mirror") {
			return;
		}
		if (!wrapperRef.current || !tapStatus) {
			return;
		}
		event.preventDefault();

		const point = {
			x: event.clientX - wrapperRef.current.offsetLeft,
			y: event.clientY - wrapperRef.current.offsetTop,
		};
		if (
			touchDownPositionRef.current &&
			Math.sqrt(
				(point.x - touchDownPositionRef.current.x) ** 2 +
					(point.y - touchDownPositionRef.current.y) ** 2,
			) > LONG_PRESS_RANGE_THRESHOLD
		) {
			withinLongPressRangeRef.current = false;
		}

		if (
			withinLongPressRangeRef.current &&
			lastTouchdownTimeRef.current &&
			Date.now() - lastTouchdownTimeRef.current > LONG_PRESS_TIME_THRESHOLD
		) {
			setTapStatus("long");
		}

		activePointersRef.current[event.pointerId] = point;
		const pointers = [...Object.values(activePointersRef.current)];
		addGesture(pointers[0]);
	};

	const onPointerUp = () => {
		if (mode === "mirror") {
			return;
		}
		if (!wrapperRef.current) {
			return;
		}
		endGesture();
		activePointersRef.current = {};
	};

	useEffect(() => {
		document.addEventListener(
			"touchmove",
			(e) => {
				// Suppress default behavior for pointing
				// Use default behavior for scrolling
				if (type === "pointing") {
					e.preventDefault();
				}
			},
			{ passive: false },
		);
	}, [type]);

	return (
		<DataContext.Provider
			value={{
				mode: mode,
				gestures: gestures,
				lastPointer: finalLastPointer,
				tapStatus,
				content: finalContent,
				wrapperX: wrapperRef.current?.offsetLeft ?? 0,
				wrapperY: wrapperRef.current?.offsetTop ?? 0,
				wrapperWidth: wrapperRef.current?.offsetWidth ?? 0,
				wrapperHeight: wrapperRef.current?.offsetHeight ?? 0,
				resetGestures,
				setContent: mode === "operation" ? setContent : () => {},
				setPointerEnabled,
			}}
		>
			<Global styles={globalStyle} />
			<Wrapper
				ref={wrapperRef}
				select={type === "scroll"}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
			>
				{children}
				{finalLastPointer &&
					type === "pointing" &&
					finalPointerEnabled &&
					(finalTapStatus === "double" ? (
						<DoublePointer x={finalLastPointer.x} y={finalLastPointer.y} />
					) : (
						<Pointer
							x={finalLastPointer.x}
							y={finalLastPointer.y}
							color={finalTapStatus === "long" ? "hsl(330, 100%, 70%)" : "#ff0"}
						/>
					))}
			</Wrapper>
		</DataContext.Provider>
	);
};

export default Main;
