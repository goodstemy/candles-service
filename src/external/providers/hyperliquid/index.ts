import WebSocket from 'ws';
import config from '../../../config';
import Logger from 'js-logger';
import Coins from '../../../models/coins';
import { setTimeout } from 'node:timers/promises';
import CandleAggregator from 'src/candle-aggregator';
import { Coin } from '../../types';

class HyperliquidWS {
  serviceName = 'HyperliquidWS';
  pingPongTimeout = 60_000;
  symbolToPrice: Map<string, number>;
  lastUpdMinute: Map<string, number>;
  ws: WebSocket;
  coinsModel: Coins;
  coins: Coin[];
  candleAggregator: CandleAggregator;

  constructor(coins: Coin[], ca: CandleAggregator) {
    this.coins = coins;
    this.symbolToPrice = new Map();
    this.lastUpdMinute = new Map();
    this.coinsModel = new Coins();
    this.candleAggregator = ca;
  }

  start() {
    this.ws = new WebSocket(config.hyperliquid.wsHost);

    this.ws.on('error', async (err) => {
      Logger.error(this.serviceName, err);

      await setTimeout(10_000);

      this.start();
    });
    this.ws.on('message', (msg) => this.processWsMessage(msg));
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

        const now = new Date();

        this.candleAggregator.set({
          exchange: this.serviceName,
          coin: data.s,
          price,
          volume: data.v,
          nTrades: data.n,
          extTs: new Date(data.T),
          createTs: now,
        });

        this.symbolToPrice.set(data.s, price);
        break;
    }
  }
}

export default class Hyperliquid {
  serviceName: 'Hyperliquid';
  coinsModel: Coins;
  ws: HyperliquidWS;
  symbolToIndex: Map<string, number>;
  candleAggregator: CandleAggregator;

  constructor(ca: CandleAggregator) {
    this.coinsModel = new Coins();
    this.candleAggregator = ca;
  }

  async start() {
    let coins = [];

    if (config.fillCoins) {
      coins = await this.getCoins();
    }

    if (!coins || !coins.length) {
      coins = await this.coinsModel.get();
    }

    this.ws = new HyperliquidWS(coins, this.candleAggregator);

    return this.ws.start();
  }

  async getCoins() {
    try {
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
    } catch (error) {
      Logger.error(error);
      return [];
    }
  }
}
