FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Variável de ambiente para Next.js rodar em modo host
ENV NEXT_TELEMETRY_DISABLED=1

# Comando padrão (pode ser sobrescrito no docker-compose)
CMD ["npm", "run", "dev"]

