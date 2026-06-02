FROM node:18-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código
COPY . .

# Exponer puerto
EXPOSE 4000

# Comando por defecto (se sobrescribe en docker-compose)
CMD ["npm", "run", "start:dev"]

FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx nest build

FROM node:18-alpine

RUN apk add --no-cache libxslt openssl
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/resources ./resources

EXPOSE 3001

CMD ["node", "dist/src/main.js"]