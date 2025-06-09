import * as dotenv from 'dotenv';
import Logger from 'js-logger';

dotenv.config();
Logger.useDefaults();

const isTestnet = process.env.TESTNET === 'true';

export default {
  fillCoins: process.env.FILL_COINS === '1',
  hyperliquid: {
    // @ts-ignore
    enabled: process.env.PROVIDER_HYPERLIQUID_ENABLED === '1',
    privateKey: process.env.WEB3_PRIVATE_KEY,
    testnet: isTestnet,
    publicAddress: process.env.PUBLIC_ADDRESS,
    host: isTestnet
      ? 'https://api.hyperliquid-testnet.xyz'
      : 'https://api.hyperliquid.xyz',
    // wsHost: isTestnet
    //   ? 'wss://api.hyperliquid-testnet.xyz/ws'
    //   : 'wss://api.hyperliquid.xyz/ws',
    wsHost: 'wss://api.hyperliquid.xyz/ws', // Using only mainnet because of testnet ws issues
  },
  binance: {
    // @ts-ignore
    enabled: process.env.PROVIDER_BINANCE_ENABLED === '1',
    wsHost: 'wss://stream.binance.com:9443',
  },
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_DATABASE,
    schema: process.env.DB_SCHEMA,
  },
};
