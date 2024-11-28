// Importar dotenv para cargar las variables de entorno
import dotenv from 'dotenv';

// Importar el paquete completo 'pg' y extraer el Pool
import pkg from 'pg';
const { Pool } = pkg;

// Cargar las variables de entorno del archivo .env
dotenv.config();

// Crear una nueva instancia de Pool con la configuración
const pool = new Pool({
  user: process.env.PG_USER,          // Usuario de la base de datos (por ejemplo: postgres)
  host: process.env.PG_HOST,          // Dirección del servidor de base de datos (por ejemplo: localhost)
  database: process.env.PG_DATABASE,  // Nombre de la base de datos (por ejemplo: sqlite)
  password: process.env.PG_PASSWORD,  // Contraseña del usuario
  port: process.env.PG_PORT,          // Puerto de la base de datos (5432 por defecto en PostgreSQL)
});

// Exportar el pool para que otros archivos puedan utilizarlo
export default pool;
