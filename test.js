// Importar dotenv para cargar las variables de entorno
import dotenv from 'dotenv';

// Importar el pool desde db.js
import pool from './db.js';

// Realizar la consulta a la base de datos
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error ejecutando la consulta', err.stack);
  } else {
    console.log('Hora actual:', res.rows[0]);
  }
  pool.end();
});
