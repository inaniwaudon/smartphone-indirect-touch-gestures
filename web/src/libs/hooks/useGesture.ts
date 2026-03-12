import { useState } from "react";

import type { GestureData, Point } from "../data";

const useGesture = () => {
  const [gestures, setGestures] = useState<GestureData[][]>([]);
  const [lastPointer, setLastPointer] = useState<Point | null>(null);

  const resetGestures = () => {
    setGestures([]);
    setLastPointer(null);
  };

  const startGesture = (point: Point) => {
    setGestures((prev) => [...prev, [{ timestamp: Date.now(), point }]]);
    setLastPointer(point);
  };

  const addGesture = (point: Point) => {
    setGestures((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const lastGesture = prev[prev.length - 1];
      const newPoint = { timestamp: Date.now(), point };
      const newLastGesture = [...lastGesture, newPoint];
      return [...prev.slice(0, -1), newLastGesture];
    });
    setLastPointer(point);
  };

  const endGesture = () => {
    setLastPointer(null);
  };

  return {
    gestures,
    lastPointer,
    resetGestures,
    startGesture,
    addGesture,
    endGesture,
  };
};

export default useGesture;
