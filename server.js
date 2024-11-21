const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors'); // Importa CORS

const app = express();
const PORT = 3000;
const path = require('path');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configura CORS para permitir solicitudes desde el puerto 5500
app.use(cors({
  origin: 'http://127.0.0.1:5500'
}));

app.use(express.json());
app.use(express.static(__dirname));


// Configura la base de datos SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error al abrir la base de datos', err.message);
  } else {
    console.log('Conexión a la base de datos SQLite exitosa');
    db.run(`CREATE TABLE IF NOT EXISTS Cuenta (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre TEXT,
      Apellido TEXT,
      Email TEXT,
      ID_Plan INTEGER,
      Fecha_Registro DATE
    )`, (err) => {
      if (err) {
        console.error('Error al crear la tabla Cuenta:', err.message);
      } else {
        console.log('Tabla Cuenta creada o existente.');
      }
    });
  }
});

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

  const query = `INSERT INTO Cuenta (Nombre, Apellido, Email, ID_Plan, Fecha_Registro, Contraseña) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(query, [nombre, apellido, correo, planID, fecha_registro, contrasena], function (err) {
    if (err) {
      console.error('Error al insertar en la tabla Cuenta:', err.message);
      res.json({ success: false, message: 'Error en el registro: ' + err.message });
    } else {
      console.log('Registro exitoso. ID de la fila insertada:', this.lastID);
      res.json({ success: true });
    }
  });
});


// Ruta para iniciar sesión
app.post('/login', (req, res) => {
  const { correo, contrasena } = req.body;
  const query = `SELECT * FROM Cuenta WHERE Email = ?`;
  db.get(query, [correo], (err, row) => {
    if (err) {
      res.json({ success: false, message: 'Error en la consulta: ' + err.message });
    } else if (row) {
      if (row.Contraseña === contrasena) {
        // Envía el ID del usuario en la respuesta de inicio de sesión
        res.json({ success: true, userId: row.ID });
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

// Ruta para obtener todas las películas con sus carátulas
app.get('/api/peliculas', (req, res) => {
  const query = `
      SELECT Pelicula.ID, Pelicula.Nombre, Pelicula.Genero, Caratula.URL_Caratula
      FROM Pelicula
      JOIN Caratula ON Pelicula.ID = Caratula.ID_Pelicula
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener películas:', err.message);
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows); // Devuelve el resultado como un array de objetos JSON
    }
  });
});
// Ruta para recibir la calificación y el comentario
app.post('/api/feedback', (req, res) => {
  const { movieId, rating, comment, profileId, accountId } = req.body;
  const fecha = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD

  const query = `
      INSERT INTO Calificacion (Valor, Comentario, ID_Pelicula, ID_Perfil, ID_Cuenta, Fecha) 
      VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [rating, comment, movieId, profileId, accountId, fecha], function (err) {
    if (err) {
      console.error('Error al insertar en Calificacion:', err.message);
      res.json({ success: false, message: 'Error al registrar la calificación' });
    } else {
      res.json({ success: true, message: 'Calificación registrada con éxito' });
    }
  });
});

app.get('/api/recomendacion/:movieId', (req, res) => {
  const movieId = req.params.movieId;
  const query = `
      SELECT Pelicula.ID, Pelicula.Nombre, Caratula.URL_Caratula
      FROM Recomienda
      JOIN Pelicula ON Recomienda.ID_recomendada = Pelicula.ID
      JOIN Caratula ON Pelicula.ID = Caratula.ID_Pelicula
      WHERE Recomienda.ID_recomienda = ?
  `;

  db.get(query, [movieId], (err, row) => {
    if (err) {
      console.error('Error al obtener recomendación:', err.message);
      res.status(500).json({ error: 'Error al obtener recomendación' });
    } else if (row) {
      res.json(row); // Enviar la recomendación como respuesta
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

  const query = `SELECT * FROM Perfil WHERE ID_Cuenta = ?`;
  db.all(query, [accountId], (err, rows) => {
    if (err) {
      console.error('Error al obtener perfiles:', err.message);
      res.status(500).json({ error: 'Error interno del servidor' });
    } else {
      res.json(rows);
    }
  });
});



// Ruta para crear un nuevo perfil
app.post('/api/profiles', (req, res) => {
  const { name, age, type, accountId } = req.body;
  const query = `INSERT INTO Perfil (Nombre, ID_Cuenta, Edad, Tipo_Perfil) VALUES (?, ?, ?, ?)`;
  db.run(query, [name, accountId, age, type], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, profileId: this.lastID });
    }
  });
});


// Ruta para obtener un perfil por ID
app.get('/api/profiles/:id', (req, res) => {
  const profileId = req.params.id;
  const query = `SELECT * FROM Perfil WHERE rowid = ?`;
  db.get(query, [profileId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(row);
    }
  });
});

// Ruta para editar un perfil
app.put('/api/profiles/:id', (req, res) => {
  const profileId = req.params.id;
  const { name, age, type } = req.body;
  const query = `UPDATE Perfil SET Nombre = ?, Edad = ?, Tipo_Perfil = ? WHERE rowid = ?`;
  db.run(query, [name, age, type, profileId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true });
    }
  });
});

// Ruta para eliminar un perfil por ID
app.delete('/api/profiles/:id', (req, res) => {
  const profileId = req.params.id; // Cambiado a ID en lugar de nombre
  console.log(`Intentando eliminar el perfil con ID: ${profileId}`); // Depuración

  const query = `DELETE FROM Perfil WHERE rowid = ?`; // Elimina el perfil usando el ID
  db.run(query, [profileId], function(err) {
      if (err) {
          console.error('Error al intentar eliminar el perfil:', err.message);
          res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
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
      Caratula.URL_Caratula -- Asumiendo que tienes una tabla Caratula con el URL de la imagen
    FROM 
      Calificacion
    JOIN 
      Pelicula ON Calificacion.ID_Pelicula = Pelicula.ID
    LEFT JOIN
      Caratula ON Pelicula.ID = Caratula.ID_Pelicula
    GROUP BY 
      Pelicula.ID
    ORDER BY 
      promedio_calificacion DESC
    LIMIT 10;
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener las películas mejor calificadas:', err.message);
      res.status(500).json({ error: 'Error interno del servidor' });
    } else {
      res.json(rows);
    }
  });
});

// Ruta para obtener las películas vistas recientemente por un perfil específico
app.get('/api/continuar-viendo', (req, res) => {
  const profileName = req.query.profileName; // Obtén el nombre del perfil desde la solicitud

  console.log('Nombre del perfil recibido:', profileName); // Depuración

  if (!profileName) {
    return res.status(400).json({ error: 'El nombre del perfil es obligatorio' });
  }

  // Busca el perfil en la base de datos con el nombre proporcionado
  const obtenerPerfilQuery = `SELECT * FROM Perfil WHERE Nombre = ?`;

  db.get(obtenerPerfilQuery, [profileName], (err, perfil) => {
    if (err) {
      console.error('Error al buscar el perfil:', err.message);
      return res.status(500).json({ error: 'Error interno al buscar el perfil' });
    }

    if (!perfil) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    // Usar el ID del perfil encontrado para buscar las películas asociadas
    const obtenerPeliculasQuery = `
      SELECT Pelicula.ID, Pelicula.Nombre, Caratula.URL_Caratula
      FROM Ver
      JOIN Pelicula ON Ver.ID_Pelicula = Pelicula.ID
      LEFT JOIN Caratula ON Pelicula.ID = Caratula.ID_Pelicula
      WHERE Ver.Nombre_Perfil = ?
      ORDER BY Ver.Fecha_visualizacion DESC
      LIMIT 10;
    `;

    db.all(obtenerPeliculasQuery, [profileName], (err, rows) => {
      if (err) {
        console.error('Error al obtener las películas vistas:', err.message);
        return res.status(500).json({ error: 'Error al obtener las películas vistas' });
      }

      if (!rows.length) {
        console.log('No se encontraron películas para el perfil:', profileName);
        return res.json([]);
      }

      res.json(rows); // Devuelve las películas encontradas
    });
  });
});


app.post('/api/ver', (req, res) => {
  console.log('Ruta /api/ver invocada');
  const { profileName, movieId, fechaVisualizacion } = req.body;

  if (!profileName || !movieId || !fechaVisualizacion) {
      return res.status(400).json({ error: 'Datos incompletos para registrar la visualización' });
  }

  const obtenerCuentaQuery = `SELECT ID_Cuenta FROM Perfil WHERE Nombre = ?`;

  db.get(obtenerCuentaQuery, [profileName], (err, row) => {
      if (err) {
          console.error('Error al buscar el perfil:', err.message);
          return res.status(500).json({ error: 'Error interno al buscar el perfil' });
      }

      if (!row) {
          return res.status(404).json({ error: 'Perfil no encontrado' });
      }

      const accountId = row.ID_Cuenta;

      // Verificar si ya existe el registro
      const verificarQuery = `
          SELECT * FROM Ver 
          WHERE Fecha_visualizacion = ? AND ID_Cuenta = ? AND ID_Pelicula = ?
      `;

      db.get(verificarQuery, [fechaVisualizacion, accountId, movieId], (err, existingRow) => {
          if (err) {
              console.error('Error al verificar registro existente:', err.message);
              return res.status(500).json({ error: 'Error al verificar registro existente' });
          }

          if (existingRow) {
              console.log('Registro ya existe:', existingRow);
              return res.status(409).json({ error: 'Registro ya existe' });
          }

          // Insertar el nuevo registro si no existe
          const insertarVisualizacionQuery = `
              INSERT INTO Ver (Fecha_visualizacion, Nombre_Perfil, ID_Cuenta, ID_Pelicula)
              VALUES (?, ?, ?, ?)
          `;

          db.run(insertarVisualizacionQuery, [fechaVisualizacion, profileName, accountId, movieId], function (err) {
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
  const adminPassword = 'admin123'; // Asegúrate de usar variables de entorno en producción

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

  db.all(query, [], (err, rows) => {
      if (err) {
          console.error('Error ejecutando consulta SQL:', err.message);
          return res.status(500).json({ error: err.message });
      }

      res.json({ result: rows });
  });
});

// Definir una lista de administradores quemados
const administradores = [
  { email: 'luis@gmail.com', password: '1234' },
  { email: 'angel@gmail.com', password: '1234' },
  { email: 'jonathan@gmail.com', password: '1234' },
  { email: 'dilan@gmail.com', password: '1234' }
];

// Ruta para inicio de sesión de administradores
app.post('/admin-login', (req, res) => {
  const { correo, contrasena } = req.body;

  // Verificar si el correo y la contraseña coinciden con alguno de los administradores
  const admin = administradores.find(
      admin => admin.email === correo && admin.password === contrasena
  );

  if (admin) {
      res.json({ isAdmin: true });
  } else {
      res.json({ isAdmin: false, message: 'Credenciales inválidas o no eres administrador.' });
  }
});