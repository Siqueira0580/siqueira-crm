# 🏢 Siqueira CRM — Sistema de Gestão Imobiliária

Sistema completo de CRM imobiliário com captação de leads, gestão de clientes, imóveis, visitas, matching inteligente e pipeline de vendas.

---

## 🚀 Setup em 5 passos

### 1. Criar projeto no Supabase
Acesse [app.supabase.com](https://app.supabase.com) → New project → escolha nome e senha.

### 2. Configurar banco de dados
No Supabase → **SQL Editor** → cole e execute o conteúdo de `supabase/schema.sql`.

### 3. Configurar variáveis de ambiente
```bash
cp .env.local.example .env.local
```
Preencha com os dados do seu projeto (Supabase → Settings → API):
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4. Instalar dependências e rodar
```bash
npm install
npm run dev
```

### 5. Acessar
Abra [http://localhost:3000](http://localhost:3000) e crie sua conta.

---

## 📦 Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilo | Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (fotos) |
| Gráficos | Recharts |
| Ícones | Lucide React |

---

## 📋 Módulos

| Módulo | Rota |
|--------|------|
| Dashboard | `/dashboard` |
| Clientes (CRM) | `/clientes` |
| Detalhe do cliente | `/clientes/[id]` |
| Imóveis | `/imoveis` |
| Detalhe do imóvel | `/imoveis/[id]` |
| Visitas | `/visitas` |
| Pipeline Kanban | `/pipeline` |

---

## 🧠 Inteligência Automática

O sistema classifica automaticamente cada cliente:

- **Classe econômica**: calculada pela renda mensal
  - Até R$ 3.000 → Classe C/D
  - R$ 3.000–R$ 12.000 → Classe B/C
  - Acima de R$ 12.000 → Classe A/B

- **Perfil do comprador**: baseado no objetivo + classe
  - `investidor` → objetivo = investir
  - `primeira_compra` → morar + classe baixa/média
  - `upgrade` → morar + classe alta
  - `locacao_futura` → objetivo = alugar

- **Score de potencial**: 0–100%, calculado pela completude dos dados

### Matching Cliente × Imóvel
| Critério | Pontuação |
|----------|-----------|
| Tipo de imóvel | 30 pts |
| Orçamento | 30 pts |
| Número de quartos | 20 pts |
| Zona/Região | 10 pts |
| Comodidades | 10 pts |

---

## 🗄️ Banco de Dados

Tabelas principais:
- `profiles` — dados do corretor (extends auth.users)
- `clientes` — cadastro completo de leads/clientes
- `imoveis` — cadastro de propriedades
- `fotos_imoveis` — galeria vinculada ao imóvel
- `visitas` — agendamentos
- `matching` — scores cliente × imóvel
- `notificacoes` — alertas do sistema

Row Level Security ativo — cada corretor acessa apenas seus dados.

---

## 📁 Estrutura do Projeto

```
siqueira-crm/
├── supabase/schema.sql       # SQL para criar o banco
├── src/
│   ├── app/                  # Páginas (App Router)
│   ├── components/           # Componentes reutilizáveis
│   ├── lib/
│   │   ├── supabase.ts       # Client Supabase
│   │   ├── matching.ts       # Engine de matching
│   │   ├── cep.ts            # API ViaCEP
│   │   └── utils.ts          # Helpers e formatadores
│   └── types/index.ts        # Tipos TypeScript
└── .env.local.example        # Template de variáveis
```
