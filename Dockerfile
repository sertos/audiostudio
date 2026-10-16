FROM node:20
WORKDIR /app

# Copiamos manifiestos e instalamos dependencias
COPY package*.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

# Variables y Build
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Esto compila tanto el frontend (Vite) como el backend (esbuild a server.cjs)
RUN npm run build

# Exponemos el puerto
EXPOSE 8080

# Ejecutamos el servidor de Express (node dist/server.cjs)
CMD ["npm", "start"]
