const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'postgres',
});

async function init() {
  try {
    await client.connect();
    const dbName = process.env.DB_NAME || 'sosisbakar';
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[DB] Database "${dbName}" created.`);
    } else {
      console.log(`[DB] Database "${dbName}" already exists.`);
    }
    await client.end();

    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: dbName,
    });
    await dbClient.connect();
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await dbClient.query(schema);
    console.log('[DB] Schema applied successfully.');
    await dbClient.end();
  } catch (err) {
    console.error('[DB] Error:', err.message);
    process.exit(1);
  }
}

init();