export type Coin = {
  id: number;
  name: string;
  szDecimals: number;
  maxLeverage: number;
};

export type Candle = {
  coin: string;
  price: number;
  volume: number;
  nTrades: number;
  extTs: Date;
};
