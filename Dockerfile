# Imagen base de Node.js
FROM node:18

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos necesarios para instalar dependencias
COPY package*.json ./

COPY . /app


# Instalar dependencias
RUN npm install

# Copiar el resto del proyecto al contenedor
COPY . .

# Exponer el puerto en el contenedor
EXPOSE 3000

# Comando para ejecutar tu aplicación
CMD ["node", "server.js"]
