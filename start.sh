#!/bin/bash

echo "🚀 Iniciando Frontend Logoali..."
echo ""

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker Desktop."
    exit 1
fi

echo "✅ Docker está rodando"
echo ""

# Criar .env.local se não existir
if [ ! -f ".env.local" ]; then
    echo "📝 Criando .env.local..."
    echo 'NEXT_PUBLIC_API_URL=http://localhost:3001' > .env.local
    echo "✅ Arquivo .env.local criado"
    echo ""
fi

# Verificar se docker-compose.yml existe
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml não encontrado!"
    exit 1
fi

# Verificar se a rede existe (criada pelo backend)
if ! docker network inspect logoali-network > /dev/null 2>&1; then
    echo "⚠️  Rede 'logoali-network' não encontrada. Criando..."
    docker network create logoali-network
    echo "✅ Rede criada"
    echo ""
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down

# Construir e iniciar containers
echo "🔨 Construindo e iniciando containers..."
export COMPOSE_HTTP_TIMEOUT=300

if ! docker-compose up -d --build; then
    echo "❌ Erro ao construir/iniciar containers!"
    echo "📊 Verifique os logs: docker-compose logs"
    exit 1
fi

echo ""
echo "✅ Frontend iniciado com sucesso!"
echo ""
echo "📍 Acesse:"
echo "   Frontend: http://localhost:3000"
echo ""
echo "⚠️  Certifique-se de que o Backend está rodando em http://localhost:3001"
echo ""
echo "📊 Ver logs: docker-compose logs -f"
echo "🛑 Parar: docker-compose down"



