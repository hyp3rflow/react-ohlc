import { atom, useAtomValue } from "jotai";
import { bunja, createScope } from "bunja";
import { useBunja } from "bunja/react";

import { rowBunja, useScreenCanvas } from "../row/state";
import { indicatorBunja } from "../indicator";
import { OhlcScope } from "../Ohlc";
import { useMemo } from "react";

const BollingerBandsScope = createScope<Pick<BollingerBandsProps, 'length' | 'multiplier'>>();
const bollingerBandsBunja = bunja(() => {
  const store = bunja.use(OhlcScope);
  const { length, multiplier } = bunja.use(BollingerBandsScope);
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
  const bbsAtom = atom(get => {
    const start = Math.round(get(minScreenTimestampAtom) / interval) - 1;
    const end = Math.round(get(maxScreenTimestampAtom) / interval) + 1;
    const chartData = get(chartDataAtom);
    const bbs: BB[] = [];
    for (let i = start; i < end; ++i) {
      let sum = 0;
      let sum2 = 0;
      let cnt = 0;
      for (let j = 0; j < length; ++j) {
        const timestamp = (i - j) * interval;
        const data = chartData.raw[timestamp];
        if (!data) continue;
        sum += data.close;
        sum2 += data.close * data.close;
        ++cnt;
      }
      if (cnt < length) continue;
      const avg = sum / cnt;
      const timestamp = i * interval;
      const stddev = Math.sqrt(sum2 / cnt - avg * avg);
      bbs.push(new BB(timestamp, avg, stddev));
    }
    return bbs;
  });
  const maxScreenValueAtom = atom(get => {
    const bbs = get(bbsAtom);
    const high = Math.max(...bbs.map(({ avg, stddev }) => avg + stddev * multiplier));
    return high;
  });
  const minScreenValueAtom = atom(get => {
    const bbs = get(bbsAtom);
    const low = Math.min(...bbs.map(({ avg, stddev }) => avg - stddev * multiplier));
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
  return { bbsAtom };
});

export interface BollingerBandsProps {
  length: number;
  multiplier: number;
  meanColor: string;
  upperColor: string;
  lowerColor: string;
  backgroundColor: string;
}
export default function BollingerBands({
  length,
  multiplier,
  meanColor,
  upperColor,
  lowerColor,
  backgroundColor,
}: BollingerBandsProps) {
  const { toScreenXAtom, toScreenYAtom } = useBunja(indicatorBunja);
  const { bbsAtom } = useBunja(bollingerBandsBunja, [
    BollingerBandsScope.bind(useMemo(() => ({ length, multiplier }), [length, multiplier])),
  ]);
  const bbs = useAtomValue(bbsAtom);
  const toScreenX = useAtomValue(toScreenXAtom);
  const toScreenY = useAtomValue(toScreenYAtom);
  useScreenCanvas((ctx) => {
    if (bbs.length < 2) return;
    const rbbs = bbs.slice(0).reverse();
    drawBackground: {
      ctx.save();
      ctx.fillStyle = backgroundColor;
      ctx.beginPath();
      let started = false;
      for (const { timestamp, avg, stddev } of bbs) {
        const x = toScreenX(timestamp);
        const y = toScreenY(avg + stddev * multiplier);
        if (started) {
          ctx.lineTo(x, y);
        } else {
          started = true;
          ctx.moveTo(x, y);
        }
      }
      for (const { timestamp, avg, stddev } of rbbs) {
        const x = toScreenX(timestamp);
        const y = toScreenY(avg - stddev * multiplier);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    drawUpper: {
      ctx.strokeStyle = upperColor;
      ctx.beginPath();
      let started = false;
      for (const { timestamp, avg, stddev } of bbs) {
        const x = toScreenX(timestamp);
        const y = toScreenY(avg + stddev * multiplier);
        if (started) {
          ctx.lineTo(x, y);
        } else {
          started = true;
          ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
    }
    drawLower: {
      ctx.strokeStyle = lowerColor;
      ctx.beginPath();
      let started = false;
      for (const { timestamp, avg, stddev } of bbs) {
        const x = toScreenX(timestamp);
        const y = toScreenY(avg - stddev * multiplier);
        if (started) {
          ctx.lineTo(x, y);
        } else {
          started = true;
          ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
    }
    drawMean: {
      ctx.strokeStyle = meanColor;
      ctx.beginPath();
      let started = false;
      for (const { timestamp, avg } of bbs) {
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
    }
  });
  return null;
}

class BB {
  constructor(public timestamp: number, public avg: number, public stddev: number) {}
}
