import cron from 'node-cron';
import { Candle } from '../external/types';
import Candles from '../models/candles';
import Coins from '../models/coins';
import { setTimeout } from 'node:timers/promises';

export interface ICandleAggregatorSetParams {
  exchange: string;
  coin: string;
  o: number;
  h: number;
  l: number;
  c: number;
  volume: number;
  nTrades: number;
  extTs: Date;
  createTs: Date;
}

export default class CandleAggregator {
  // BTC->HyperLiquid->Candle
  // BTC->Binance->Candle
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
      cron.schedule('10 * * * * *', () => this.save());
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

    console.log(this.coinPrices);

    for (const [coin, inner] of this.coinPrices.entries()) {
      if (!totalMidPriceData.get(coin)) {
        //@ts-ignore
        totalMidPriceData.set(coin, {
          o: 0,
          h: 0,
          l: 0,
          c: 0,
          volume: 0,
          nTrades: 0,
        });
      }

      let exchangeCount = 0;
      for (const candle of inner.values()) {
        exchangeCount++;

        const exist = totalMidPriceData.get(coin);

        totalMidPriceData.set(coin, {
          ...candle,
          // @ts-ignore
          o: parseFloat(candle.o) + exist.o,
          // @ts-ignore
          h: parseFloat(candle.h) + exist.h,
          // @ts-ignore
          l: parseFloat(candle.l) + exist.l,
          // @ts-ignore
          c: parseFloat(candle.c) + exist.c,
          volume:
            // @ts-ignore
            parseFloat(candle.volume) + exist.volume,
          // @ts-ignore
          nTrades: candle.nTrades + exist.nTrades,
        });
      }

      // @ts-ignore
      totalMidPriceData.set(coin, {
        ...totalMidPriceData.get(coin),
        // @ts-ignore
        o: totalMidPriceData.get(coin).o / exchangeCount,
        // @ts-ignore
        h: totalMidPriceData.get(coin).h / exchangeCount,
        // @ts-ignore
        l: totalMidPriceData.get(coin).l / exchangeCount,
        // @ts-ignore
        c: totalMidPriceData.get(coin).c / exchangeCount,
      });
    }

    console.log(totalMidPriceData);

    await this.candles.setMany([...totalMidPriceData.values()]);

    this.coinPrices = new Map();
    this.canSet = true;
  }

  set(params: ICandleAggregatorSetParams) {
    if (!this.canSet) {
      return;
    }

    const coinId = this.coinIdHelper.get(params.coin);

    if (!coinId) {
      throw new Error(`CoinId: ${params.coin} not found!`);
    }

    const candle = {
      coinId,
      coin: params.coin,
      o: params.o,
      h: params.h,
      l: params.l,
      c: params.c,
      volume: params.volume,
      nTrades: params.nTrades,
      extTs: params.extTs,
    };

    const exist = this.coinPrices.get(params.coin);
    if (!exist) {
      const inner = new Map();
      inner.set(params.exchange, candle);
      this.coinPrices.set(params.coin, inner);
      return;
    }

    exist.set(params.exchange, candle);
  }
}
