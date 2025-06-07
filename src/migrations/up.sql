CREATE TABLE IF NOT EXISTS coins (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  decimals INTEGER NOT NULL,
  max_leverage INTEGER NOT NULL,
  enabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS candles (
  id SERIAL PRIMARY KEY,
  coin_id INTEGER REFERENCES coins (id),
  price REAL NOT NULL,
  volume REAL NOT NULL,
  trades INTEGER NOT NULL,
  ext_ts TIMESTAMP
  WITH
    TIME ZONE NOT NULL,
    created_ts TIMESTAMP
  WITH
    TIME ZONE NOT NULL
);

CREATE UNIQUE INDEX idx_id_created_ts ON candles (coin_id, created_ts);
