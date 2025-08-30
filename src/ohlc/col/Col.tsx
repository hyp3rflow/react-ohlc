import React, { useEffect } from "react";
import { flushSync } from "react-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { useBunja } from "bunja/react";
import useResizeObserver from "@react-hook/resize-observer";

import type { RowProps } from "../row/Row";
import { TimeAxis } from "./time-axis/TimeAxis";
import { colBunja, IntervalContext, SymbolKeyContext } from "./state";

export interface ColProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactElement<RowProps> | React.ReactElement<RowProps>[];
  symbolKey: string;
  interval: number;
}
function Col({ symbolKey, interval, ...props }: ColProps) {
  return (
    <SymbolKeyContext.Provider value={symbolKey}>
      <IntervalContext.Provider value={interval}>
        <ColInternal {...props} />
      </IntervalContext.Provider>
    </SymbolKeyContext.Provider>
  );
}

export default React.memo(Col);

function ColInternal(props: React.HTMLAttributes<HTMLDivElement>) {
  const colDivRef = React.useRef<HTMLDivElement>(null);
  const { interval, colWidthAtom, offsetAtom, zoomFactorAtom } = useBunja(colBunja);
  const setColWidth = useSetAtom(colWidthAtom);
  const setOffset = useSetAtom(offsetAtom);
  const setZoomFactor = useSetAtom(zoomFactorAtom);
  const zoomFactor = useAtomValue(zoomFactorAtom);
  useResizeObserver(colDivRef, ({ contentRect: { width } }) => {
    flushSync(() => setColWidth(width));
  });
  useEffect(() => {
    const el = colDivRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
    function handleWheel(e: WheelEvent) {
      if (!Math.abs(e.deltaX) && !Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (e.ctrlKey) {
        setZoomFactor(prev => {
          const newZoom = prev * (1 - e.deltaY * 0.002);
          return Math.max(1, Math.min(14, newZoom));
        });
      } else {
        setOffset(prev => {
          const scaleFactor = interval * zoomFactor / 70;
          return prev + e.deltaX * scaleFactor;
        });
      }
    };
  }, [setOffset, setZoomFactor, interval, zoomFactor]);
  return (
    <div
      {...props}
      ref={colDivRef}
      style={{
        ...props.style,
        flex: "1 0 0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flex: "1 0 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {props.children}
      </div>
      <TimeAxis />
    </div>
  );
}
