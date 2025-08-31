import { bunja } from "bunja";
import { useBunja } from "bunja/react";
import { atom, useAtomValue } from "jotai";

import { rowBunja, useScreenCanvas } from "../row/state";
import { indicatorBunja } from "../indicator";
import { OhlcScope } from "../Ohlc";

const volumeBunja = bunja(() => {
  const store = bunja.use(OhlcScope);
  const {
    interval,
    chartDataAtom,
    minScreenTimestampAtom,
    maxScreenTimestampAtom,
  } = bunja.use(indicatorBunja);
  const {
    minScreenValuesAtom,
    maxScreenValuesAtom,
    anchorAtom,
  } = bunja.use(rowBunja);
  const screenOhlcAtom = atom(get => {
    const start = Math.round(get(minScreenTimestampAtom) / interval) - 1;
    const end = Math.round(get(maxScreenTimestampAtom) / interval) + 1;
    const chartData = get(chartDataAtom);
    const bars = [];
    for (let i = start; i < end; ++i) {
      const timestamp = i * interval;
      const bar = chartData.raw[timestamp];
      if (!bar) continue;
      bars.push(bar);
    }
    return bars;
  })
  const maxScreenValueAtom = atom(get => {
    const ohlc = get(screenOhlcAtom);
    const high = Math.max(...ohlc.map(bar => bar.volume));
    return high;
  });
  const minScreenValueAtom = atom(() => 0);
  bunja.effect(() => {
    store.set(minScreenValuesAtom, (v) => [...v, minScreenValueAtom]);
    store.set(maxScreenValuesAtom, (v) => [...v, maxScreenValueAtom]);
    store.set(anchorAtom, 'min');
    return () => {
      store.set(minScreenValuesAtom, (v) => v.filter(a => a != minScreenValueAtom));
      store.set(maxScreenValuesAtom, (v) => v.filter(a => a != maxScreenValueAtom));
      store.set(anchorAtom, undefined);
    };
  });
  return { screenOhlcAtom };
});

export interface VolumeProps{
  risingColor: string;
  fallingColor: string;
}
export default function Volume({
  risingColor,
  fallingColor,
}: VolumeProps) {
  const { dataWidthAtom, toScreenXAtom, toScreenYAtom } = useBunja(indicatorBunja);
  const { screenOhlcAtom } = useBunja(volumeBunja);
  const screenOhlc = useAtomValue(screenOhlcAtom);
  const dataWidth = useAtomValue(dataWidthAtom);
  const toScreenX = useAtomValue(toScreenXAtom);
  const toScreenY = useAtomValue(toScreenYAtom);
  useScreenCanvas((ctx) => {
    for (const data of screenOhlc) {
      const volume = toScreenY(data.volume);
      const x = toScreenX(data.timestamp);
      const gap = dataWidth / 8;
      const halfWidth = (dataWidth - gap) / 2;
      ctx.fillStyle = data.open < data.close ? risingColor : fallingColor;
      ctx.beginPath();
      ctx.rect((x - halfWidth) | 0, volume, (dataWidth - gap) | 0, toScreenY(0) - volume);
      ctx.fill();
    }
  });
  return null;
}
