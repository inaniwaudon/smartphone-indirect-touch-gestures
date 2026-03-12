import { useRef, useState } from "react";

// Deceleration factor (smaller = stops sooner)
const DECELERATION = 0.95;
// Threshold to consider scroll stopped
const VELOCITY_THRESHOLD = 0.1;
// Threshold to start inertia scrolling
const INERTIA_VELOCITY_THRESHOLD = 0.5;
// Initial velocity boost
const VELOCITY_MULTIPLIER = 1.5;

export const useScroll = (
	onScrollEnd: () => void,
	optionsRef?: React.RefObject<{
		enabled: boolean;
		deceleration: number;
		velocityMultiplier: number;
	}>,
) => {
	const defaultOptionsRef = useRef({
		enabled: true,
		deceleration: DECELERATION,
		velocityMultiplier: VELOCITY_MULTIPLIER,
	});
	const actualOptionsRef = optionsRef ?? defaultOptionsRef;

	const [y, setY] = useState(0);
	const requestRef = useRef<number | null>(null);
	const lastPointRef = useRef<{ y: number; time: number } | null>(null);
	const velocityRef = useRef(0);
	const lastVelocitiesRef = useRef<number[]>([]);
	const lastInertiasRef = useRef<boolean[]>([]);

	// Inertia scroll animation loop
	const animate = () => {
		if (Math.abs(velocityRef.current) > VELOCITY_THRESHOLD) {
			velocityRef.current *= actualOptionsRef.current.deceleration;
			if (actualOptionsRef.current.enabled) {
				setY((prev) => prev - velocityRef.current);
			}
			requestRef.current = requestAnimationFrame(animate);
		} else {
			velocityRef.current = 0;
			onScrollEnd();
		}
	};

	const resetLastValues = () => {
		lastVelocitiesRef.current = [];
		lastInertiasRef.current = [];
	};

	const onPointerDown = (e: React.PointerEvent) => {
		// Stop inertia scroll on touch
		if (requestRef.current) {
			cancelAnimationFrame(requestRef.current);
			onScrollEnd();
		}
		lastPointRef.current = { y: e.clientY, time: Date.now() };
		velocityRef.current = 0;
	};

	const onPointerMove = (e: React.PointerEvent) => {
		if (!lastPointRef.current) {
			return;
		}

		const now = Date.now();
		const dy = e.clientY - lastPointRef.current.y;
		const dt = now - lastPointRef.current.time;

		if (dt > 0) {
			// Compute recent velocity (px/ms)
			velocityRef.current = (dy / dt) * 16.6; // Convert to displacement per frame (16.6ms)
		}

		if (actualOptionsRef.current.enabled) {
			setY((prev) => prev - dy);
		}
		lastPointRef.current = { y: e.clientY, time: now };
	};

	const onPointerUp = () => {
		lastPointRef.current = null;

		// Start inertia if velocity exists at release
		const isInheria =
			Math.abs(velocityRef.current) > INERTIA_VELOCITY_THRESHOLD;

		if (isInheria) {
			velocityRef.current *= VELOCITY_MULTIPLIER; // Fine-tune the acceleration feel at release
			requestRef.current = requestAnimationFrame(animate);
		}

		// Save the last inertia scroll state and velocity
		lastInertiasRef.current = [...lastInertiasRef.current, isInheria];
		lastVelocitiesRef.current = [
			...lastVelocitiesRef.current,
			velocityRef.current,
		];

		if (!isInheria) {
			onScrollEnd();
		}
	};

	const forceSetY = (value: number) => {
		if (requestRef.current) {
			cancelAnimationFrame(requestRef.current);
		}
		setY(value);
	};

	return {
		y,
		lastInertiasRef: lastInertiasRef,
		lastVelocitiesRef: lastVelocitiesRef,
		scrollProps: {
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerCancel: onPointerUp,
			style: { touchAction: "none", cursor: "grab" } as React.CSSProperties,
		},
		forceSetY,
		resetLastValues,
	};
};
