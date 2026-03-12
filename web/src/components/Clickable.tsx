import styled from "@emotion/styled";
import { useContext, useEffect, useRef } from "react";

import { DataContext } from "@/libs/data";
import { DRAGGING_TIME_THRESHOLD } from "@/libs/env";

const Wrapper = styled.div<{ height?: string }>`
  height: ${({ height }) => height ?? "auto"};
`;

interface ClickableProps {
  height?: string;
  children: React.ReactNode;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongTap?: () => void;
  onDraggingStart?: () => void;
  onDraggingMove?: () => void;
  onDraggingEnd?: () => void;
}

export const Clickable = ({
  height,
  children,
  onTap,
  onDoubleTap,
  onLongTap,
  onDraggingStart,
  onDraggingMove,
  onDraggingEnd,
}: ClickableProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const hoverTimeRef = useRef<number | null>(null);
  const draggingTimeRef = useRef<number | null>(null);
  const { lastPointer, tapStatus, wrapperX, wrapperY } =
    useContext(DataContext);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    // When hovered but the pointer is gone, handle tap/drag end
    if (!lastPointer) {
      // Dragging ended
      if (draggingTimeRef.current) {
        onDraggingEnd?.();
        draggingTimeRef.current = null;
      }
      // Tap (single, double, or long)
      else if (hoverTimeRef.current) {
        if (tapStatus === "double") {
          onDoubleTap?.();
        } else if (tapStatus === "long") {
          onLongTap?.();
        } else {
          onTap?.();
        }
      }
      hoverTimeRef.current = null;
      return;
    }

    // While dragging
    if (draggingTimeRef.current) {
      onDraggingMove?.();
      return;
    }

    const rect = ref.current.getBoundingClientRect();

    // Check whether the pointer is within this element's bounds
    const isInBounds =
      lastPointer.x >= rect.left - wrapperX &&
      lastPointer.x <= rect.right - wrapperX &&
      lastPointer.y >= rect.top - wrapperY &&
      lastPointer.y <= rect.bottom - wrapperY;

    // When the pointer is outside this element
    if (!isInBounds) {
      hoverTimeRef.current = null;
      return;
    }

    // Get all Clickables and filter those under the pointer
    const allClickables = [
      ...document.querySelectorAll<HTMLElement>('[data-clickable="true"]'),
    ];
    const clickablesAtPoint = allClickables.filter((element) => {
      const elementRect = element.getBoundingClientRect();
      return (
        lastPointer.x >= elementRect.left - wrapperX &&
        lastPointer.x <= elementRect.right - wrapperX &&
        lastPointer.y >= elementRect.top - wrapperY &&
        lastPointer.y <= elementRect.bottom - wrapperY
      );
    });
    if (clickablesAtPoint.length === 0) {
      hoverTimeRef.current = null;
      return;
    }

    // When the hover duration exceeds the threshold, start dragging
    if (
      hoverTimeRef.current &&
      Date.now() - hoverTimeRef.current > DRAGGING_TIME_THRESHOLD
    ) {
      onDraggingStart?.();
      draggingTimeRef.current = Date.now();
      return;
    }

    if (!hoverTimeRef.current) {
      hoverTimeRef.current = Date.now();
    }
  }, [
    lastPointer,
    tapStatus,
    wrapperX,
    wrapperY,
    onTap,
    onDoubleTap,
    onLongTap,
    onDraggingStart,
    onDraggingMove,
    onDraggingEnd,
  ]);

  return (
    <Wrapper
      height={height}
      data-clickable="true"
      data-hovered={hoverTimeRef.current ? "true" : null}
      ref={ref}
    >
      {children}
    </Wrapper>
  );
};
