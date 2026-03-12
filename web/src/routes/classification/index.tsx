import styled from "@emotion/styled";
import { createFileRoute } from "@tanstack/react-router";
import { useContext, useEffect, useRef, useState } from "react";

import { Clickable } from "@/components/Clickable";
import ScrollView from "@/components/ScrollView";
import { DataContext, type Point } from "@/libs/data";
import { useScroll } from "@/libs/hooks/useScroll";
import { classify } from "./classification";

const Wrapper = styled.div<{ height: number; opacity: number }>`
  width: 100%;
  height: ${({ height }) => height * 2}px;
  background: #000;
  position: relative;
  overflow: hidden;
  opacity: ${({ opacity }) => opacity};
`;

const Label = styled.div<{ opacity: number }>`
  color: #fff;
  font-size: 48px;
	opacity: ${({ opacity }) => opacity};
	position: absolute;
	top: 24px;
	left: 32px;
	z-index: 100;
`;

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
  size: number;
  large: boolean;
}>`
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  background: hsl(200, 100%, 70%);
	border-radius: 8px;
	transform: ${({ large }) => (large ? "scale(2)" : "scale(1)")};
  transition: background 0.1s ease, transform 0.1s ease;
  position: relative;
  overflow: hidden;

  [data-hovered] & {
    background: hsl(120, 60%, 50%) !important;
  }
`;

const Ripple = styled.div`
	width: 20px;
	height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  transform: scale(0);
	position: absolute;
	top: 10px;
	left: 10px;
  animation: ripple-animation 0.6s ease-out;

  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;

const Menu = styled.div<{ open: boolean }>`
  width: 200px;
  height: 100px;
	border-radius: 8px;
  background: hsl(200, 80%, 40%);
  position: absolute;
  top: 54px;
  left: 0;

	transform: ${({ open }) => (open ? "scaleY(1.0)" : "scaleY(0)")};
	transform-origin: top;
	transition: transform 0.2s ease;
`;

const SIZE = 44;

const Index = () => {
  const {
    mode,
    gestures,
    tapStatus,
    content,
    wrapperHeight,
    lastPointer,
    setContent,
    setPointerEnabled,
  } = useContext(DataContext);

  const [status, setStatus] = useState<
    "Tap" | "Double Tap" | "Long Tap" | "Drag" | "Swipe" | null
  >(null);
  const [touching, setTouching] = useState(false);
  const [position, setPosition] = useState<Point>({ x: 100, y: 200 });
  const [isLarge, setIsLarge] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number }>>([]);

  const hasClassifiedRef = useRef(false);
  const offsetRef = useRef<Point | null>(null);
  const scrollOptionsRef = useRef({
    enabled: false,
    deceleration: 0.9,
    velocityMultiplier: 0.8,
  });

  const onScrollEnd = () => {};

  const { y, scrollProps } = useScroll(onScrollEnd, scrollOptionsRef);

  const onTargetTap = () => {
    if (mode === "mirror") {
      return;
    }
    setStatus(null);

    // Add ripple effect
    // Calculate relative coordinates within the Rect component
    const rippleId = Date.now();
    setRipples((prev) => [...prev, { id: Date.now() }]);

    // Remove ripple after animation ends
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 600);
  };

  const onTargetDoubleTap = () => {
    if (mode === "mirror") {
      return;
    }
    setStatus(null);
    setIsLarge((prev) => !prev);
  };

  const onTargetLongTap = () => {
    if (mode === "mirror") {
      return;
    }
    setTimeout(() => {
      setStatus(null);
    }, 1000);
    setIsOpen((prev) => !prev);
  };

  const onTargetDraggingStart = () => {
    if (mode === "mirror") {
      return;
    }
    setStatus("Drag");
    offsetRef.current = {
      x: (lastPointer?.x ?? 0) - position.x,
      y: (lastPointer?.y ?? 0) - position.y,
    };
  };

  const onTargetDraggingMove = () => {
    if (mode === "mirror") {
      return;
    }
    setPosition({
      x: (lastPointer?.x ?? 0) - (offsetRef.current?.x ?? 0),
      y: (lastPointer?.y ?? 0) - (offsetRef.current?.y ?? 0),
    });
    setStatus("Drag");
  };

  const onTargetDraggingEnd = () => {
    if (mode === "mirror") {
      return;
    }
    setStatus(null);
    setTimeout(() => {
      setStatus(null);
    }, 1000);
  };

  useEffect(() => {
    const currentGesture = gestures.at(-1);
    if (!currentGesture || currentGesture.length === 0) {
      return;
    }

    // Not touching: reset classification state
    if (!touching) {
      hasClassifiedRef.current = false;
      scrollOptionsRef.current.enabled = false;
    }
    setTouching(true);

    // Override for double tap or long press
    if (tapStatus === "double" || tapStatus === "long") {
      setPointerEnabled(true);
      setStatus(tapStatus === "double" ? "Double Tap" : "Long Tap");
      scrollOptionsRef.current.enabled = false;
      hasClassifiedRef.current = true;
      return;
    }

    // Classify after a certain time has passed or on touch up
    if (!hasClassifiedRef.current && tapStatus === "single") {
      const result = classify(currentGesture, lastPointer === null);
      if (result === "pointing" || result === "scroll") {
        setStatus(result === "pointing" ? "Tap" : "Swipe");
        setPointerEnabled(result === "pointing");
        scrollOptionsRef.current.enabled = result === "scroll";
        hasClassifiedRef.current = true;
      } else if (result === "undefined") {
        setStatus(null);
        hasClassifiedRef.current = false;
      }
    }

    if (lastPointer === null) {
      setTouching(false);
    }
  }, [gestures, lastPointer, tapStatus, touching, setPointerEnabled]);

  useEffect(() => {
    setContent((prev: any) => ({
      ...prev,
      status,
      position,
      y,
      isLarge,
      ripples,
      isOpen,
    }));
  }, [status, position, y, isLarge, ripples, isOpen, setContent]);

  // Rendering
  const finalStatus = mode === "operation" ? status : (content.status ?? null);
  const finalPosition =
    mode === "operation" ? position : (content.position ?? { x: 0, y: 0 });
  const finalY = mode === "operation" ? y : (content.y ?? 0);
  const finalIsLarge =
    mode === "operation" ? isLarge : (content.isLarge ?? false);
  const finalIsOpen = mode === "operation" ? isOpen : (content.isOpen ?? false);
  const finalRipples =
    mode === "operation"
      ? ripples
      : ((content.ripples ?? []) as { id: number }[]);

  return (
    <>
      <Label opacity={mode === "mirror" ? 1 : 0}>{finalStatus}</Label>
      <ScrollView y={finalY} scrollProps={scrollProps}>
        <Wrapper height={wrapperHeight * 2} opacity={mode === "mirror" ? 1 : 0}>
          <RectWrapper x={finalPosition.x} y={finalPosition.y} size={SIZE}>
            <Clickable
              onTap={onTargetTap}
              onDoubleTap={onTargetDoubleTap}
              onLongTap={onTargetLongTap}
              onDraggingStart={onTargetDraggingStart}
              onDraggingMove={onTargetDraggingMove}
              onDraggingEnd={onTargetDraggingEnd}
            >
              <Rect size={SIZE} large={finalIsLarge}>
                {finalRipples.map((ripple) => (
                  <Ripple key={ripple.id}></Ripple>
                ))}
              </Rect>
              <Menu open={finalIsOpen} />
            </Clickable>
          </RectWrapper>
        </Wrapper>
      </ScrollView>
    </>
  );
};

export const Route = createFileRoute("/classification/")({
  component: Index,
});
