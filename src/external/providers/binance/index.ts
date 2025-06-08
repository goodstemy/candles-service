import WebSocket from 'ws';
import { Coin } from '../../types';
import CandleAggregator from '../../../candle-aggregator';
import Coins from '../../../models/coins';
import config from '../../../config';
import Logger from 'js-logger';
import { setTimeout } from 'node:timers/promises';

class BinanceWS {
  serviceName = 'BinanceWS';
  pingPongTimeout = 60_000;
  coins: Coin[];
  ws: WebSocket;
  symbolToPrice: Map<string, number>;
  coinsModel: Coins;
  candleAggregator: CandleAggregator;
  // btcusdt@trade->btc
  // sophusdt@trade->soph
  // for performance
  binanceStreamNameResolver: Map<string, string>;

  constructor(ca: CandleAggregator) {
    this.symbolToPrice = new Map();
    this.binanceStreamNameResolver = new Map();
    this.coinsModel = new Coins();
    this.candleAggregator = ca;

    this.start();
  }

  async start() {
    const coins = await this.coinsModel.get();
    const coinsForStream = coins
      .map(({ name }) => {
        // <symbol>@kline_<interval>
        const binanceName = `${name.toLowerCase()}usdt@kline_1m`;

        this.binanceStreamNameResolver.set(`${name.toUpperCase()}USDT`, name);

        return binanceName;
      })
      .join('/');

    this.ws = new WebSocket(
      `${config.binance.wsHost}/stream?streams=${coinsForStream}`,
    );

    const reconnect = async () => {
      await setTimeout(10_000);

      this.start();
    };
    this.ws.on('error', async (err) => {
      Logger.error(this.serviceName, err);

      reconnect();
    });
    this.ws.on('close', (reason) => {
      Logger.error(this.serviceName, `Closed by ${reason}`);

      reconnect();
    });
    this.ws.on('message', (msg) => this.processWsMessage(msg));
    this.ws.on('open', () => this.init());
  }

  async init() {
    // await setTimeout(this.pingPongTimeout);
    // this.ping();
  }

  // ping() {
  //   this.ws.send(
  //     JSON.stringify({
  //       method: 'ping',
  //     }),
  //   );
  // }

  processWsMessage(rawMsg: any) {
    const msg = JSON.parse(rawMsg.toString('utf-8'));

    const { data } = msg;

    if (data.e === 'kline') {
      const { k } = data;
      const coin = this.binanceStreamNameResolver.get(k.s);
      if (!coin) {
        Logger.error(
          `${this.serviceName} binanceStreamNameResolver coin not found!`,
        );

        return;
      }
      const price =
        (parseFloat(k.o) +
          parseFloat(k.h) +
          parseFloat(k.l) +
          parseFloat(k.c)) /
        4;

      this.candleAggregator.set({
        exchange: this.serviceName,
        coin,
        price,
        volume: k.v,
        nTrades: k.n,
        extTs: new Date(k.T),
        createTs: new Date(),
      });
    }
  }
}

export default class Binance {
  serviceName: 'Binance';
  coinsModel: Coins;
  ws: BinanceWS;
  candleAggregator: CandleAggregator;

  constructor(ca: CandleAggregator) {
    this.candleAggregator = ca;
  }

  async start() {
    this.ws = new BinanceWS(this.candleAggregator);

    // return this.ws.start();
  }
}
