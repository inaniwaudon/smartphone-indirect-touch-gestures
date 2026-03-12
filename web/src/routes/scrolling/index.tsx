import styled from "@emotion/styled";
import { createFileRoute } from "@tanstack/react-router";
import { useContext, useEffect, useState } from "react";

import ScrollView from "@/components/ScrollView";
import { audioContext, playSuccessBeep } from "@/libs/audio";
import { DataContext } from "@/libs/data";
import { MAX_TRIAL, SCROLL_ROW_DISTANCE } from "@/libs/env";
import { useScroll } from "@/libs/hooks/useScroll";
import { sendData } from "@/libs/websocket";

const Start = styled.div`
  width: 100%;
  height: 100%;
  color: #fff;
  font-size: 48px;
  display: flex;
  justify-content: center;
  align-items: center;
`;
const Row = styled.div<{ color: string; height: number }>`
  width: 100%;
  height: ${({ height }) => height}px;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  background: ${({ color }) => color};
`;

const TargetIndex = styled.div`
  width: 100%;
  font-size: 24px;
  pointer-events: none;
  position: absolute;
  top: 18px;
  left: 20px;
  color: #fff;
`;

const DetectionRect = styled.div<{ y: number; height: number }>`
  width: 100%;
  height: ${({ height }) => height}px;
  background: #fff;
  opacity: 0.4;
  pointer-events: none;
  position: absolute;
  top: ${({ y }) => y}px;
  left: 0;
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
  const { mode, gestures, content, wrapperHeight, resetGestures, setContent } =
    useContext(DataContext);

  const onScrollEnd = () => {
    if (mode === "mirror") {
      return;
    }
    change(false);
  };

  const {
    y,
    scrollProps,
    lastInertiasRef,
    lastVelocitiesRef,
    forceSetY,
    resetLastValues,
  } = useScroll(onScrollEnd);

  const [trial, setTrial] = useState<number>(-2);
  const [yArray, setYArray] = useState<{ y: number; timestamp: number }[]>([]);
  const [targetIndex, setTargetIndex] = useState(-1);
  const [initialIndex, setInitialIndex] = useState(-1);

  const rowHeight = wrapperHeight / 10;
  const detectionRectHeight = rowHeight * 1.5;
  const detectionRectY = (wrapperHeight - detectionRectHeight) / 2;

  const calculateTargetY = (index: number) => {
    return rowHeight * index;
  };

  const fitsInDetectionRect = () => {
    if (targetIndex === -1) {
      return false;
    }
    const targetRowY = calculateTargetY(targetIndex);
    return (
      y + detectionRectY <= targetRowY &&
      y + detectionRectY + detectionRectHeight >= targetRowY + rowHeight
    );
  };

  const initialize = async () => {
    setTrial(-1);
    await audioContext.resume();
    playSuccessBeep();
    setTrial(0);
  };

  const change = (initial: boolean) => {
    if (!initial && !fitsInDetectionRect()) {
      return;
    }

    // On selection complete
    if (!initial) {
      playSuccessBeep();
      sendData({
        type: "scroll",
        trial,
        initialIndex,
        targetIndex,
        yArray,
        timestamp: Date.now(),
        gestures,
        lastInertias: lastInertiasRef.current,
        lastVelocities: lastVelocitiesRef.current,
      });
      setTrial((prev) => prev + 1);
    }
    resetGestures();
    setYArray([]);
    resetLastValues();

    // Set the initial displayed row randomly
    const displayedIndex = Math.floor(Math.random() * 1000);
    setInitialIndex(displayedIndex);

    // Set target row to stay within 1–1000
    let newTargetIndex: number;
    if (displayedIndex - SCROLL_ROW_DISTANCE < 10) {
      newTargetIndex = displayedIndex + SCROLL_ROW_DISTANCE;
    } else if (displayedIndex + SCROLL_ROW_DISTANCE > 990) {
      newTargetIndex = displayedIndex - SCROLL_ROW_DISTANCE;
    } else {
      newTargetIndex =
        displayedIndex +
        (Math.random() < 0.5 ? SCROLL_ROW_DISTANCE : -SCROLL_ROW_DISTANCE);
    }

    // Update with a delay to avoid interference with user taps
    setTargetIndex(-1);
    setTimeout(() => {
      const newY =
        calculateTargetY(displayedIndex) -
        detectionRectY -
        (detectionRectHeight - rowHeight) / 2;
      forceSetY(newY);
      setTargetIndex(newTargetIndex);
    }, 1000);
  };

  useEffect(() => {
    setYArray((prev) => [...prev, { y, timestamp: Date.now() }]);
  }, [y]);

  // biome-ignore lint: dependency on wrapperHeight
  useEffect(() => {
    // Initialize
    if (mode === "operation") {
      change(true);
    }
    // Workaround: wrapperHeight is initially 0
  }, [wrapperHeight]);

  useEffect(() => {
    setContent((prev: any) => ({
      ...prev,
      trial,
      y,
      targetIndex,
    }));
  }, [trial, y, targetIndex, setContent]);

  useEffect(() => {
    // Sync mirror screen
    if (mode === "mirror" && typeof content.y === "number") {
      forceSetY(content.y);
    }
  });

  // Rendering
  const finalTargetIndex =
    mode === "operation" ? targetIndex : (content.targetIndex ?? 0);
  const finalTrial = mode === "operation" ? trial : (content.trial ?? 0);

  return finalTrial < 0 ? (
    <Start onClick={initialize}>
      {finalTrial === -2 ? (
        <>
          Tap the screen
          <br />
          to start
          <br />
          trial: {MAX_TRIAL}
          <br />
          diff: {SCROLL_ROW_DISTANCE}
        </>
      ) : (
        <>Loading...</>
      )}
    </Start>
  ) : finalTrial < MAX_TRIAL ? (
    <div>
      <ScrollView y={y} scrollProps={scrollProps}>
        {[...Array(1000)].map((_, index) => {
          const l = index % 3 === 0 ? 20 : index % 3 === 1 ? 40 : 60;
          return (
            <Row color={`hsl(210, 70%, ${l}%)`} height={rowHeight} key={index}>
              {index}
            </Row>
          );
        })}
      </ScrollView>
      <TargetIndex>
        {finalTargetIndex > 0 ? `Aim ${finalTargetIndex}` : "Waiting"}
      </TargetIndex>
      <DetectionRect y={detectionRectY} height={detectionRectHeight} />
    </div>
  ) : (
    <Completed>Completed</Completed>
  );
};

export const Route = createFileRoute("/scrolling/")({
  component: Index,
});
