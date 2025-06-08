import cron from 'node-cron';
import { Candle } from '../external/types';
import Candles from '../models/candles';
import Coins from '../models/coins';
import { setTimeout } from 'node:timers/promises';

export interface ICandleAggregatorSetParams {
  exchange: string;
  coin: string;
  price: number;
  volume: number;
  nTrades: number;
  extTs: Date;
  createTs: Date;
}

export default class CandleAggregator {
  // BTC->HyperLiquid->price
  // BTC->Binance->price
  coinPrices: Map<string, Map<string, Candle>>;
  lastUpdMinute: number;
  candles: Candles;
  coins: Coins;
  // BTC->id: 1
  coinIdHelper: Map<string, number>;
  canSet: boolean;

  constructor() {
    this.coinPrices = new Map();
    this.coinIdHelper = new Map();
    this.candles = new Candles();
    this.coins = new Coins();
    this.canSet = true;

    this.prepare().then(async () => {
      cron.schedule('* * * * *', () => this.save());
    });
  }

  private async prepare() {
    const coins = await this.coins.get();

    for (const coin of coins) {
      this.coinIdHelper.set(coin.name, coin.id);
    }
  }

  private async save() {
    this.canSet = false;
    const now = new Date();

    if (this.lastUpdMinute === now.getMinutes()) {
      return;
    }

    this.lastUpdMinute = now.getMinutes();

    // BTC->Candle (mid price by hypeliquid, binance...)
    const totalMidPriceData: Map<string, Candle> = new Map();

    for (const [coin, exchange] of this.coinPrices.entries()) {
      if (!totalMidPriceData.get(coin)) {
        //@ts-ignore
        totalMidPriceData.set(coin, {
          price: 0,
        });
      }

      let exchangeCount = 0;
      for (const inner of exchange.values()) {
        exchangeCount++;
        totalMidPriceData.set(coin, {
          // @ts-ignore
          price: inner.price + totalMidPriceData.get(coin).price,
          ...inner,
        });
      }

      // @ts-ignore
      totalMidPriceData.set(coin, {
        // @ts-ignore
        price: totalMidPriceData.get(coin).price / exchangeCount,
        ...totalMidPriceData.get(coin),
      });
    }

    await this.candles.setMany([...totalMidPriceData.values()]);

    this.coinPrices = new Map();
    this.canSet = true;
  }

  set(params: ICandleAggregatorSetParams) {
    if (!this.canSet) {
      return;
    }

    const inner = new Map();
    inner.set(params.exchange, {
      id: this.coinIdHelper.get(params.coin),
      coin: params.coin,
      price: params.price,
      volume: params.volume,
      nTrades: params.nTrades,
      extTs: params.extTs,
    });

    this.coinPrices.set(params.coin, inner);
  }
}
