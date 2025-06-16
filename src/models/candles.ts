import Logger from 'js-logger';
import BaseModel from './base-model';
import { Candle } from '../external/types';

export default class Candles extends BaseModel {
  constructor() {
    super();
  }

  async set(
    coin: string,
    price: number,
    volume: number,
    nTrades: number,
    extTs: Date,
    createTs: Date,
  ) {
    this.conn
      .raw(
        `
        INSERT INTO candles
          (coin_id, price, volume, trades, ext_ts, created_ts)
        VALUES
          ((SELECT id FROM coins c WHERE c.name = ?), ?, ?, ?, ?, ?)
        ON CONFLICT DO NOTHING;
        `,
        [coin, price, volume, nTrades, extTs, createTs],
      )
      .catch(Logger.error);
  }

  async setMany(candles: Candle[]) {
    if (!candles.length) {
      return;
    }

    let query =
      'INSERT INTO candles (coin_id, price, volume, trades, ext_ts, created_ts) VALUES ';
    let params = [];

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      let endL = '';

      if (i === candles.length - 1) {
        endL = ';';
      } else {
        endL = ',';
      }

      query += `(?, ?, ?, ?, ?, NOW())${endL}`;
      params.push(
        candle.coinId,
        candle.price,
        candle.volume || 0,
        candle.nTrades,
        candle.extTs,
      );
    }

    await this.conn.raw(query, params).catch((error) => {
      Logger.info(`Broken query:`, query);
      Logger.error(error);
    });
  }
}
