# MeuBolso.AI - Backend

Backend do assistente financeiro pessoal via WhatsApp.

## 🚀 Tecnologias

- **NestJS** - Framework Node.js
- **TypeScript** - Linguagem principal
- **Supabase** - Banco de dados PostgreSQL
- **OpenAI API** - Processamento de linguagem natural
- **WhatsApp Cloud API** - Integração com WhatsApp

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# WhatsApp
WHATSAPP_API_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token

# Servidor
PORT=3000
NODE_ENV=development
```

## 🏃‍♂️ Execução

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod

# Testes
npm run test
```

## 📊 Scripts Úteis

```bash
# Popular categorias iniciais
npm run seed:categories

# Executar em modo debug
npm run start:debug
```

## 🗂️ Estrutura

```
src/
├── modules/
│   ├── users/          # Gestão de usuários
│   ├── expenses/       # Gestão de despesas
│   ├── categories/     # Categorias
│   ├── whatsapp/       # Integração WhatsApp
│   └── ai/            # Integração OpenAI
├── common/
│   ├── config/        # Configurações
│   ├── services/      # Serviços compartilhados
│   ├── interfaces/    # Interfaces TypeScript
│   └── dto/          # Data Transfer Objects
└── scripts/          # Scripts utilitários
```

## 🗄️ Banco de Dados

### Tabelas

- **users** - Usuários do sistema
- **categories** - Categorias de despesas
- **expenses** - Despesas registradas

### Setup Inicial

1. Criar projeto no Supabase
2. Executar script de seed das categorias
3. Configurar RLS (Row Level Security)

## 🔗 Integrações

### Supabase
- Cliente configurado automaticamente
- RLS para segurança
- Queries otimizadas

### OpenAI
- Interpretação de linguagem natural
- Geração de relatórios inteligentes
- Fallback para regex simples

### WhatsApp
- Webhook para recebimento
- API para envio de mensagens
- Processamento de comandos

## 📈 Próximos Passos

1. ✅ Estrutura básica criada
2. 🔄 Integração com Supabase
3. ⏳ Integração WhatsApp
4. ⏳ Integração OpenAI
5. ⏳ Deploy em Railway