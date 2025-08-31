import { atom, useAtomValue } from "jotai";
import { useBunja } from "bunja/react";

import { rowBunja, useScreenCanvas } from "../row/state";
import { indicatorBunja } from "../indicator";
import { bunja, createScope } from "bunja";
import { OhlcScope } from "../Ohlc";
import { useMemo } from "react";

const MovingAverageScope = createScope<Pick<MovingAverageProps, 'length'>>();
const movingAverageBunja = bunja(() => {
  const store = bunja.use(OhlcScope);
  const { length } = bunja.use(MovingAverageScope);
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
  const maAtom = atom(get => {
    const start = Math.round(get(minScreenTimestampAtom) / interval) - 1;
    const end = Math.round(get(maxScreenTimestampAtom) / interval) + 1;
    const chartData = get(chartDataAtom);
    const ma: MA[] = [];
    for (let i = start; i < end; ++i) {
      let sum = 0;
      let cnt = 0;
      for (let j = 0; j < length; ++j) {
        const timestamp = (i - j) * interval;
        const data = chartData.raw[timestamp];
        if (!data) continue;
        sum += data.close;
        ++cnt;
      }
      if (cnt < length) continue;
      const avg = sum / cnt;
      const timestamp = i * interval;
      ma.push(new MA(timestamp, avg));
    }
    return ma;
  });
  const maxScreenValueAtom = atom(get => {
    const ma = get(maAtom);
    const high = Math.max(...ma.map(({ avg }) => avg));
    return high;
  });
  const minScreenValueAtom = atom(get => {
    const ma = get(maAtom);
    const low = Math.min(...ma.map(({ avg }) => avg));
    return low;
  });
  bunja.effect(() => {
    store.set(minScreenValuesAtom, (v) => [...v, minScreenValueAtom]);
    store.set(maxScreenValuesAtom, (v) => [...v, maxScreenValueAtom]);
    return () => {
      store.set(minScreenValuesAtom, (v) => v.filter(a => a != minScreenValueAtom));
      store.set(maxScreenValuesAtom, (v) => v.filter(a => a != maxScreenValueAtom));
    };
  });
  return { maAtom };
});

export interface MovingAverageProps {
  length: number;
  color: string;
}
export default function MovingAverage({ length, color }: MovingAverageProps) {
  const { toScreenXAtom, toScreenYAtom } = useBunja(indicatorBunja);
  const { maAtom } = useBunja(movingAverageBunja, [
    MovingAverageScope.bind(useMemo(() => ({ length }), [length])),
  ]);
  const ma = useAtomValue(maAtom);
  const toScreenX = useAtomValue(toScreenXAtom);
  const toScreenY = useAtomValue(toScreenYAtom);
  useScreenCanvas((ctx) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    let started = false;
    for (const { timestamp, avg } of ma) {
      const x = toScreenX(timestamp);
      const y = toScreenY(avg);
      if (started) {
        ctx.lineTo(x, y);
      } else {
        started = true;
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  });
  return null;
}

class MA {
  constructor(public timestamp: number, public avg: number) {}
}
