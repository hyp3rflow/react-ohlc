import React from "react";
import ReactDOM from "react-dom/client";
import { useBunja } from "bunja/react";

import Ohlc, { ohlcBunja } from "./ohlc/Ohlc";
import Col from "./ohlc/col/Col";
import Row from "./ohlc/row/Row";
import Candlesticks from "./ohlc/indicators/Candlesticks";
import MovingAverage from "./ohlc/indicators/MovingAverage";
import mockdata from "./mockdata";
import BollingerBands from "./ohlc/indicators/BollingerBands";
import Volume from "./ohlc/indicators/Volume";
import Grid from "./ohlc/indicators/Grid";

function App() {
  const { upsertSymbolData } = useBunja(ohlcBunja);
  React.useEffect(() => upsertSymbolData("mock", 60000, mockdata), []);
  return (
    <Ohlc style={{ height: "600px", border: "1px solid black" }}>
      <Col symbolKey="mock" interval={60000}>
        <Row>
          <Grid color="rgba(0,0,0,0.1)" />
          <BollingerBands
            length={20}
            multiplier={2}
            upperColor="red"
            lowerColor="red"
            meanColor="orange"
            backgroundColor="rgba(255,0,0,0.1)"
          />
          <Candlesticks risingColor="green" fallingColor="red" />
          <MovingAverage length={9} color="blue" />
        </Row>
        <Row style={{ borderTop: "1px solid black", maxHeight: '200px' }}>
          <Grid color="rgba(0,0,0,0.1)" />
          <Volume risingColor="green" fallingColor="red"/>
        </Row>
      </Col>
    </Ohlc>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
