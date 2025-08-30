import { useAtomValue } from "jotai";
import { useBunja } from "bunja/react";

import { useScreenCanvas } from "../row/state";
import { ValueAxisBunja } from "../row/value-axis/state";
import { indicatorBunja } from "../indicator";
import { colBunja } from "../col/state";

interface GridProps {
  color: string;
}
export default function Grid({ color }: GridProps) {
  const { labelValueAndTextsAtom } = useBunja(ValueAxisBunja);
  const { chartWidthAtom } = useBunja(colBunja);
  const { toScreenYAtom } = useBunja(indicatorBunja);
  const labelValueAndTexts = useAtomValue(labelValueAndTextsAtom);
  const chartWidth = useAtomValue(chartWidthAtom);
  const toScreenY = useAtomValue(toScreenYAtom);
  useScreenCanvas(ctx => {
    if (!chartWidth) return;
    for (const { value } of labelValueAndTexts) {
      const y = toScreenY(value);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
    }
  })
  return null;
}
