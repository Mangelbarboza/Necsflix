// server.js
import express from 'express';
import cors from 'cors'; // Importa CORS
import pool from './db.js'; // Importa el pool de conexiones

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configura CORS para permitir solicitudes desde el puerto 5500
app.use(cors({
  origin: 'http://127.0.0.1:5500'
}));

app.use(express.static('public'));

// Ruta para registrar un nuevo usuario
app.post('/register', (req, res) => {
  const { nombre, apellido, correo, contrasena, plan } = req.body;
  const fecha_registro = new Date().toISOString().split('T')[0];
  let planID;

  console.log('Datos recibidos en /register:', { nombre, apellido, correo, contrasena, plan });

  switch (plan) {
    case 'basico':
      planID = 1;
      break;
    case 'estandar':
      planID = 2;
      break;
    case 'premium':
      planID = 3;
      break;
    default:
      return res.json({ success: false, message: 'Plan no válido' });
  }

  const query = `
    INSERT INTO Cuenta (Nombre, Apellido, Email, ID_Plan, Fecha_Registro, Contraseña) 
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING ID
  `;
  const values = [nombre, apellido, correo, planID, fecha_registro, contrasena];

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('Error al insertar en la tabla Cuenta:', err.message);
      res.json({ success: false, message: 'Error en el registro: ' + err.message });
    } else {
      console.log('Registro exitoso. ID de la fila insertada:', result.rows[0].id);
      res.json({ success: true });
    }
  });
});

// Ruta para iniciar sesión
app.post('/login', (req, res) => {
  const { correo, contrasena } = req.body;
  const query = `SELECT * FROM Cuenta WHERE Email = $1`;
  pool.query(query, [correo], (err, result) => {
    if (err) {
      res.json({ success: false, message: 'Error en la consulta: ' + err.message });
    } else if (result.rows.length > 0) {
      const row = result.rows[0];
      if (row.contraseña === contrasena) {
        // Envía el ID del usuario en la respuesta de inicio de sesión
        res.json({ success: true, userId: row.id });
      } else {
        res.json({ success: false, message: 'Contraseña incorrecta' });
      }
    } else {
      res.json({ success: false, message: 'Correo incorrecto' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

// Rutas adicionales...
// Por ejemplo, la ruta para obtener todas las películas
app.get('/api/peliculas', (req, res) => {
  const query = `
    SELECT Pelicula.ID, Pelicula.Nombre, Genero.Genero, Caratula.URL_Caratula
    FROM Pelicula
    JOIN Caratula ON Pelicula.ID = Caratula.ID_Pelicula
    INNER JOIN Genero ON Genero.Pelicula_id = Pelicula.ID
  `;

  pool.query(query, [], (err, result) => {
    if (err) {
      console.error('Error al obtener películas:', err.message);
      res.status(500).json({ error: err.message });
    } else {
      res.json(result.rows);
    }
  });
});

// Ruta para recibir la calificación y el comentario
app.post('/api/feedback', (req, res) => {
  const { movieId, rating, comment, profileId, accountId } = req.body;
  const fecha = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD

  const query = `
    INSERT INTO Calificacion (Valor, Comentario, ID_Pelicula, ID_Perfil, ID_Cuenta, Fecha)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  const values = [rating, comment, movieId, profileId, accountId, fecha];

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('Error al insertar en Calificacion:', err.message);
      res.json({ success: false, message: 'Error al registrar la calificación' });
    } else {
      res.json({ success: true, message: 'Calificación registrada con éxito' });
    }
  });
});

// Ruta para obtener una recomendación basada en una película
app.get('/api/recomendacion/:movieId', (req, res) => {
  const movieId = req.params.movieId;
  const query = `
    SELECT Pelicula.ID, Pelicula.Nombre, Caratula.URL_Caratula
    FROM Recomienda
    JOIN Pelicula ON Recomienda.ID_recomendada = Pelicula.ID
    JOIN Caratula ON Pelicula.ID = Caratula.ID_Pelicula
    WHERE Recomienda.ID_recomienda = $1
  `;

  pool.query(query, [movieId], (err, result) => {
    if (err) {
      console.error('Error al obtener recomendación:', err.message);
      res.status(500).json({ error: 'Error al obtener recomendación' });
    } else if (result.rows.length > 0) {
      res.json(result.rows[0]); // Enviar la recomendación como respuesta
    } else {
      res.json({ error: 'No se encontró recomendación para esta película' });
    }
  });
});

// Ruta para obtener los perfiles de una cuenta específica
app.get('/api/profiles', (req, res) => {
  const accountId = req.query.accountId;
  if (!accountId) {
    return res.status(400).json({ error: "El ID de la cuenta es obligatorio" });
  }

  const query = `SELECT nombre, id_perfil, id_cuenta, edad, tipo_perfil FROM Perfil WHERE id_cuenta = $1`;
  pool.query(query, [accountId], (err, result) => {
    if (err) {
      console.error('Error al obtener perfiles:', err.message);
      res.status(500).json({ error: 'Error interno del servidor' });
    } else {
      res.json(result.rows);
    }
  });
});

// Ruta para crear un nuevo perfil
app.post('/api/profiles', (req, res) => {
  const { name, age, type, accountId } = req.body;
  const query = `
    INSERT INTO Perfil (nombre, id_cuenta, edad, tipo_perfil) 
    VALUES ($1, $2, $3, $4) RETURNING id_perfil
  `;
  const values = [name, accountId, age, type];

  pool.query(query, values, (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, profileId: result.rows[0].id_perfil });
    }
  });
});

// Ruta para obtener un perfil por ID
app.get('/api/profiles/:id', (req, res) => {
  const profileId = req.params.id;
  const query = `SELECT nombre, id_perfil, id_cuenta, edad, tipo_perfil FROM Perfil WHERE id_perfil = $1`;
  pool.query(query, [profileId], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(result.rows[0]);
    }
  });
});

// Ruta para editar un perfil
app.put('/api/profiles/:id', (req, res) => {
  const profileId = req.params.id;
  const { name, age, type } = req.body;
  const query = `
    UPDATE Perfil SET nombre = $1, edad = $2, tipo_perfil = $3 WHERE id_perfil = $4
  `;
  const values = [name, age, type, profileId];

  pool.query(query, values, (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Perfil no encontrado' });
    } else {
      res.json({ success: true });
    }
  });
});

// Ruta para eliminar un perfil por ID
app.delete('/api/profiles/:id', (req, res) => {
  const profileId = req.params.id;
  console.log(`Intentando eliminar el perfil con ID: ${profileId}`);

  const query = `DELETE FROM Perfil WHERE id_perfil = $1`;
  pool.query(query, [profileId], (err, result) => {
    if (err) {
      console.error('Error al intentar eliminar el perfil:', err.message);
      res.status(500).json({ error: err.message });
    } else if (result.rowCount === 0) {
      console.warn('Perfil no encontrado para eliminar:', profileId);
      res.status(404).json({ success: false, message: 'Perfil no encontrado' });
    } else {
      console.log('Perfil eliminado exitosamente con ID:', profileId);
      res.json({ success: true, message: 'Perfil eliminado exitosamente' });
    }
  });
});

// Ruta para obtener las películas con mejor calificación promedio
app.get('/api/mejor-calificadas', (req, res) => {
  const query = `
    SELECT 
      Pelicula.ID, 
      Pelicula.Nombre, 
      AVG(Calificacion.Valor) as promedio_calificacion,
      Caratula.URL_Caratula
    FROM 
      Calificacion
    JOIN 
      Pelicula ON Calificacion.ID_Pelicula = Pelicula.ID
    LEFT JOIN
      Caratula ON Pelicula.ID = Caratula.ID_Pelicula
    GROUP BY 
      Pelicula.ID, Caratula.URL_Caratula
    ORDER BY 
      promedio_calificacion DESC
    LIMIT 10;
  `;

  pool.query(query, [], (err, result) => {
    if (err) {
      console.error('Error al obtener las películas mejor calificadas:', err.message);
      res.status(500).json({ error: 'Error interno del servidor' });
    } else {
      res.json(result.rows);
    }
  });
});

// Ruta para obtener las películas vistas recientemente por un perfil específico
app.get('/api/continuar-viendo', (req, res) => {
  const profileName = req.query.profileName;

  console.log('Nombre del perfil recibido:', profileName);

  if (!profileName) {
    return res.status(400).json({ error: 'El nombre del perfil es obligatorio' });
  }

  const obtenerPerfilQuery = `SELECT * FROM Perfil WHERE Nombre = $1`;

  pool.query(obtenerPerfilQuery, [profileName], (err, result) => {
    if (err) {
      console.error('Error al buscar el perfil:', err.message);
      return res.status(500).json({ error: 'Error interno al buscar el perfil' });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    const perfil = result.rows[0];

    const obtenerPeliculasQuery = `
      SELECT Pelicula.ID, Pelicula.Nombre, Caratula.URL_Caratula
      FROM Ver
      JOIN Pelicula ON Ver.ID_Pelicula = Pelicula.ID
      LEFT JOIN Caratula ON Pelicula.ID = Caratula.ID_Pelicula
      WHERE Ver.Nombre_Perfil = $1
      ORDER BY Ver.Fecha_visualizacion DESC
      LIMIT 10;
    `;

    pool.query(obtenerPeliculasQuery, [profileName], (err, result) => {
      if (err) {
        console.error('Error al obtener las películas vistas:', err.message);
        return res.status(500).json({ error: 'Error al obtener las películas vistas' });
      }

      if (result.rows.length === 0) {
        console.log('No se encontraron películas para el perfil:', profileName);
        return res.json([]);
      }

      res.json(result.rows);
    });
  });
});

app.post('/api/ver', (req, res) => {
  console.log('Ruta /api/ver invocada');
  const { profileName, movieId, fechaVisualizacion } = req.body;

  if (!profileName || !movieId || !fechaVisualizacion) {
    return res.status(400).json({ error: 'Datos incompletos para registrar la visualización' });
  }

  const obtenerCuentaQuery = `SELECT ID_Cuenta FROM Perfil WHERE Nombre = $1`;

  pool.query(obtenerCuentaQuery, [profileName], (err, result) => {
    if (err) {
      console.error('Error al buscar el perfil:', err.message);
      return res.status(500).json({ error: 'Error interno al buscar el perfil' });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    const accountId = result.rows[0].id_cuenta;

    const verificarQuery = `
      SELECT * FROM Ver 
      WHERE Fecha_visualizacion = $1 AND ID_Cuenta = $2 AND ID_Pelicula = $3
    `;

    pool.query(verificarQuery, [fechaVisualizacion, accountId, movieId], (err, result) => {
      if (err) {
        console.error('Error al verificar registro existente:', err.message);
        return res.status(500).json({ error: 'Error al verificar registro existente' });
      }

      if (result.rows.length > 0) {
        console.log('Registro ya existe:', result.rows[0]);
        return res.status(409).json({ error: 'Registro ya existe' });
      }

      const insertarVisualizacionQuery = `
        INSERT INTO Ver (Fecha_visualizacion, Nombre_Perfil, ID_Cuenta, ID_Pelicula)
        VALUES ($1, $2, $3, $4)
      `;
      const values = [fechaVisualizacion, profileName, accountId, movieId];

      pool.query(insertarVisualizacionQuery, values, (err, result) => {
        if (err) {
          console.error('Error al registrar visualización:', err.message);
          return res.status(500).json({ error: 'Error al registrar visualización' });
        }

        console.log('Visualización registrada con éxito');
        res.json({ success: true, message: 'Visualización registrada con éxito' });
      });
    });
  });
});

// Verificar si el usuario es administrador
app.post('/api/login/admin', (req, res) => {
  const { email, password } = req.body;
  const adminEmail = 'admin@netflixclone.com';
  const adminPassword = 'admin123'; // Usa variables de entorno en producción

  if (email === adminEmail && password === adminPassword) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Credenciales inválidas' });
  }
});

// Ruta para ejecutar consultas SQL
app.post('/api/execute-sql', (req, res) => {
  const { query } = req.body;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Consulta vacía' });
  }

  pool.query(query, [], (err, result) => {
    if (err) {
      console.error('Error ejecutando consulta SQL:', err.message);
      return res.status(500).json({ error: err.message });
    }

    res.json({ result: result.rows });
  });
});

// Lista de administradores
const administradores = [
  { email: 'luis@gmail.com', password: '1234' },
  { email: 'angel@gmail.com', password: '1234' },
  { email: 'jonathan@gmail.com', password: '1234' },
  { email: 'dilan@gmail.com', password: '1234' }
];

// Ruta para inicio de sesión de administradores
app.post('/admin-login', (req, res) => {
  const { correo, contrasena } = req.body;

  const admin = administradores.find(
    admin => admin.email === correo && admin.password === contrasena
  );

  if (admin) {
    res.json({ isAdmin: true });
  } else {
    res.json({ isAdmin: false, message: 'Credenciales inválidas o no eres administrador.' });
  }
});