import styled from "@emotion/styled";
import { createFileRoute } from "@tanstack/react-router";
import { useContext, useEffect, useMemo, useState } from "react";

import { Clickable } from "@/components/Clickable";
import { DataContext } from "@/libs/data";
import { sendData } from "@/libs/websocket";
import { generateRects, type RectData } from "./utils";

const RectWrapper = styled.div<{
	x: number;
	y: number;
	size: number;
}>`
  position: absolute;
  left: ${({ x }) => x}px;
  top: ${({ y }) => y}px;
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
`;

const Rect = styled.div<{
	target: boolean;
	size: number;
}>`
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  background: ${({ target }) =>
		target ? "hsl(330, 100%, 70%)" : "hsl(200, 100%, 70%)"};
  transition: background 0.1s ease;

  [data-hovered] & {
    background: hsl(120, 60%, 50%) !important;
  }
`;

const Completed = styled.div`
  width: 100%;
  height: 100%;
  color: #fff;
  font-size: 48px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Index = () => {
	const {
		mode,
		gestures,
		content,
		wrapperWidth,
		wrapperHeight,
		resetGestures,
		setContent,
	} = useContext(DataContext);

	const [targetId, setTargetId] = useState<number>(0);
	const [trial, setTrial] = useState<number>(0);

	// Generate targets based on screen size
	const rects = useMemo(() => {
		if (wrapperWidth === 0 || wrapperHeight === 0) {
			return [];
		}
		return generateRects(wrapperWidth, wrapperHeight);
	}, [wrapperWidth, wrapperHeight]);

	const onTargetTap = (id: number) => {
		if (mode === "mirror" || id !== targetId) {
			return;
		}

		// On selection complete
		sendData({
			type: "pointing",
			targetId,
			rects,
			timestamp: Date.now(),
			gestures,
		});
		resetGestures();
		setTrial((prev) => prev + 1);

		// Randomly select a rect excluding the current targetId
		if (rects.length > 1) {
			const otherRects = rects.filter((r) => r.id !== targetId);
			const randomIdx = Math.floor(Math.random() * otherRects.length);
			setTargetId(otherRects[randomIdx].id);
		}
	};

	// Set the initial target
	useEffect(() => {
		if (rects.length > 0 && mode === "operation") {
			const randomId = Math.floor(Math.random() * rects.length);
			setTargetId(randomId);
		}
	}, [rects.length, mode]);

	useEffect(() => {
		setContent((prev: any) => ({
			...prev,
			rects,
			trial,
			targetId,
		}));
	}, [rects, trial, targetId, setContent]);

	// Rendering
	const finalRects = mode === "operation" ? rects : (content.rects ?? []);
	const finalTrial = mode === "operation" ? trial : (content.trial ?? 0);
	const finalTargetId =
		mode === "operation" ? targetId : (content.targetId ?? 0);

	return (
		<>
			{finalTrial < import.meta.env.VITE_MAX_TRIAL ? (
				finalRects.map((rect: RectData) => {
					const isTarget = rect.id === finalTargetId;
					return (
						<RectWrapper x={rect.x} y={rect.y} size={rect.size} key={rect.id}>
							<Clickable key={rect.id} onTap={() => onTargetTap(rect.id)}>
								<Rect key={rect.id} size={rect.size} target={isTarget} />
							</Clickable>
						</RectWrapper>
					);
				})
			) : (
				<Completed>Completed</Completed>
			)}
		</>
	);
};

export const Route = createFileRoute("/pointing/")({
	component: Index,
});
