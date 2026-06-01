# 🏋️ TrainUp — Sistema de Gestão de Academia

Plataforma web completa para gestão de academias — controle de alunos, mensalidades, treinos e alertas inteligentes em um único painel administrativo.

🌐 **Demo em produção:** [treino-app-168f.onrender.com](https://treino-app-168f.onrender.com)

---

## 📋 Sobre o projeto

O TrainUp é um sistema web fullstack desenvolvido para academias gerenciarem seus alunos de forma simples e eficiente. O sistema centraliza o cadastro de clientes, o controle de mensalidades e o acompanhamento de frequência — com alertas automáticos para situações que precisam de atenção imediata.

O projeto foi construído com arquitetura fullstack moderna: frontend em Next.js com App Router, API REST em Node.js/Express, banco PostgreSQL em nuvem e deploy completo em produção.

> **Em desenvolvimento:** versão mobile em React Native para os alunos acompanharem seus treinos.

---

## ✅ Funcionalidades

### 🔐 Autenticação
- Login com e-mail e senha
- Controle de acesso por perfil (admin / cliente)
- Sessão persistente com JWT

### 📊 Dashboard
- Total de alunos cadastrados
- Alunos ativos no mês
- Alunos com mensalidade em dia vs. inadimplentes
- Alunos que não treinam há mais de 7 dias
- Receita mensal recebida vs. prevista
- Gráfico de novos cadastros por mês
- Gráfico de frequência semanal

### 👥 Cadastro de Clientes
- Listagem completa com busca e filtros
- Cadastro com dados pessoais (nome, e-mail, telefone, data de nascimento, gênero)
- Edição e exclusão de clientes
- Visualização do perfil individual com histórico

### 💰 Mensalidades
- Lançamento de mensalidades por aluno
- Controle de status: pago, pendente, atrasado
- Filtro por mês/ano e por status
- Histórico de pagamentos por aluno

### 🔔 Alertas
- Mensalidades atrasadas (vencidas e não pagas)
- Alunos sem treinar há mais de X dias (configurável)
- Aniversariantes do dia e do mês
- Painel de alertas consolidado com ações rápidas

---

## 🛠️ Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilização | Tailwind CSS |
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL via [Neon](https://neon.tech/) |
| Autenticação | JWT (JSON Web Token) |
| Deploy | [Render](https://render.com/) (frontend + backend) |
| Linguagens | TypeScript 77% · JavaScript 21% |

---

## 🗂️ Estrutura do projeto

```
trainup/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── dashboard/       # Painel principal
│   │   │   ├── clientes/        # CRUD de alunos
│   │   │   ├── mensalidades/    # Controle de pagamentos
│   │   │   └── alertas/         # Central de alertas
│   │   ├── cliente/             # Área do aluno
│   │   └── public/              # Login, cadastro, recuperação de senha
│   └── components/              # Componentes reutilizáveis
├── backend/
│   ├── routes/                  # Endpoints REST
│   └── db/                      # Conexão com PostgreSQL
└── public/                      # Assets estáticos
```

---

## ⚙️ Rodando localmente

### Pré-requisitos

- Node.js 18+
- npm
- PostgreSQL local ou conta no [Neon](https://neon.tech/) (gratuito)

### 1. Clone o repositório

```bash
git clone https://github.com/jonhnyWillian/Treino-app.git
cd Treino-app
```

### 2. Configure as variáveis de ambiente

Na raiz do projeto, crie `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Dentro de `/backend`, crie `.env`:

```env
DATABASE_URL=sua_connection_string_postgresql
JWT_SECRET=sua_chave_secreta
PORT=3001
```

### 3. Instale as dependências

```bash
# Dependências do frontend
npm install

# Dependências do backend
cd backend
npm install
```

### 4. Rode o projeto

Em dois terminais separados:

```bash
# Terminal 1 — Backend
cd backend
node server.js

# Terminal 2 — Frontend
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy em produção

| Serviço | URL |
|---|---|
| Aplicação web | [treino-app-168f.onrender.com](https://treino-app-168f.onrender.com) |
| Banco de dados | Neon PostgreSQL (serverless) |

> O Render usa o plano free — o primeiro acesso pode levar até 30 segundos para a instância acordar.

---

## 📐 Decisões técnicas

| Decisão | Motivo |
|---|---|
| Next.js 14 com App Router | SSR nativo, roteamento moderno e melhor performance |
| Node.js + Express no backend | API REST leve, fácil de escalar e reutilizar no mobile |
| PostgreSQL no Neon | Banco relacional serverless, sem custo inicial |
| API separada do frontend | Permite reutilização no app mobile React Native |
| JWT para autenticação | Stateless, seguro e compatível com mobile |
| Deploy no Render | CI/CD automático via push no GitHub |

---

## 📱 Versão mobile

A versão mobile está sendo desenvolvida em **React Native**, consumindo a mesma API REST — sem duplicação de lógica de negócio. Permitirá que os alunos acompanhem treinos, visualizem histórico e recebam notificações.

> Repositório mobile: [github.com/jonhnyWillian/App-Treino-React](https://github.com/jonhnyWillian/App-Treino-React)

---

## 👨‍💻 Autor

**Jonhny Willian**  
Desenvolvedor Fullstack — Next.js · Node.js · React Native · PostgreSQL

https://linkedin.com/in/jonhny-willian