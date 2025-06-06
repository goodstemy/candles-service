import { Knex } from 'knex';
import db from '../db';

export default class BaseModel {
  conn: Knex;

  constructor() {
    this.conn = db();
  }
}
