# Usa una imagen base oficial de Node.js
FROM node:16-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos del proyecto al contenedor
COPY package*.json ./
COPY . .

COPY . /app

# Instala las dependencias
RUN npm install

# Expone el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
