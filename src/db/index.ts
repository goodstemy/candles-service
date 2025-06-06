const knex = require('knex');
import { Knex } from 'knex';
import config from '../config';

let conn: Knex;

export default () => {
  if (!conn) {
    conn = knex({
      client: 'pg',
      connection: {
        host: config.db.host,
        port: config.db.port,
        user: config.db.username,
        password: config.db.password,
        database: config.db.name,
      },
    });
  }

  return conn;
};
