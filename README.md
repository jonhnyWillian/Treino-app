# 💪 TreinoApp

Plataforma web de gerenciamento de treinos para academias — o cliente cria conta, monta suas fichas, registra execuções e acompanha a evolução ao longo do tempo.

🌐 **Demo em produção:** [treino-app-168f.onrender.com](https://treino-app-168f.onrender.com)

---

## 📋 Sobre o projeto

O TreinoApp é uma aplicação fullstack desenvolvida do zero para resolver um problema real: cliente de academia não têm onde registrar e acompanhar seus treinos de forma simples e organizada.

O cliente cria uma conta, acessa sua ficha de treino, registra séries, repetições e peso de cada exercício durante a sessão — com cronômetro integrado — e depois pode ver o histórico completo de tudo que já treinou. O app ainda exibe vídeos demonstrativos dos exercícios para garantir a execução correta.

O projeto foi construído com arquitetura fullstack moderna: frontend em Next.js, API REST em Node.js/Express, banco PostgreSQL em nuvem e deploy completo em produção.

> **Em desenvolvimento:** versão mobile em React Native consumindo a mesma API.

---

## ✅ Funcionalidades

### Autenticação
- Cadastro de conta com e-mail e senha
- Login com sessão persistente

### Tela de treino ativo
- Cronômetro com iniciar, pausar e retomar
- Registro de séries, repetições e carga (kg) por exercício
- Vídeo demonstrativo da execução correta de cada exercício

### Dashboard
- Resumo geral dos treinos realizados
- Volume de treino (séries e carga total)
- Progresso ao longo do tempo

### Histórico
- Lista de todos os treinos realizados
- Detalhamento de cada sessão (exercícios, séries, cargas)
- Compartilhamento do treino realizado

---

## 🛠️ Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL via [Neon](https://neon.tech/) |
| Deploy | [Render](https://render.com/) (frontend + backend) |
| Linguagens | TypeScript 77% · JavaScript 21% |

---

## 🗂️ Estrutura do projeto

```
treino-app/
├── src/                  # Frontend Next.js
│   ├── app/              # Rotas e páginas (App Router)
│   └── components/       # Componentes reutilizáveis
├── backend/              # API Node.js + Express
│   ├── routes/           # Endpoints REST
│   └── db/               # Conexão com PostgreSQL
└── public/               # Assets estáticos
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
| Deploy no Render | CI/CD automático via push no GitHub |

---

## 📱 Versão mobile

A versão mobile do TreinoApp está sendo desenvolvida em **React Native**, consumindo a mesma API REST deste repositório — sem duplicação de lógica de negócio.

> Repositório mobile: em breve

---

## 👨‍💻 Autor

**Jonhny Willian**  
Desenvolvedor Fullstack — Next.js · Node.js · React Native · PostgreSQL

https://linkedin.com/in/jonhny-willian
