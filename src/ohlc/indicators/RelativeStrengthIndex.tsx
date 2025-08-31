import { atom, useAtomValue } from "jotai";
import { bunja, createScope } from "bunja";
import { useBunja } from "bunja/react";

import { rowBunja, useScreenCanvas } from "../row/state";
import { indicatorBunja } from "../indicator";
import { OhlcScope } from "../Ohlc";
import { useMemo } from "react";

const RelativeStrengthIndexScope = createScope<Pick<RelativeStrengthIndexProps, 'length'>>();
const relativeStrengthIndexBunja = bunja(() => {
  const store = bunja.use(OhlcScope);
  const { length } = bunja.use(RelativeStrengthIndexScope);
  const {
    interval,
    chartDataAtom,
    minScreenTimestampAtom,
    maxScreenTimestampAtom,
  } = bunja.use(indicatorBunja);
  const {
    minScreenValuesAtom,
    maxScreenValuesAtom,
  } = bunja.use(rowBunja);

  const rsiAtom = atom(get => {
    const start = Math.round(get(minScreenTimestampAtom) / interval) - 1;
    const end = Math.round(get(maxScreenTimestampAtom) / interval) + 1;
    const chartData = get(chartDataAtom);
    const rsis: RSI[] = [];
    for (let i = start; i < end; ++i) {
      let smmaU: number | undefined, smmaD: number | undefined, cnt = 0;
      for (let j = length - 1; j >= 0; --j) {
        const timestamp = (i - j) * interval;
        const curr = chartData.raw[timestamp];
        const prev = chartData.raw[timestamp - interval];
        if (!curr || !prev) continue;
        const { u, d } = (() => {
          const v = Math.abs(curr.close - prev.close);
          if (curr.close > prev.close) return { u: v, d: 0 };
          return { u: 0, d: v };
        })();
        smmaU = smmaU == null ? u : (1 / length) * u + (1 - 1 / length) * smmaU;
        smmaD = smmaD == null ? d : (1 / length) * d + (1 - 1 / length) * smmaD;
        ++cnt;
      }
      if (cnt < length || smmaU == null || !smmaD) continue;
      const rs = smmaU / smmaD;
      const timestamp = i * interval;
      const rsi = 100 - (100 / (1 + rs));
      rsis.push({ timestamp, value: rsi });
    }
    return rsis;
  });

  const maxScreenValueAtom = atom(get => {
    return Math.max(100, ...get(rsiAtom).map(rsi => rsi.value));
  });
  const minScreenValueAtom = atom(get => {
    return Math.min(0, ...get(rsiAtom).map(rsi => rsi.value));
  });
  bunja.effect(() => {
    store.set(minScreenValuesAtom, (v) => [...v, minScreenValueAtom]);
    store.set(maxScreenValuesAtom, (v) => [...v, maxScreenValueAtom]);
    return () => {
      store.set(minScreenValuesAtom, (v) => v.filter(a => a != minScreenValueAtom));
      store.set(maxScreenValuesAtom, (v) => v.filter(a => a != maxScreenValueAtom));
    };
  });
  return { rsiAtom };
});

export interface RelativeStrengthIndexProps {
  length: number;
  lineColor: string;
  overboughtColor: string;
  oversoldColor: string;
  overboughtLevel?: number;
  oversoldLevel?: number;
}

export default function RelativeStrengthIndex({
  length,
  lineColor,
  overboughtColor,
  oversoldColor,
  overboughtLevel = 70,
  oversoldLevel = 30,
}: RelativeStrengthIndexProps) {
  const { toScreenXAtom, toScreenYAtom, screenCanvasInfoAtom } = useBunja(indicatorBunja);
  const { rsiAtom } = useBunja(relativeStrengthIndexBunja, [
    RelativeStrengthIndexScope.bind(useMemo(() => ({ length }), [length])),
  ]);
  const rsiValues = useAtomValue(rsiAtom);
  const toScreenX = useAtomValue(toScreenXAtom);
  const toScreenY = useAtomValue(toScreenYAtom);
  const canvasInfo = useAtomValue(screenCanvasInfoAtom);

  useScreenCanvas((ctx) => {
    if (rsiValues.length < 2 || !canvasInfo) return;
    const { width } = canvasInfo;
    drawLine: {
      ctx.save();
      ctx.setLineDash([5, 5]);
      // overbought
      ctx.strokeStyle = overboughtColor;
      ctx.beginPath();
      const yOverbought = toScreenY(overboughtLevel);
      ctx.moveTo(0, yOverbought);
      ctx.lineTo(width, yOverbought);
      ctx.stroke();
      // oversold
      ctx.strokeStyle = oversoldColor;
      ctx.beginPath();
      const yOversold = toScreenY(oversoldLevel);
      ctx.moveTo(0, yOversold);
      ctx.lineTo(width, yOversold);
      ctx.stroke();
      // baseline
      ctx.strokeStyle = oversoldColor; // FIXME
      ctx.beginPath();
      const yBase = toScreenY(50);
      ctx.moveTo(0, yBase);
      ctx.lineTo(width, yBase);
      ctx.stroke();
      ctx.restore();
    }
    drawRSILine: {
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (const { timestamp, value } of rsiValues) {
        const x = toScreenX(timestamp);
        const y = toScreenY(value);

        if (started) {
          ctx.lineTo(x, y);
        } else {
          started = true;
          ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
  });

  return null;
}

class RSI {
  constructor(public timestamp: number, public value: number) {}
}
