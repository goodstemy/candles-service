import config from './config';
import Hyperliquid from './external/providers/hyperliquid';
import CandleAggregator from './candle-aggregator';
import Binance from './external/providers/binance';

function main() {
  const ca = new CandleAggregator();
  const hl = new Hyperliquid(ca);
  const binance = new Binance(ca);

  if (config.hyperliquid.enabled) {
    hl.start();
  }

  if (config.binance.enabled) {
    binance.start();
  }
}

main();
