require('dotenv').config();
const sqlite3 = require('@journeyapps/sqlcipher').verbose();
const db = new sqlite3.Database('pressure.db');

db.serialize(() => {
  db.run(`PRAGMA key = "${process.env.DB_KEY}";`);

  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT NOT NULL,
    fecha_nacimiento TEXT NOT NULL,
    sexo TEXT NOT NULL,
    peso REAL NOT NULL,
    estatura REAL NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefono TEXT NOT NULL,
    password TEXT NOT NULL,
    alerts_enabled INTEGER DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    sistolica INTEGER NOT NULL,
    diastolica INTEGER NOT NULL,
    pulso INTEGER NOT NULL,
    comentario TEXT
  )`);
});

module.exports = db;