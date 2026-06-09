FROM node:20-alpine

# Prisma necesita OpenSSL y compatibilidad con libc
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package.json ./
RUN npm install

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "dev"]
