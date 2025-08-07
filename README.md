# 🏦 Angels System - Sistema de Renda Extra

Plataforma completa de investimentos colaborativos e renda extra, desenvolvida com tecnologias modernas e foco em segurança, transparência e experiência do usuário.

## 📖 Sobre o Projeto

O Angels System é uma plataforma inovadora que conecta investidores a oportunidades de investimento coletivo, oferecendo:

- **Investimentos Colaborativos**: Participe de oportunidades de investimento com outros usuários
- **Sistema de Membership**: Planos de assinatura com benefícios exclusivos
- **Programa de Indicações**: Ganhe bonificações indicando novos usuários
- **Sorteios Exclusivos**: Participe de sorteios baseados em seus investimentos
- **Suporte Completo**: Sistema de tickets integrado com chat em tempo real
- **Dashboard Intuitivo**: Interface moderna e responsiva para gestão completa

## 🚀 Tecnologias Utilizadas

### Stack Principal
- **Frontend**: Next.js 15.4.5 com TypeScript
- **Backend**: Next.js API Routes com middleware personalizado
- **Banco de Dados**: SQLite (desenvolvimento) / PostgreSQL (produção)
- **ORM**: Prisma com migrações automáticas
- **Autenticação**: NextAuth.js com JWT + Refresh Tokens
- **UI**: Tailwind CSS + Radix UI + Componentes customizados
- **Validação**: Zod para schemas e validação de dados
- **Formulários**: React Hook Form com validação integrada

### Ferramentas de Desenvolvimento
- **Qualidade**: ESLint, Prettier, Husky
- **Commits**: Conventional Commits com Commitlint
- **Tipagem**: TypeScript estrito
- **Testes**: Jest + Testing Library (configurado)
- **Containerização**: Docker + Docker Compose

## ✨ Funcionalidades Principais

### 👤 Gestão de Usuários
- **Cadastro e Login**: Sistema completo de autenticação
- **Perfil KYC**: Verificação de identidade obrigatória
- **Níveis de Acesso**: Sistema de permissões granular
- **Dashboard Personalizado**: Interface adaptada ao perfil do usuário

### 💰 Sistema de Investimentos
- **Oportunidades**: Visualização e análise de investimentos disponíveis
- **Portfólio**: Gestão completa dos investimentos ativos
- **Histórico**: Acompanhamento de retornos e performance
- **Calculadora**: Simulação de investimentos e retornos

### 🎫 Sistema de Membership
- **Planos Flexíveis**: Diferentes níveis de assinatura
- **Benefícios Exclusivos**: Acesso a oportunidades premium
- **Pagamentos**: Integração com gateways de pagamento
- **Renovação Automática**: Gestão automatizada de assinaturas

### 🤝 Programa de Indicações
- **Código Único**: Sistema de referência personalizado
- **Bonificações**: Recompensas por indicações bem-sucedidas
- **Estatísticas**: Dashboard de performance das indicações
- **Níveis**: Sistema de níveis baseado em indicações

### 🎲 Sistema de Sorteios
- **Participação Automática**: Baseada nos investimentos realizados
- **Números da Sorte**: Sistema de numeração único
- **Histórico**: Acompanhamento de participações e resultados
- **Prêmios**: Diversos tipos de premiação

### 🎧 Sistema de Suporte
- **Tickets**: Sistema completo de abertura e acompanhamento
- **Chat Integrado**: Comunicação em tempo real
- **Filtros Avançados**: Organização por status e prioridade
- **FAQ Dinâmico**: Base de conhecimento integrada
- **Auditoria**: Registro completo de todas as interações

### 🔒 Segurança e Compliance
- **Criptografia**: Dados sensíveis protegidos
- **Auditoria**: Log completo de todas as operações
- **LGPD**: Conformidade com a Lei Geral de Proteção de Dados
- **2FA**: Autenticação de dois fatores (planejado)

## 📋 Pré-requisitos

- Node.js 18+
- SQLite (desenvolvimento) ou PostgreSQL 15+ (produção)
- npm ou yarn

## 🛠️ Instalação e Configuração

### 1. Clone o repositório
```bash
git clone https://github.com/pedroquintela1/angels-system.git
cd angels-system/angels-system-app
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Banco de Dados (SQLite para desenvolvimento)
DATABASE_URL="file:./dev.db"

# Autenticação
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here"
JWT_SECRET="your-jwt-secret-key-here"

# Configurações da Aplicação
NODE_ENV="development"
```

> **Nota**: Para produção, substitua a `DATABASE_URL` por uma conexão PostgreSQL.

### 4. Configure o banco de dados
```bash
# Gerar o cliente Prisma
npx prisma generate

# Executar migrações e criar o banco
npx prisma db push

# Popular o banco com dados iniciais (opcional)
npx prisma db seed

# (Opcional) Abrir Prisma Studio para visualizar dados
npx prisma studio
```

### 5. Execute o projeto
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start

# Linting e formatação
npm run lint
npm run lint:fix
```

O projeto estará disponível em `http://localhost:3000`

### 6. Usuário Padrão
Após executar o seed, você pode fazer login com:
- **Email**: admin@angelssystem.com
- **Senha**: admin123

## 🐳 Docker (Opcional)

Para executar com Docker:

```bash
# Construir e executar
docker-compose up --build

# Executar em background
docker-compose up -d

# Parar os serviços
docker-compose down
```

## 📁 Estrutura do Projeto

```
angels-system-app/
├── src/
│   ├── app/                    # App Router (Next.js 13+)
│   │   ├── api/               # API Routes
│   │   ├── dashboard/         # Páginas do dashboard
│   │   └── auth/              # Páginas de autenticação
│   ├── components/            # Componentes reutilizáveis
│   │   ├── ui/               # Componentes base
│   │   ├── forms/            # Componentes de formulário
│   │   └── layout/           # Componentes de layout
│   ├── lib/                   # Utilitários e configurações
│   │   ├── auth.ts           # Configuração NextAuth
│   │   ├── prisma.ts         # Cliente Prisma
│   │   ├── permissions.ts    # Sistema de permissões
│   │   └── audit.ts          # Sistema de auditoria
│   ├── types/                 # Definições TypeScript
│   ├── hooks/                 # Custom hooks React
│   └── utils/                 # Funções utilitárias
├── prisma/
│   ├── schema.prisma         # Schema do banco de dados
│   ├── migrations/           # Migrações do banco
│   └── seed.ts              # Dados iniciais
├── public/                   # Arquivos estáticos
└── docs/                     # Documentação adicional
```

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia o servidor de desenvolvimento
npm run build           # Build para produção
npm run start           # Inicia o servidor de produção
npm run lint            # Executa o linting
npm run lint:fix        # Corrige problemas de linting automaticamente

# Banco de Dados
npx prisma generate     # Gera o cliente Prisma
npx prisma db push      # Aplica mudanças no schema ao banco
npx prisma db seed      # Popula o banco com dados iniciais
npx prisma studio       # Abre o Prisma Studio
npx prisma migrate dev  # Cria e aplica nova migração

# Qualidade
npm run type-check      # Verifica tipos TypeScript
npm run format          # Formata código com Prettier
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente Completas

```env
# Banco de Dados
DATABASE_URL="file:./dev.db"  # SQLite para dev
# DATABASE_URL="postgresql://user:pass@localhost:5432/angels_system"  # PostgreSQL para prod

# Autenticação
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here"
JWT_SECRET="your-jwt-secret-key-here"

# Configurações da Aplicação
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Logs e Debug
LOG_LEVEL="info"
ENABLE_AUDIT_LOGS="true"

# Recursos Opcionais
ENABLE_NOTIFICATIONS="true"
ENABLE_ANALYTICS="false"
```

### Configuração de Produção

Para produção, considere:

1. **Banco de Dados**: Use PostgreSQL ao invés de SQLite
2. **Variáveis de Ambiente**: Configure todas as variáveis necessárias
3. **SSL**: Configure certificados SSL
4. **Monitoramento**: Implemente logs e métricas
5. **Backup**: Configure backup automático do banco de dados

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'feat: add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Commit

Este projeto usa [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração de código
- `test:` Testes
- `chore:` Tarefas de manutenção

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Equipe

- **Pedro Quintela** - Desenvolvedor Principal - [@pedroquintela1](https://github.com/pedroquintela1)

## 📞 Suporte

Para suporte, abra uma [issue](https://github.com/pedroquintela1/angels-system/issues) ou entre em contato através do sistema de suporte integrado na plataforma.

---

**Angels System** - Transformando investimentos em oportunidades reais 🚀
