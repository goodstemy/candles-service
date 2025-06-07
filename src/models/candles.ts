import Logger from 'js-logger';
import BaseModel from './base-model';

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
}
