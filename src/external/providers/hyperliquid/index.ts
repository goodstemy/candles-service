import WebSocket from 'ws';
import config from '../../../config';
import Logger from 'js-logger';
import Candles from '../../../models/candles';
import Coins from '../../../models/coins';
import { setTimeout } from 'node:timers/promises';

type Coin = {
  name: string;
  szDecimals: number;
  maxLeverage: number;
};

class HyperliquidWS {
  pingPongTimeout = 60_000;
  symbolToPrice: Map<string, number>;
  lastUpdMinute: Map<string, number>;
  ws: WebSocket;
  coinsModel: Coins;
  candlesModel: Candles;
  coins: Coin[];

  constructor(coins: Coin[]) {
    this.coins = coins;
    this.symbolToPrice = new Map();
    this.lastUpdMinute = new Map();
    this.candlesModel = new Candles();
    this.coinsModel = new Coins();
  }

  start() {
    this.ws = new WebSocket(config.hyperliquid.wsHost);

    this.ws.on('error', (err) => Logger.error(err));
    this.ws.on('message', this.processWsMessage.bind(this));
    this.ws.on('open', () => this.init());
  }

  async init() {
    for (const { name, szDecimals, maxLeverage } of this.coins) {
      await this.coinsModel.set(name, szDecimals, maxLeverage);

      this.ws.send(
        JSON.stringify({
          method: 'subscribe',
          subscription: {
            type: 'candle',
            coin: name,
            interval: '1m',
          },
        }),
      );
    }

    await setTimeout(this.pingPongTimeout);
    this.ping();
  }

  ping() {
    this.ws.send(
      JSON.stringify({
        method: 'ping',
      }),
    );
  }

  async processWsMessage(_wsMessage: any) {
    const wsMessage = JSON.parse(_wsMessage);

    switch (wsMessage.channel) {
      case 'subscriptionResponse':
        const sub = wsMessage.data.subscription;
        Logger.log(`Subscribed to ${sub.type} ${sub.coin}(${sub.interval})`);
        break;
      case 'pong':
        await setTimeout(this.pingPongTimeout);
        this.ping();
        break;
      case 'candle':
        const { data } = wsMessage;
        const price =
          (parseFloat(data.o) +
            parseFloat(data.h) +
            parseFloat(data.l) +
            parseFloat(data.c)) /
          4;

        const d = new Date();
        const minutes = d.getMinutes();

        if (this.lastUpdMinute.get(data.s) !== minutes) {
          this.lastUpdMinute.set(data.s, d.getMinutes());

          const now = new Date();
          now.setSeconds(0);
          now.setMilliseconds(0);

          this.candlesModel.set(
            data.s,
            price,
            data.v,
            data.n,
            new Date(data.T),
            now,
          );
        }

        this.symbolToPrice.set(data.s, price);
        break;
    }
  }
}

export default class Hyperliquid {
  ws: HyperliquidWS;
  symbolToIndex: Map<string, number>;

  constructor() {}

  async start() {
    const coins = await this.getCoins();

    this.ws = new HyperliquidWS(coins);

    return this.ws.start();
  }

  async getCoins() {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'meta',
      }),
    });

    const json = await response.json();

    //@ts-ignore
    return json.universe.filter((el) => !el.isDelisted);
  }
}
