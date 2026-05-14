# SGE Atlântida — Project Documentation

**Last updated:** April 29, 2026
**Status:** 🎉 100% COMPLETO! Todos os 5 Módulos implementados e funcionais

---

## 1. Project Overview

**What we are building:** A Sistema de Gestão Escolar (SGE) — Academic Management System — for Instituto Superior Politécnico Atlântida (ISP Atlântida), Angola. This is a final semester capstone project (TTP) for 4th year Computer Engineering students, serving as the evaluation for **ALL** second semester subjects.

**Official document reference:** Circular from Eng. Walter A. A. S. Neto, Director of the Organic Unit of Computer Engineering and Civil, dated 30/03/2026.

---

## 2. Mandatory Features (from official document)

1. **Full Student Self-Service Portal** — student handles enrollment, fees, certificates, transcripts online without going to the secretary
2. **Multicaixa Express Payment Integration** — Angola-specific payment system for monthly propinas (tuition fees)
3. **Credit-Based Academic Control** — students enroll per subject, year progression based on passing all subjects
4. **Security and Access Levels** — audit logging: who changed a grade, when, and from which IP

### Features REMOVED from scope (axed by department)

- AI retention prediction
- Blockchain diploma verification
- Micro-certifications and badges
- Skills portfolio / Dynamic CV

---

## 3. Tech Stack

### Current Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 15 + TypeScript | File-based routing, React components, one codebase |
| Styling | Tailwind CSS | Utility-first, no separate CSS files |
| Auth | NextAuth.js v4 | Handles JWT, sessions, role-based protection out of the box |
| Backend | Next.js API Routes | Same codebase as frontend, no separate server needed |
| ORM | Prisma 6 | Type-safe database queries, schema-first, auto migrations |
| Database | PostgreSQL | Robust, supports triggers, better than MySQL for audit logging |
| DB Driver | @prisma/adapter-pg | Required by Prisma 6 for direct PostgreSQL connection |
| Password | bcryptjs | Secure password hashing |
| PDF Generation | @react-pdf/renderer | React components for generating professional certificates |
| Runtime | Node.js v22 | Required for Next.js |

### What is NOT in this stack (and why)

- **No Python/FastAPI** — was needed for AI model, AI was removed from scope
- **No Redis** — NextAuth handles sessions natively, no cache layer needed
- **No blockchain** — removed from scope
- **No WSL required** — project runs on Windows native (WSL had network issues during setup)

---

## 4. Project Structure

```
sge-atlantida/
├── app/
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── estudantes/page.tsx               ← (✅ completo)
│   │   ├── orientadores/page.tsx             ← (✅ completo) ← com pesquisa e filtros
│   │   ├── recepcionistas/page.tsx           ← (✅ completo)
│   │   ├── admins/page.tsx                   ← (✅ completo)
│   │   ├── cursos/page.tsx                   ← (✅ completo)
│   │   ├── disciplinas/page.tsx              ← (✅ completo)
│   │   ├── departamentos/page.tsx           ← (✅ completo)
│   │   ├── pagamentos/page.tsx              ← (✅ completo)
│   │   └── audit/page.tsx                   ← (✅ completo)
│   ├── estudante/
│   │   ├── page.tsx
│   │   ├── EstudanteDashboard.tsx            ← visão geral (✅ completo)
│   │   ├── notas/
│   │   │   ├── page.tsx                      ← (✅ completo)
│   │   │   └── NotasDashboard.tsx            ← (✅ completo)
│   │   ├── pagamentos/
│   │   │   ├── page.tsx                      ← (✅ completo)
│   │   │   └── PagamentosDashboard.tsx       ← (✅ completo)
│   │   ├── monografia/
│   │   │   ├── page.tsx                      ← (✅ completo)
│   │   │   └── MonografiaDashboard.tsx       ← (✅ completo)
│   │   └── certificados/
│   │       ├── page.tsx                      ← (✅ completo)
│   │       └── CertificadosDashboard.tsx     ← (✅ completo)
│   ├── orientador/
│   │   ├── page.tsx                          ← (✅ completo)
│   │   ├── OrientadorDashboard.tsx           ← (✅ completo)
│   │   ├── solicitacoes/
│   │   │   └── page.tsx                      ← (🔧 a construir — Module 3)
│   │   └── monografias/
│   │       └── page.tsx                      ← (🔧 a construir — Module 3)
│   ├── recepcionista/
│   │   ├── page.tsx                          ← (🔧 a construir)
│   │   └── estudante/
│   │       └── [id]/page.tsx                 ← (🔧 a construir)
│   ├── gestor/
│   │   ├── page.tsx                          ← (✅ completo)
│   │   ├── GestorDashboard.tsx               ← (✅ completo)
│   │   ├── estudantes/
│   │   │   ├── page.tsx                      ← (✅ completo)
│   │   │   └── EstudantesDashboard.tsx       ← (✅ completo)
│   │   ├── disciplinas/
│   │   │   ├── page.tsx                      ← (✅ completo)
│   │   │   └── DisciplinasDashboard.tsx      ← (✅ completo)
│   │   └── monografias/
│   │       └── page.tsx                      ← (🔧 a construir — Module 3)
│   ├── login/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx                          ← role-based redirect hub
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts
│   │   ├── estudante/
│   │   │   ├── perfil/route.ts               ← (✅ completo)
│   │   │   ├── disciplinas/route.ts          ← (✅ completo)
│   │   │   ├── notas/route.ts                ← (✅ completo)
│   │   │   ├── monografia/
│   │   │   │   ├── route.ts                  ← (✅ completo)
│   │   │   │   └── upload/route.ts           ← (✅ completo)
│   │   │   ├── premonografia/route.ts        ← (✅ completo)
│   │   │   ├── certificados/
│   │   │   │   ├── route.ts                  ← (✅ completo)
│   │   │   │   └── pedir/route.ts            ← (✅ completo)
│   │   │   └── pagamentos/
│   │   │       ├── route.ts                  ← (✅ completo)
│   │   │       └── confirmar/route.ts        ← (✅ completo)
│   │   ├── notas/
│   │   │   └── route.ts                      ← (✅ completo — Module 2)
│   │   ├── orientador/
│   │   │   ├── disciplinas/
│   │   │   │   ├── route.ts                  ← (✅ completo — Module 2)
│   │   │   │   └── [id]/estudantes/
│   │   │   │       └── route.ts              ← (✅ completo — Module 2)
│   │   │   ├── solicitacoes/route.ts         ← (✅ completo — Module 3)
│   │   │   ├── solicitacoes/[id]/route.ts   ← (✅ completo — Module 3)
│   │   │   ├── monografias/route.ts          ← (✅ completo — Module 3)
│   │   │   ├── monografias/[id]/route.ts    ← (✅ completo — Module 3)
│   │   │   ├── download/route.ts             ← (✅ completo — Module 3)
│   │   │   └── premonografia/[id]/route.ts  ← (✅ completo — Module 3)
│   │   ├── gestor/
│   │   │   ├── estudantes/route.ts           ← (✅ completo — Module 2)
│   │   │   ├── disciplinas/route.ts          ← (✅ completo — Module 2)
│   │   │   ├── disciplinas/[id]/estudantes/
│   │   │   │   └── route.ts                  ← (✅ completo — Module 2)
│   │   │   ├── disciplinas/[id]/professores/
│   │   │   │   └── route.ts                  ← (✅ completo — Module 2)
│   │   │   ├── orientadores/route.ts         ← (✅ completo — Module 2)
│   │   │   ├── orientadores/lista/route.ts    ← (✅ completo — Module 2)
│   │   │   └── monografias/route.ts          ← (✅ completo — Module 3)
│   │   │   └── monografias/[id]/route.ts    ← (✅ completo — Module 3)
│   │   ├── recepcionista/
│   │   │   ├── estudante/route.ts            ← (✅ completo — Module 4)
│   │   │   ├── estudante/[id]/route.ts        ← (✅ completo — Module 4)
│   │   │   ├── emitir/route.ts               ← (✅ completo — Module 4)
│   │   │   ├── auditar/impressao/route.ts    ← (✅ limite 2x documento)
│   │   │   ├── auditar/contagem/route.ts     ← (✅ contador de impressões)
│   │   │   └── factura/entregar/route.ts     ← (✅ marcar factura entregue)
│   │   ├── admin/
│   │   │   ├── estudantes/route.ts           ← (✅ completo — Module 5)
│   │   │   ├── orientadores/route.ts         ← (✅ completo — Module 5) ← com pesquisa, filtros e gestão de gestores
│   │   │   ├── cursos/route.ts                ← (✅ completo — Module 5)
│   │   │   ├── departamentos/route.ts         ← (✅ completo — Module 5)
│   │   │   ├── disciplinas/route.ts          ← (✅ completo — Module 5)
│   │   │   ├── pagamentos/route.ts           ← (✅ completo — Module 5)
│   │   │   ├── stats/route.ts                ← (✅ completo — Module 5)
│   │   │   ├── recepcionistas/route.ts       ← (✅ completo — Module 5)
│   │   │   ├── recepcionistas/[id]/route.ts  ← (✅ completo — Module 5)
│   │   │   ├── admins/route.ts               ← (✅ completo — Module 5)
│   │   │   ├── admins/[id]/route.ts          ← (✅ completo — Module 5)
│   │   │   ├── config/taxas/route.ts         ← (✅ completo — Module 5)
│   │   │   └── gerar-propinas/route.ts       ← (✅ completo — Module 5)
│   │   └── audit/
│   │       └── route.ts                      ← (✅ completo — Module 2)
│   ├── components/
│   │   ├── DashboardLayout.tsx
│   │   ├── DatePickerPT.tsx
│   │   └── SessionProvider.tsx
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   ├── audit.ts                              ← (✅ completo — Module 2)
│   └── notas.ts                              ← (✅ completo — Module 2)
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── prisma.config.ts
├── middleware.ts
├── .env
└── package.json
```

---

## 5. Environment Variables (.env)

```env
# Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sge_atlantida?schema=public"

# Authentication
NEXTAUTH_SECRET="sge-atlantida-secret-key-2026"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 6. Key Configuration Files

### prisma/prisma.config.ts

```ts
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
```

### lib/prisma.ts

```ts
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

### middleware.ts

```ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (path.startsWith("/admin") && token?.role !== "admin")
      return NextResponse.redirect(new URL("/login", req.url))
    if (path.startsWith("/estudante") && token?.role !== "estudante")
      return NextResponse.redirect(new URL("/login", req.url))
    if (path.startsWith("/orientador") && token?.role !== "orientador")
      return NextResponse.redirect(new URL("/login", req.url))
    if (path.startsWith("/recepcionista") && token?.role !== "recepcionista")
      return NextResponse.redirect(new URL("/login", req.url))
    // Gestor (orientador com e_gestor=true) ou admin podem acessar /gestor
    const isGestor = token?.role === "orientador" && token?.e_gestor === true
    const isAdmin = token?.role === "admin"
    if (path.startsWith("/gestor") && !isGestor && !isAdmin)
      return NextResponse.redirect(new URL("/login", req.url))
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/estudante/:path*",
    "/orientador/:path*",
    "/recepcionista/:path*",
    "/gestor/:path*",
    "/dashboard/:path*",
  ],
}
```

---

## 7. Database Schema (26 tables)

### Enums

| Enum | Values |
|---|---|
| TipoUsuario | admin \| estudante \| orientador \| recepcionista |
| EstadoEstudante | EmCurso \| Finalizado \| Desistente |
| EstadoMonografia | Submetida \| EmRevisao \| Aprovada \| ParaDefender \| Defendida \| Rejeitada |
| EstadoPremonografia | Proposto \| Aprovado \| Reprovado \| Cancelado |
| EstadoSolicitacao | Pendente \| Aceite \| Recusado \| Cancelado |
| EstadoFactura | Pendente \| Pago \| Atrasado |
| EstadoNotaCobranca | Pendente \| Pago \| Negociado |
| FormaPagemento | Multicaixa \| Transferencia \| Dinheiro |
| TipoCertificado | Conclusao \| Disciplina \| Participacao |
| TurnoRecepcionista | Manha \| Tarde \| Noite |
| Semestre | S1 \| S2 |
| TipoAvaliacao | Normal \| Recurso \| Especial |

### Core Tables

- `Usuario` → base user, all roles share this
- `Estudante` → belongs to `Curso` → belongs to `Departamento`
- `Disciplina` → belongs to `Departamento`, has `tem_dispensa` + `nota_dispensa`
- `ProfessorDisciplina` → Usuario (orientador) + Disciplina + ano_lectivo ← **necessário para Module 2**
- `Nota` → Estudante + Disciplina (full grade breakdown per subject)
- `Monografia` → Estudante
- `MonografiasParaCorrecao` → Monografia + Orientador
- `Premonografia` → Estudante
- `SolicitacaoOrientacao` → Estudante + Orientador
- `Factura` → Estudante
- `PagamentoPropina` → Estudante
- `NotaCobranca` → Estudante
- `Precos` → Curso
- `PrecosPropina` → Curso
- `HorarioAula` → Curso + Disciplina (horário semanal por turma, com turno, dia, hora, sala)
- `PlanoProva` → Curso + Disciplina (calendário de provas por turma)
- `Certificado` → Estudante
- `CertificadoDisciplinas` → Certificado + Disciplina
  - `CurriculoAcademico` → Estudante
  - `EstatisticasMonografiasDepartamento` → Departamento
  - `HorarioAula` → Curso + Disciplina (horário semanal com feriado turno, dia, hora, sala)
  - `PlanoProva` → Curso + Disciplina (calendário de provas: PP1, PP2, Exame, Recurso, Exame_Especial)
  - `AuditLog` → Usuario

### Nota Model (full structure)

```prisma
model Nota {
  id_nota          Int           @id @default(autoincrement())
  id_estudante     Int
  id_disciplina    Int
  ano_lectivo      String        @db.VarChar(9)
  semestre         Semestre      @default(S1)

  // Avaliação Contínua
  ac1              Decimal?      @db.Decimal(4, 2)
  ac2              Decimal?      @db.Decimal(4, 2)
  ac3              Decimal?      @db.Decimal(4, 2)
  ttp              Decimal?      @db.Decimal(4, 2)
  pp1              Decimal?      @db.Decimal(4, 2)
  pp2              Decimal?      @db.Decimal(4, 2)

  // Exames
  exame            Decimal?      @db.Decimal(4, 2)
  recurso          Decimal?      @db.Decimal(4, 2)       // nota seca, máx 12
  exame_especial   Decimal?      @db.Decimal(4, 2)       // nota seca, máx 12

  // Resultado
  nota_final       Decimal?      @db.Decimal(4, 2)       // calculado e guardado
  dispensada       Boolean       @default(false)
  tipo_avaliacao   TipoAvaliacao @default(Normal)
}
```

### ProfessorDisciplina Model (adicionar antes do Module 2)

```prisma
model ProfessorDisciplina {
  id               Int        @id @default(autoincrement())
  id_usuario       Int
  id_disciplina    Int
  ano_lectivo      String     @db.VarChar(9)

  usuario          Usuario    @relation(fields: [id_usuario], references: [id_usuario])
  disciplina       Disciplina @relation(fields: [id_disciplina], references: [id_disciplina])

  @@unique([id_usuario, id_disciplina, ano_lectivo])
}
```

> Depois de adicionar: `npx prisma db push` → `npx prisma generate` → actualizar seed.

### Disciplina — campos de dispensa

```prisma
tem_dispensa   Boolean  @default(true)   // se false → vai sempre a exame
nota_dispensa  Int      @default(14)     // threshold de dispensa
```

### Grade Calculation Logic

```
nota_ac          = ((AC1 + AC2 + AC3) / 3 + TTP) / 2
nota_final_ac    = (nota_ac + (PP1 + PP2) / 2) / 2

Se tem_dispensa && nota_final_ac >= nota_dispensa
  → dispensada, nota_final = nota_final_ac

Se !dispensada && exame lançado
  → nota_final = nota_final_ac × 40% + exame × 60%

Se recurso lançado
  → nota_final = recurso  (nota seca, máx 12)

Se exame_especial lançado
  → nota_final = exame_especial  (nota seca, máx 12)
```

> `nota_final` é sempre calculada e guardada ao lançar notas — **nunca calculada em runtime na API.**

### Edge cases do cálculo (tratar no Module 2)

- AC incompleto (ex: só AC1 e AC2 lançados, AC3 null) → não calcular `nota_final`, manter `null`
- `tem_dispensa = false` → ignorar threshold, ir sempre a exame independentemente da nota AC
- Recurso lançado sem exame prévio → bloquear na API (validação obrigatória)
- `exame_especial` lançado → substitui tudo, não combina com nada

---

## 8. Payment System Logic ✅ ACTUALIZADO

### ✅ Sistema de Preços Hierárquico (Implementado 13/04/2026)

✅ **Novo sistema implementado que permite preços diferentes por cada curso:**

| Item | Escopo |
|---|---|
| ✅ Propina Mensal | 🟠 **ESPECIFICO POR CURSO e ANO** |
| ✅ Multa de Atraso | 🟠 **ESPECIFICO POR CURSO e ANO** |
| ✅ Taxa Monografia | 🔵 GLOBAL IGUAL PARA TODOS |
| ✅ Folhas de Prova | 🔵 GLOBAL IGUAL PARA TODOS |

✅ **Lógica de busca**:
1.  Sistema procura PRIMEIRO por preço definido especificamente para aquele curso e ano
2.  Se não encontrar valor definido, usa automaticamente o valor padrão global
3.  Sem que nenhum código tenha que saber de onde vem o valor

✅ **Como usar no sistema**:
```typescript
import { getPrecoEstudante } from "@/lib/precos"

const { valor_propina, valor_multa, origem } = await getPrecoEstudante(id_estudante)
```
`origem` retorna `"curso"` se for valor customizado ou `"global"` se for valor padrão.

### ✅ Valores Padrão Globais (Fallback)

| Year | Monthly fee | Late fee |
|---|---|---|
| 1st year | 15,000 Kz | 500 Kz |
| 2nd year | 20,000 Kz | 500 Kz |
| 3rd year | 25,000 Kz | 500 Kz |
| 4th year | 30,000 Kz | 500 Kz |
| 5th year | 35,000 Kz | 500 Kz |
| 6th year | 40,000 Kz | 500 Kz |

✅ **Estes valores podem ser alterados pelo Admin a qualquer momento no dashboard.**
✅ **Suporta cursos de até 6 anos** (ex: Medicina, Arquitectura).

### Monthly Propina Flow

1. 1st of month → system generates payment record for every active student
2. Valor da propina é obtido automaticamente via `getPrecoEstudante()` com o valor correcto do curso
3. Student logs in → sees current month reference code and amount
4. If today > 10th and unpaid → late fee definido no curso adicionado automaticamente
5. Student takes reference to Multicaixa Express and pays
6. Student enters 3-digit confirmation code → system validates → flips to `Pago`

### Reference Format

```
PROP-{YEAR}-{MONTH}-{STUDENT_INITIALS}-{3_DIGIT_CODE}
Example: PROP2026-04-BEN-847
```

### Propina Pricing per Year (Fallback)

| Year | Monthly fee | Late fee |
|---|---|---|
| 1st year | 15,000 Kz | 500 Kz |
| 2nd year | 20,000 Kz | 500 Kz |
| 3rd year | 25,000 Kz | 500 Kz |
| 4th year | 30,000 Kz | 500 Kz |
| 5th year | 35,000 Kz | 500 Kz |
| 6th year | 40,000 Kz | 500 Kz |

### Duplicate Payment Protection

Before confirming a payment, the API checks if a `Pago` record already exists for the same `mes + ano + id_estudante`. If so, returns `400` error.

### Payment confirmation security

The confirmation endpoint uses `id_estudante` from the session, not from the request body. A correct 3-digit code only works for the student currently authenticated — never for another student's payment.

### What gets BLOCKED when payment is Pendente

- Cannot request an orientador
- Cannot download certificates
- Cannot submit monografia
- Cannot see grades for current year (notas do ano corrente bloqueadas)

### What stays ACCESSIBLE when Pendente

- Login, profile, payment reference
- Grades from all previous years

### Receptionist handles ONLY

- Caderneta payments, monografia fee, physical certificate pickup confirmation

### Document Printing Limit (Implementado 24/04/2026)

Por motivos de segurança e controlo audit:
- **Documentos** (certificado de conclusão / declaração académica): **máximo 2 impressões por factura**
- **Faturas**: sem limite de impressões
- **Propinas**: sem limite de impressões
- Cada impressão é registada no `AuditLog` com `acao = "IMPRESSAO_DOCUMENTO"` ou `acao = "IMPRESSAO_FATURA"`
- O bloqueio é feito no servidor — mesmo que o frontend seja burlado, a API retorna 403 após 2 impressões

---

## 9. Business Logic Rules

### Year Progression

Student advances only when **ALL** subjects of current year have `nota_final >= 10`. Admin confirms year advancement → logged to `AuditLog`.

### Grade System

- **Scale:** 0–20 · **Passing:** 10+
- **Dispensa:** if `tem_dispensa = true` and `nota_final_ac >= nota_dispensa (14)` → dispensed from exam
- **Exam chain:** AC → *(if < 10 or no dispensa)* → Exame → *(if < 10)* → Recurso → *(if < 10)* → Exame Especial
- **Recurso / Exame Especial:** nota seca (raw score), maximum 12, replaces `nota_final` directly — does not combine with AC
- Every grade change writes to `AuditLog`: teacher ID, old value, new value, timestamp, IP

### Grade Access Control

- **Orientador** → só lança/edita notas das disciplinas em `ProfessorDisciplina` com o seu `id_usuario` e o ano lectivo corrente
- **Gestor** → lança/edita notas de qualquer disciplina do seu departamento
- Nenhum dos dois pode editar notas de anos lectivos anteriores (validar na API)

### Average Calculation

- **Média por ano:** simple average of all subjects with `nota_final` — dispensadas count with `nota_final_ac`, em curso count with nota parcial (soma dos 6 campos AC / 6, null = 0)
- **Média geral:** average of the yearly averages (only years with a calculated média)

### Monografia Workflow

```
Submetida → EmRevisao → Aprovada → ParaDefender → Defendida
                    ↓
                  Rejeitada
```

#### Dashboard do Gestor
O gestor tem acesso a 3 abas organizadas por função:

**📝 Pré-Projetos**
- Mostra pré-projetos dos estudantes tutelados pelo gestor
- Estados: Proposto, Aprovado, Reprovado, Cancelado
- **Ação**: Visualização apenas

**📄 Monografias**
- Mostra monografias `EmRevisao` dos estudantes tutelados
- **Ações**:
  - ✅ Aprovar monografia
  - ❌ Rejeitar monografia

**🎯 Avaliação Final**
- Mostra monografias `Aprovadas`, `ParaDefender` e `Defendidas`
- **Ações**:
  - 📅 Agendar defesa (monografias Aprovadas)
  - 🎯 Atribuir nota final (monografias ParaDefender)

#### API Endpoints
- `GET /api/gestor/monografias` - Lista monografias e pré-projetos do gestor
- `PATCH /api/gestor/monografias/[id]` - Atualiza estado da monografia
  - Transições permitidas: Submetida→EmRevisao, EmRevisao→Aprovada/Rejeitada, Aprovada→ParaDefender, ParaDefender→Defendida

### Monografia Access Rules

- Estudante só pode submeter se: `ano_current = 4` + orientação `Aceite` + propina `Pago`
- Orientador só revê monografias dos seus estudantes (`MonografiasParaCorrecao`)
- Gestor agenda defesa e atribui nota final de qualquer monografia do departamento

### Monografia — Co-autores e Co-orientadores

#### Campos adicionados ao modelo Monografia

| Campo | Tipo | Descrição |
|---|---|---|
| `id_orientador` | Int? | FK para orientador principal (preenchido automaticamente da orientação aceite) |
| `id_co_orientador` | Int? | FK opcional para co-orientador interno (da faculdade) |
| `nome_co_orientador` | String? | Nome do co-orientador externo (texto livre — pode ser pessoa fora da faculdade) |
| `nome_co_autor` | String? | Nome do co-autor externo (texto livre — pode ser pessoa fora da faculdade) |

#### Regras de negócio

- **Pré-projecto:** orientador NÃO é obrigatório (estudante pode submeter sem orientação)
- **Monografia:** orientador É obrigatório (só submete se tiver orientação aceite)
- **Co-orientador e Co-autor:** campos opcionais, texto livre (pessoas dentro ou fora da faculdade)
- **Download:** orientador e gestor podem clicar na monografia para baixar o PDF

#### Relações no schema

```prisma
model Monografia {
  id_orientador        Int?
  id_co_orientador     Int?
  nome_co_orientador   String?  @db.VarChar(100)
  nome_co_autor        String?  @db.VarChar(100)
  orientador           Orientador? @relation("OrientadorMonografia", fields: [id_orientador], references: [id_orientador])
  co_orientador        Orientador? @relation("CoOrientadorMonografia", fields: [id_co_orientador], references: [id_orientador])
}

model Orientador {
  monografias_orientador    Monografia[] @relation("OrientadorMonografia")
  monografias_co_orientador Monografia[] @relation("CoOrientadorMonografia")
}
```

### Armazenamento de Arquivos (Local Filesystem)

#### Como funciona

Os ficheiros PDF das monografias são guardados no **filesystem local** (sem MinIO, sem Docker, sem serviços externos):

```
uploads/
└── monografias/
    └── {student_id}/
        └── {timestamp}_{filename}.pdf
```

Exemplo: `uploads/monografias/2/1712345678_monografia.pdf`

#### Porquê filesystem local?

- ✅ Zero overhead de RAM (ideal para PCs fracos)
- ✅ Zero configuração extra (sem Docker, sem MinIO)
- ✅ Funciona perfeitamente para desenvolvimento local
- ✅ Pode migrar para MinIO depois se necessário

#### APIs de upload/download

- `POST /api/estudante/monografia/upload` — valida e salva PDF no filesystem
- `GET /api/estudante/monografia/download` — lê arquivo do filesystem e retorna como download
- `GET /api/orientador/download` — endpoint para orientadores baixarem monografias e pré-projectos dos seus estudantes

### Download API (`/api/orientador/download`)
**Usage:** `GET /api/orientador/download?path={student_id}/{filename}&nome={filename}&tipo={monografia|premonografia}`

**Parameters:**
- `path` (required): Caminho relativo do arquivo (ex: `5/1775650955902_Solo.pdf`)
- `nome` (required): Nome do arquivo para download (ex: `Solo.pdf`)
- `tipo` (optional): Tipo de arquivo - `monografia` (padrão) ou `premonografia`

**Response:**
- **200:** Arquivo PDF para download
- **400:** Parâmetros inválidos
- **401:** Não autorizado
- **403:** Acesso negado ou permissão insuficiente
- **404:** Ficheiro não encontrado

**Exemplos:**
- Monografia: `/api/orientador/download?path=5/1775650955902_Solo.pdf&nome=Solo.pdf&tipo=monografia`
- Premonografia: `/api/orientador/download?path=5/1775628903485_Curr_culo_Vitae.pdf&nome=Curr_culo_Vitae.pdf&tipo=premonografia`

**Segurança:**
- Apenas usuários com role `orientador` podem acessar
- O caminho do arquivo é validado para garantir que permanece dentro do diretório `uploads/{tipo}/`
- Arquivos são armazenados em `uploads/monografias/{student_id}/` ou `uploads/premonografias/{student_id}/`
- Validações: PDF apenas, máx 10MB, só 4º ano, orientação aceite, propina paga

---

## 10. Test Credentials (after running seed)

| Role | Email | Password | Contexto |
|---|---|---|---|
| Admin | admin@ispatlantida.ao | admin123 | — |
| Student (2º ano) | estudante@ispatlantida.ao | student123 | Ben — notas e pagamentos |
| Student (4º ano) | ana@ispatlantida.ao | student4ano123 | Ana Silva — monografia e certificados |
| Student (4º ano) | carlos@ispatlantida.ao | student4ano123 | Carlos Manuel — monografia (orientador: Prof. João) |
| Orientador | orientador@ispatlantida.ao | orientador123 | Disciplinas do 2º ano (BD1, RC1, SO1) |
| Orientador (Gestor) | orientador@ispatlantida.ao | orientador123 | Prof. Walter Neto — com funções de gestor (e_gestor=true) |
| Orientador 2 (NOT gestor) | orientador2@ispatlantida.ao | orientador123 | Prof. João Mendes — sem funções de gestor (e_gestor=false) |
| Receptionist | recepcao@ispatlantida.ao | recepcao123 | — |

> Payment confirmation code: visible in terminal after seed (`Código de confirmação: XXX`) or via `npx prisma studio` → table `PagamentoPropina` → column `codigo_confirmacao`.

---

## 11. Seed Data (prisma/seed.ts)

Run with: `npx tsx prisma/seed.ts`

### Currently creates

- 1 department, 1 course (Engenharia Informática, 4 anos)
- 6 propina fallback prices (one per year, supports courses up to 6 years)
- 15 subjects across 4 years with `tem_dispensa` per subject (Matemáticas não dispensam)
- 1 admin, 1 orientador, 1 recepcionista
- Ben Minogashita (2º ano) — para testar notas e pagamentos
- Ana Silva (4º ano) — para testar monografia e certificados, com orientação aceite
- 1 current month payment (Pendente) for each student
- Grades for Ben: 1º ano completo, 2º ano S1 em curso

### To add before Module 2

```ts
// Atribuir disciplinas do 2º ano ao orientador
const disciplinas2Ano = [disciplinaBD1, disciplinaRC1, disciplinaSO1]

for (const disciplina of disciplinas2Ano) {
  await prisma.professorDisciplina.upsert({
    where: {
      id_usuario_id_disciplina_ano_lectivo: {
        id_usuario: orientador.id_usuario,
        id_disciplina: disciplina.id_disciplina,
        ano_lectivo: "2025/2026"
      }
    },
    update: {},
    create: {
      id_usuario: orientador.id_usuario,
      id_disciplina: disciplina.id_disciplina,
      ano_lectivo: "2025/2026"
    }
  })
}
```

> **Important:** seed uses `upsert` — safe to re-run without duplicating data.

---

## 12. Commands Reference

```bash
# Start development server
npm run dev

# After every schema change — always run both:
npx prisma db push
npx prisma generate

# Run seeder
npx tsx prisma/seed.ts

# Open Prisma Studio (visual database editor)
npx prisma studio

# Reset database completely and re-seed
npx prisma migrate reset
npx prisma db push
npx tsx prisma/seed.ts
```

---

## 13. Module Build Plan

### Module 1 — Student Portal ✅ COMPLETO

#### Visão Geral (/estudante)
- [x] Perfil: nome, curso, ano actual, estado da propina
- [x] Seletor de ano/semestre com disciplinas da BD
- [x] Banner de propina pendente com referência e valor
- [x] API `GET /api/estudante/perfil`
- [x] API `GET /api/estudante/disciplinas?ano=&semestre=`

#### Notas (/estudante/notas)
- [x] Tabela agrupada por Ano → Semestre
- [x] Badge: Aprovado / Reprovado / Dispensado / Em Curso (com fase — Recurso, Especial)
- [x] Nota parcial a amarelo para disciplinas em curso
- [x] Painel expandido: componentes AC + cadeia de exames com setas
- [x] Nota seca identificada para recurso e especial
- [x] Média por ano (dispensadas com nota AC, em curso com nota parcial)
- [x] Média geral (média das médias por ano)
- [x] Notas do ano corrente bloqueadas se propina pendente
- [x] API `GET /api/estudante/notas`

#### Pagamentos (/estudante/pagamentos)
- [x] Resumo: total em dívida, pagamentos pendentes, pagamentos efectuados
- [x] Histórico completo ordenado do mais recente para o mais antigo
- [x] Estado: Pendente (laranja) / Atrasado (vermelho) / Pago (verde)
- [x] Valor base + multa separados por linha
- [x] Referência Multicaixa por linha
- [x] Campo de código de 3 dígitos para confirmar pagamento
- [x] `id_estudante` vem da sessão — nunca do request body
- [x] Protecção contra pagamento duplicado (mesmo mês/ano)
- [x] API `GET /api/estudante/pagamentos`
- [x] API `POST /api/estudante/pagamentos/confirmar`

#### Monografia (/estudante/monografia)
- [x] CTA para submeter (só 4º ano + orientação aceite + propina paga)
- [x] Estado actual, feedback do orientador, nota final
- [x] Pré-projecto: submeter tema, ver estado (Proposto / Aprovado / Reprovado)
- [x] Upload de ficheiro PDF (máx. 10MB)
- [x] API `GET /api/estudante/monografia`
- [x] API `POST /api/estudante/monografia/upload`
- [x] API `POST /api/estudante/premonografia`

#### Certificados (/estudante/certificados)
- [x] Lista de certificados emitidos com tipo e data
- [x] Botão pedir certificado (bloqueado se pagamento Pendente)
- [x] Download PDF com @react-pdf/renderer
- [x] Certificado de Disciplinas (notas dos anos terminados)
- [x] Certificado de Conclusão (só 4º ano)
- [x] API `GET /api/estudante/certificados`
- [x] API `POST /api/estudante/certificados/pedir`

---

### Module 2 — Grade Management ✅ COMPLETO
 
> **Concluído:**
> 1. ✅ Modelo `ProfessorDisciplina` adicionado ao schema
> 2. ✅ `npx prisma db push` → `npx prisma generate`
> 3. ✅ Seed atualizado com disciplinas atribuídas ao orientador (BD1, RC1, SO1)
> 4. ✅ `lib/audit.ts` e `lib/notas.ts` criados
> 5. ✅ `lib/verificarConflitos.ts` — sistema de deteção de conflitos de professor
 
#### 🆕 Conflitos de Professor (Implementado 28/04/2026)
 
✅ **Novas regras de negócio implementadas:**
- **Professor não pode dar duas aulas ao mesmo tempo** — mesmo que sejam disciplinas diferentes ou em cursos diferentes
- **Exame/Recurso/Exame_Especial NÃO são verificados** — estes são vigiados por outros professores (proctors)
- **Apenas PP1 e PP2** são verificados para conflitos de professor
 
✅ **Arquivo `lib/verificarConflitos.ts`** — funções reutilizáveis:
- `verificarConflitoProfessorHorario()` — verifica se professor já tem aula no mesmo dia/horário
- `verificarConflitoProfessorProva()` — verifica se professor já tem prova PP1/PP2 no mesmo dia/horário
 
✅ **Lógica de deteção cross-curso:**
1. Busca TODOS os professores da disciplina em questão
2. Busca TODAS as disciplinas que esses professores lecionam (no ano lectivo)
3. Procura aulas/provas dessas disciplinas no mesmo dia + turno + horário sobreposto
4. **Exclui APENAS** a mesma disciplina + curso + ano + semestre (duplicado já verificado à parte)
5. Se encontrar conflito, retorna mensagem com nome do professor, disciplina e curso
 
✅ **Correção 28/04/2026 — NOT clause fix:**
- Antes: `NOT: { id_curso, ano_curricular, semestre }` — excluía TODAS as entradas do curso/ano/semestre, mesmo de outras disciplinas
- Depois: `NOT: { id_disciplina, id_curso, ano_curricular, semestre }` — exclui apenas a mesma disciplina no mesmo curso
- Agora funciona: professor com Matemática E Física no mesmo curso/horário é detetado ✅
 
✅ **Mensagens de erro amigáveis:**
- *"Professor João Mendes já tem aula de Física (FIS101) em Engenharia no Segunda das 08:00–09:30 no turno Matinal."*
- *"Professor João Mendes já tem PP1 de Matemática (MAT101) em Informática em 15/05/2026 das 08:00–09:30 no turno Matinal."*
 
#### Orientador (professor de disciplina)
Filtra sempre por `ProfessorDisciplina` onde `id_usuario = session.user.id` e `ano_lectivo = corrente`.

- [x] `/orientador` — dashboard: lista das suas disciplinas com contagem de estudantes
- [x] API `GET /api/orientador/disciplinas` — disciplinas atribuídas ao orientador autenticado
- [x] API `GET /api/orientador/disciplinas/[id]/estudantes` — estudantes com notas actuais
- [x] API `POST /api/notas` — criar/actualizar nota com cálculo automático + audit log

#### Gestor (Orientador com e_gestor=true)
Filtra por departamento — acede a tudo dentro do seu departamento.

- [x] `/gestor` — dashboard: visão geral do departamento (total estudantes, notas pendentes)
- [x] `/gestor/estudantes` — lista de todos os estudantes do departamento com notas
- [x] `/gestor/disciplinas` — lista de disciplinas com filtro por ano/semestre (vindo do currículo)
- [x] Ao clicar numa disciplina → tabela de estudantes com todas as notas + edição inline
- [x] API `GET /api/gestor/estudantes` — todos os estudantes do departamento com notas
- [x] API `GET /api/gestor/disciplinas` — **todas as disciplinas do departamento via currículo** (busca por `CursoDisciplina` dos cursos do departamento, não apenas as que o gestor lecciona)
- [x] API `GET /api/gestor/disciplinas/[id]/estudantes` — estudantes e notas de uma disciplina com nome do professor
- [x] Campo `orientador` na resposta da API — nome do professor responsável pela disciplina (via `ProfessorDisciplina`)
- [x] **Correção 27/04/2026**: O `ano_curricular` e `semestre` agora vêm do currículo (`CursoDisciplina`), não dos campos fixos da tabela `Disciplina`
- [x] **Correção 27/04/2026**: Cada disciplina mostra badges com as suas colocações nos cursos (ex: "Engenharia · 1º Ano · S1")
- [x] **Correção 27/04/2026**: Filtros dinâmicos baseados nos anos reais do currículo

> **Nota:** `gestor` não é mais um role separado. É um orientador com `e_gestor = true` no modelo Orientador.
>
> **Autorização:** Tanto o middleware quanto as APIs verificam `role === "orientador" && e_gestor === true` OU `role === "admin"` para acesso às rotas do gestor.
>
> **Next.js App Router:** `params` nas API routes é uma `Promise` — requer `await params` antes de aceder às propriedades (ex: `const resolvedParams = await params`).

#### Funcionalidades Comuns
- [x] `lib/notas.ts` — função `calcularNotaFinal(nota, disciplina)` reutilizável
- [x] `lib/audit.ts` — helper `logAudit({ id_usuario, acao, tabela, id_registro, valor_antes, valor_depois, ip_address })`
- [x] Validação: recurso e exame_especial máx 12
- [x] Validação: recurso só lançável se exame já existir
- [x] AuditLog em cada criação/edição de nota (quem, quando, IP, valor antes/depois)
- [x] AuditLog em cada operação do gestor com nomes legíveis (nome_disciplina, nome_curso, nome_professor)

#### 🆕 Gestão de Professores Responsáveis (Implementado 09/04/2026)

✅ **Sistema de permissões**:
- **1 Professor por Disciplina**: Cada disciplina só pode ter UM professor responsável. Quando adicionas um novo, o antigo é removido automaticamente.
- **Gestor**: Pode atribuir e mudar professores responsáveis de qualquer disciplina do departamento.
- **Professor Normal**: Só vê e só pode alterar notas das disciplinas que ele é responsável. Todas as outras são completamente invisíveis e bloqueadas.

✅ **Novas APIs**:
- `GET /api/gestor/orientadores/lista` → Lista todos os orientadores do sistema
- `GET /api/gestor/disciplinas/[id]/professores` → Lista professor responsável da disciplina
- `POST /api/gestor/disciplinas/[id]/professores` → Atribui um novo professor (apaga o antigo automaticamente)
- `DELETE /api/gestor/disciplinas/[id]/professores` → Remove professor da disciplina

✅ **Interface**:
- Botão amarelo `👨‍🏫 Gerir Professores` aparece no dashboard do gestor quando abres uma disciplina
- Modal completo para ver, adicionar e remover professores
- Lista auto actualiza instantaneamente após alterações

#### 🆕 Plano Escolar — Horário e Calendário de Provas (Implementado 25/04/2026, atualizado 26/04/2026)

✅ **Novos modelos no schema**:
- `HorarioAula` — horário semanal por curso/ano/semestre (agora com campo `turno`, dia, hora_inicio, hora_fim, sala)
- `PlanoProva` — calendário de provas por curso/ano/semestre (tipos: PP1, PP2, Exame, Recurso, Exame_Especial)
- `PeriodoProva` — período de provas por curso/ano/semestre/ano_lectivo (data_inicio, data_fim)
- `Curso.turnos` — string separada por vírgulas (ex: "Matinal,Vespertino,Noturno")
- `ConfiguracaoTaxas.duracao_aula_minutos` — duração padrão de cada aula (default: 90 min)
- `ConfiguracaoTaxas.intervalo_aula_minutos` — intervalo entre aulas (default: 10 min)

✅ **Constraint única do `HorarioAula`**:
- `@@unique([id_curso, ano_curricular, semestre, turno, dia_semana, hora_inicio, ano_lectivo])`
- Inclui `turno` para garantir que a mesma posição horária em turnos diferentes não dá conflito

✅ **Constraint única do PlanoProva**:
- `@@unique([id_curso, id_disciplina, ano_curricular, semestre, tipo_prova, turno, ano_lectivo])`
- Permite a mesma disciplina + mesmo tipo em turnos diferentes sem conflito

✅ **Turnos de Aula**:
- **Matinal**: 08:00 – 13:00
- **Vespertino**: 13:00 – 18:00
- **Noturno**: 18:00 – 23:00
- Cada curso pode ter um ou mais turnos (configurável no admin)

✅ **Cálculo automático de horários**:
- O gestor escolhe apenas: **turno** + **posição da prova** (1ª, 2ª, 3ª...)
- O sistema calcula automaticamente `hora_inicio` e `hora_fim` com base na duração e intervalo
- Exemplo (90min + 10min): 1ª posição = 08:00–09:30, 2ª = 09:40–11:10, 3ª = 11:20–12:50
- Validação: não permite provas que ultrapassem o fim do turno
- Preview do horário calculado antes de confirmar

✅ **Páginas do Gestor**:
- `/gestor/horario` — grade semanal com seletor de curso, ano, semestre
  - **Selecionar Turma**: inclui **Turno** como filtro de contexto (como no plano-provas)
  - **Adicionar Aula**: apenas **Disciplina**, **Dia**, **Posição** e **Sala** — Turno vem do filtro (mostrado como read-only/disabled)
  - Preview do horário calculado antes de confirmar
  - Grade visual por dia da semana (Seg–Sáb) filtrada pelo turno selecionado
  - Remover aula individualmente
  - **Impressão**: botão "🖨️ Imprimir Horário — {Turno}" com tabela em modo paisagem via `createPortal`
    - Linhas = posições de horário, Colunas = dias da semana
    - Abaixo da tabela: tabela de **Professores e Disciplinas** com nome do docente, disciplina e código
    - Rodapé com nome do gestor autenticado (via `useSession`)
  - **Tabela Professores-Disciplinas** visível no ecrã (badge "DOCENTES") e no print
- `/gestor/plano-provas` (título: **"Horário de Prova"**) — calendário de provas
  - **Período de Provas**: definir datas de início e fim (guardado na BD via `PeriodoProva`)
  - **Selecionar Turma**: agora inclui **Turno** e **Tipo de Prova** como filtros de contexto — definem o que estás a trabalhar
  - **Adicionar Prova**: apenas **Disciplina**, **Data** e **Posição** — Turno e Tipo vêm automaticamente dos filtros (mostrados como read-only)
  - **Calendário**: filtra por Turno + Tipo de Prova seleccionados; mostra apenas Segunda a Sexta
  - **Impressão**: botão **único** "🖨️ Imprimir {Turno} — {Tipo}" baseado nos filtros seleccionados
    - Página em **modo paisagem** (`landscape`)
    - Cabeçalho: `"Horário de Prova — Curso • Turno: X • Tipo"`
    - Tabela com posições (horas) nas linhas e dias nas colunas
    - Dias agrupados em semanas (máx 6 colunas por tabela)
  - Remover prova individualmente
  - **DatePicker**: inputs de data substituídos por `DatePickerPT` — calendário visual com locale português (dd/mm/aaaa) usando `react-day-picker`
  - **Timezone fix**: backend usa `T12:00:00` (meio-dia) em vez de `T00:00:00` (meia-noite) para evitar que PostgreSQL/UTC desloque a data em -1 dia em Africa/Luanda

✅ **Navegação centralizada** (`app/gestor/gestorNav.ts`):
- Dropdown "Plano Escolar" no menu do gestor com: Horário de Aulas + Horário de Prova
- Todas as páginas do gestor usam a mesma lista de navegação

✅ **Configuração no Admin** (`/admin/precos`):
- Secção "⏱️ Configuração de Horário" para ajustar duração da aula e intervalo
- Secção "Turnos" no modal de criação/edição de cursos
- Toggle buttons para seleccionar/deselecionar turnos (Matinal/Vespertino/Noturno)

✅ **APIs atualizadas**:
- `GET /api/gestor/horario?cursoId=&ano=&semestre=&turno=` — lista horários filtrados por turno + turnos do curso + config + professores das disciplinas
- `POST /api/gestor/horario` — cria aula com cálculo automático de horário (agora guarda o campo `turno` na BD)
- `DELETE /api/gestor/horario?id=` — remove aula
- `GET /api/gestor/plano-provas?cursoId=&ano=&semestre=&ano_lectivo=` — lista provas
- `POST /api/gestor/plano-provas` — cria prova
- `DELETE /api/gestor/plano-provas?id=` — remove prova
- `GET /api/gestor/periodo-provas?cursoId=&ano=&semestre=&ano_lectivo=` — obtém período de provas
- `POST /api/gestor/periodo-provas` — cria/actualiza período de provas
- `GET /api/gestor/curriculo?cursoId=` — lista disciplinas do currículo do curso

✅ **Lista de Professores-Disciplinas (Implementado 29/04/2026)**:
- **API `GET /api/gestor/horario`** agora retorna TODAS as disciplinas do currículo, mesmo sem professor atribuído
- Campo `nome_professor` fica vazio (`""`) para disciplinas sem professor
- Tabela no ecrã mostra todas as disciplinas, com campo professor em branco quando não atribuído
- Permite ao gestor ver aulas pendentes que ainda não têm professor responsável

✅ **Grade Semanal com Coluna de Tempo (Implementado 29/04/2026)**:
- **Página `/gestor/horario`** agora usa timetable grid igual à GestorDashboard
- **Coluna esquerda**: horários calculados (ex: "08:00 – 09:30") para cada posição
- **Colunas 2-7**: um por dia da semana (Segunda a Sábado)
- Cada célula mostra a disciplina + sala + botão remover, ou "—" se vazia
- Usa `posicoesTurno` calculado com base na duração e intervalo do curso
- Substitui o layout antigo de 6 colunas simples (uma por dia) sem estrutura de horários

✅ **Números em Negrito no Plano de Provas (Implementado 29/04/2026)**:
- **Página `/gestor/plano-provas`** agora mostra tempos e datas em negrito
- **Calendário grid**: horário da prova (ex: "08:00-09:30") em `<strong>`
- **Todas as Provas cards**: data (`dd/mm`) e horário em negrito
- Facilita a leitura rápida dos tempos de prova no calendário

---

### Module 3 — Monografia Workflow ✅ COMPLETO

#### Estudante
- [x] `/estudante/orientador` — pedir orientação (só 4º ano + propina paga)
- [x] Ver estado do pedido (Pendente / Aceite / Recusado)
- [x] API `POST /api/estudante/solicitacao-orientacao`
- [x] API `GET /api/estudante/solicitacao-orientacao`

#### Orientador
- [x] `/orientador/solicitacoes` — lista de pedidos de orientação pendentes, aceitar/rejeitar
- [x] `/orientador/monografias` — lista das monografias dos seus estudantes
- [x] Rever monografia, dar feedback, mudar estado (EmRevisao → Aprovada / Rejeitada)
- [x] API `PATCH /api/orientador/solicitacoes/[id]`
- [x] API `GET /api/orientador/monografias`
- [x] API `PATCH /api/orientador/monografias/[id]`

#### Gestor
- [x] `/gestor/monografias` — todas as monografias do departamento com estado actual
- [x] Agendar data de defesa (Aprovada → ParaDefender)
- [x] Atribuir nota final após defesa (ParaDefender → Defendida)
- [x] API `GET /api/gestor/monografias`
- [x] API `PATCH /api/gestor/monografias/[id]`

---

### Module 4 — Recepcionista ✅ COMPLETO

✅ **Todas as funcionalidades implementadas:**
- ✅ `/recepcionista` — pesquisa de estudante por nome ou número de estudante com debounce automático
- ✅ `/recepcionista/estudante/[id]` — detalhe: estado pagamento, documentos pendentes
- ✅ Confirmar levantamento físico de certificado
- ✅ Registar pagamento de folhas de prova (com quantidade múltipla)
- ✅ Registar pagamento de taxa de monografia
- ✅ API `GET /api/recepcionista/estudante?query=`
- ✅ API `GET /api/recepcionista/estudante/[id]`
- ✅ API `POST /api/recepcionista/emitir`

---

#### 🆕 Funcionalidade implementada 10/04/2026: Venda de multiplas folhas de prova

✅ **Problema resolvido**:
Antes quando um aluno queria comprar 5 folhas a recepcionista tinha que clicar 5 vezes no botão, criando 5 facturas separadas.

✅ **Funcionamento actual**:
1.  Ao clicar no botão `📄 Folha de Prova` abre um popup modal
2.  Campo numerico para inserir a quantidade desejada
3.  Calculo automatico do valor total em tempo real: `quantidade × 300 Kz`
4.  Apenas uma factura é criada com o valor total correcto
5.  Descrição na factura mostra a quantidade: `Folha de prova (5 unidades)`
6.  Mensagem de sucesso retorna quantidade e valor total
7.  100% retrocompatível: se quantidade não for enviada assume valor 1

✅ **API `/api/recepcionista/emitir`**:
- Novo parametro opcional: `quantidade` (inteiro positivo, default = 1)
- Exemplo de request:
  ```json
  {
    "tipo": "folha_de_prova",
    "id_estudante": 123,
    "quantidade": 7
  }
  ```
- Retorno: `{ "success": true, "mensagem": "7 folhas de prova registadas — 2.100 Kz" }`

✅ **Interface**:
- Modal centralizado com fundo escurecido
- Input numerico com `min="1"`, auto-focus automatico
- Valor total actualizado enquanto escreve
- Botões Cancelar e Confirmar
- Fecha automaticamente após confirmar ou clicar fora
- Mantem todo o estilo e cores do design system

---

#### 🆕 Funcionalidade implementada 24/04/2026: Limite de impressão de documentos (2x máx)

✅ **Problema resolvido**:
Por motivos de segurança e controlo do audit, cada documento (certificado de conclusão / declaração académica) só pode ser impresso **máximo 2 vezes**. A fatura pode ser impressa sem limite.

✅ **Funcionamento actual**:
1.  Ao carregar a ficha do estudante, o sistema busca a contagem de impressões anteriores de cada documento
2.  O botão **"📄 Documento"** mostra o contador (ex: "📄 Documento (1/2)")
3.  Quando atinge 2/2, o botão fica **cinzento e desabilitado** com tooltip "Limite de 2 impressões atingido"
4.  O botão **"🖨️ Fatura"** continua sempre disponível — sem limite
5.  O botão **"🖨️ Imprimir"** nas propinas também não é afectado
6.  Após cada impressão bem-sucedida, a contagem actualiza em tempo real

✅ **Segurança no servidor**:
- `POST /api/recepcionista/auditar/impressao` — antes de registar `tipo="documento"`, verifica na base de dados se já existem 2 registos de `IMPRESSAO_DOCUMENTO` para essa factura
- Se já houver 2, devolve erro **403**: "Limite de impressões do documento atingido (máx. 2)"
- Mesmo que alguém tente burlar o frontend, o backend bloqueia

✅ **APIs envolvidas**:
- `GET /api/recepcionista/auditar/contagem?id_factura=X` — retorna `{ count, limite, bloqueado }`
- `POST /api/recepcionista/auditar/impressao` — registra impressão e bloqueia se limite atingido

✅ **Tecnica**:
- Usa o `AuditLog` existente para contar — sem alterar a base de dados
- Cada impressão é registada com `acao = "IMPRESSAO_DOCUMENTO"` ou `acao = "IMPRESSAO_FATURA"`

---

### Module 5 — Admin ✅ 100% COMPLETO

✅ **COMPLETO** `/admin` — dashboard: total estudantes, monografias activas, pagamentos pendentes, total arrecadado no mês
✅ **COMPLETO** `/admin/estudantes` — listar, adicionar, editar, desactivar estudantes
  - Filtros: pesquisa por nome/número, curso, ano, bolsa
  - Modal aluno: 2 abas (Notas editáveis + Audit, Pagamentos com filtro tipo + Audit)
  - Aba Notas: selector ano lectivo, tabela com edição inline de todas as notas
  - Aba Pagamentos: filtro "Todos | Propinas | Outros Serviços", editar estado (só propinas)
  - API `GET /api/admin/estudantes/[id]?tipo=pagamentos` retorna propinas + facturas
✅ **COMPLETO** `/admin/orientadores` — listar, adicionar orientadores, marcar como gestor
✅ **COMPLETO** `/admin/cursos` — listar, adicionar cursos
✅ **COMPLETO** `/admin/disciplinas` — listar, adicionar, configurar dispensa e nota mínima
✅ **COMPLETO** `/admin/pagamentos` — todos os pagamentos com filtros por estado
✅ **COMPLETO** `/admin/audit` — audit log completo com filtros por cargo, utilizador, tabela, ação, curso (estudante/orientador), pesquisa e intervalo de datas

✅ **COMPLETO** API `GET /api/admin/stats` - estatísticas dashboard admin
✅ **COMPLETO** API `GET /api/admin/estudantes` - lista todos estudantes
✅ **COMPLETO** API `POST /api/admin/estudantes` - cria novo estudante
✅ **COMPLETO** API `GET /api/admin/orientadores` - lista todos orientadores
✅ **COMPLETO** API `POST /api/admin/orientadores` - cria novo orientador
✅ **COMPLETO** API `GET /api/admin/cursos` - lista todos cursos
✅ **COMPLETO** API `POST /api/admin/cursos` - cria novo curso
✅ **COMPLETO** API `GET /api/admin/disciplinas` - lista todas disciplinas
✅ **COMPLETO** API `POST /api/admin/disciplinas` - cria nova disciplina
✅ **COMPLETO** API `GET /api/admin/pagamentos` - lista todos pagamentos
✅ **COMPLETO** API `GET /api/audit`

> 🎉 **MÓDULO 5 ADMIN TERMINADO!**
>
> Todas as funcionalidades do Administrador estão implementadas e funcionais.
>
> ✅ Dashboard Admin
> ✅ Gestão de Estudantes
> ✅ Gestão de Orientadores
> ✅ Gestão de Recepcionistas
> ✅ Gestão de Administradores
> ✅ Gestão de Cursos
> ✅ Gestão de Disciplinas
> ✅ Gestão de Pagamentos
> ✅ Audit Log (com nomes legíveis e cartões de contexto)
>
> Todo o sistema está completo. Todos os 5 Módulos estão 100% funcionais.
>
> ℹ️ **Nota importante**: O sistema de Audit está 100% funcional e independente. Não necessita de nenhuma outra funcionalidade do Módulo 5 para funcionar. Todos os logs já estão sendo gravados no sistema desde o Módulo 2.
>
> ✅ **Novidades 29/04/2026**: Audit Log do Gestor agora inclui nomes legíveis (ex: `nome_disciplina`, `nome_curso`, `nome_professor`) em todas as operações. Página de Audit do Admin agora mostra 4 novos cartões de contexto: 📅 Horário, 📝 Plano de Provas, 📆 Período de Provas, 👨‍🏫 Atribuição de Professor.

---

## ✅ 15. GESTÃO DE ADMINISTRADORES — Funcionalidades (21/04/2026)

### 🆕 Alterações implementadas na página `/admin/admins`:

#### Campos do formulário
- ✅ **Nome de utilizador**: Removido do formulário de cadastro/edição
- ✅ **Nome completo**: Único campo obrigatório para identificar o administrador
- ✅ **Email**: Campo obrigatório para login
- ✅ **Telefone**: Com prefixo visual "+244 9" (apenas 8 dígitos)

#### Nome de utilizador automático
- ✅ O sistema gera automaticamente o nome de utilizador a partir do nome completo
- ✅ Formato: primeiro nome + espaço + último sobrenome (em minúsculas)
- ✅ Exemplo: "João Mendes" → `joao mendes`

#### Senha padrão
- ✅ Nova senha: `admin123` (fixa para todos os administradores)
- ✅ Mensagem visual no formulário: "🔑 Senha padrão: admin123"
- ✅ Campo de senha removido do formulário

#### Ações disponíveis (modal de edição)
- ✅ **Reset Password**: Redefine a senha para "admin123"
- ✅ **Remover**: Exclui o administrador do sistema
- ✅ Ambos os botões ficam dentro do modal de editar

#### API `/api/admin/admins`
- ✅ `POST` — cria administrador com senha padrão
- ✅ `PUT /[id]` — edita dados do administrador
- ✅ `DELETE /[id]` — remove administrador
- ✅ `PATCH` — reset de senha (tipo: "reset_password")

---


## ✅ 14. CORREÇÃO: Navegação Admin Centralizada (19/04/2026)

### 🐛 Problema original:
Cada página do Admin tinha a sua própria lista `const navItems = [...]` copiada e colada manualmente. Quando adicionaram novas páginas (Preços, Administradores, Audit Log) adicionaram só no Dashboard principal e esqueceram de atualizar todas as outras. Resultado: cada página tinha menus diferentes, algumas faltavam links.

### ✅ Solução implementada:
✅ Criado `app/admin/adminNav.ts` como **ÚNICA FONTE DE VERDADE**
✅ Contem a lista oficial e completa de TODOS os menus do Admin
✅ **TODAS as 11 paginas do Admin** foram atualizadas para importar esta lista
✅ Removido TODO o código duplicado que existia em cada página

### 📂 Ficheiro `app/admin/adminNav.ts`
```typescript
// ✅ LISTA OFICIAL DOS MENUS ADMIN
// Esta é a ÚNICA fonte verdade. Altera aqui e aparece em TODAS as paginas automaticamente!

export const adminNavItems = [
  { label: "Visão Geral", path: "/admin" },
  { label: "Estudantes", path: "/admin/estudantes" },
  { label: "Orientadores", path: "/admin/orientadores" },
  { label: "Recepcionistas", path: "/admin/recepcionistas" },
  { label: "Departamentos", path: "/admin/departamentos" },
  { label: "Cursos", path: "/admin/cursos" },
  { label: "Disciplinas", path: "/admin/disciplinas" },
  { label: "Preços", path: "/admin/precos" },
  { label: "Administradores", path: "/admin/admins" },
  { label: "Audit Log", path: "/admin/audit" },
]
```

### 🎯 Resultado final:
✅ **TODAS as paginas do Admin tem AGORA EXACTAMENTE OS MESMOS MENUS**
✅ Não existe mais nenhuma inconsistência
✅ Se adicionarmos um novo link no futuro, alteramos 1 VEZ SÓ neste ficheiro
✅ Aparece automaticamente em TODAS as 11 paginas instantaneamente
✅ Nunca mais vai acontecer de entrar numa página e ver metade dos menus desaparecidos

---

## 15. Component Architecture

### DashboardLayout (shared by all roles)

**Props:** `navItems`, `title`, `subtitle?`, `children`
**Contains:** Sidebar (brand + nav + logout) · Topbar · Content area
Active nav item detected via `usePathname()` — highlights automatically

✅ **Funcionalidade automática implementada 19/04/2026:**
Deteta automaticamente quando sessão expira ou fica corrompida e redireciona silenciosamente para a página de login sem mostrar erros.

Funcionamento:
```ts
const { status } = useSession()

useEffect(() => {
  if (status === 'unauthenticated') {
    router.push('/login')
  }
}, [status, router])
```

✅ Funciona em TODAS as páginas que usam DashboardLayout
✅ Não aparecem mais erros de JSON.parse no next-auth
✅ Utilizador nunca mais fica preso com página carregando para sempre

### Pattern for each page

```
app/[role]/page.tsx           → server component, auth check, renders Dashboard
app/[role]/[Role]Dashboard    → client component, fetches from API, renders UI
app/api/[resource]/route.ts   → auth check → role check → prisma query → JSON
```

### AuditLog helper (lib/audit.ts — criar no início do Module 2)

```ts
export async function logAudit({
  id_usuario,
  acao,
  tabela,
  id_registro,
  valor_antes,
  valor_depois,
  ip_address
}: {
  id_usuario: number
  acao: string
  tabela: string
  id_registro: number
  valor_antes?: object
  valor_depois?: object
  ip_address: string
}) {
  await prisma.auditLog.create({
    data: {
      id_usuario,
      acao,
      tabela,
      id_registro,
      valor_antes: valor_antes ? JSON.stringify(valor_antes) : null,
      valor_depois: valor_depois ? JSON.stringify(valor_depois) : null,
      ip_address,
      criado_em: new Date()
    }
  })
}
```

### Grade calculation helper (lib/notas.ts — criar no início do Module 2)

```ts
export function calcularNotaFinal(nota: NotaInput, disciplina: DisciplinaInput) {
  const { ac1, ac2, ac3, ttp, pp1, pp2, exame, recurso, exame_especial } = nota

  // Exame especial substitui tudo
  if (exame_especial != null) return { nota_final: exame_especial, tipo: "Especial" }

  // Recurso substitui tudo
  if (recurso != null) return { nota_final: recurso, tipo: "Recurso" }

  // AC incompleto — não calcular ainda
  if ([ac1, ac2, ac3, ttp, pp1, pp2].some(v => v == null))
    return { nota_final: null, tipo: "Normal" }

  const nota_ac = (((ac1! + ac2! + ac3!) / 3) + ttp!) / 2
  const nota_final_ac = (nota_ac + (pp1! + pp2!) / 2) / 2

  // Dispensa
  if (disciplina.tem_dispensa && nota_final_ac >= disciplina.nota_dispensa)
    return { nota_final: nota_final_ac, dispensada: true, tipo: "Normal" }

  // Com exame
  if (exame != null)
    return { nota_final: nota_final_ac * 0.4 + exame * 0.6, tipo: "Normal" }

  // AC completo mas sem exame ainda
  return { nota_final: null, tipo: "Normal" }
}
```

---

## 15. UI Design System

| Token | Value |
|---|---|
| Background | `#0d0f14` |
| Card | `#1e2230` |
| Sidebar | `#13161e` |
| Primary | `#e03d3d` (red) |
| Secondary | `#f0a500` (gold) |
| Teal | `#2dd4bf` |
| Text | `#e8eaf0` |
| Muted | `#9098b0` |
| Dim | `#555e78` |
| Border | `rgba(255,255,255,0.07)` |
| Font | `system-ui` |

### Status Colours

| State | Colour |
|---|---|
| Pass / Paid / Active | `#22c55e` |
| Pending / Warning / Nota parcial | `#f0a500` |
| Fail / Late / Error | `#e03d3d` |
| Dispensado / Info | `#2dd4bf` |
| Em curso / Sem nota | `#555e78` |
| Exame Especial | `#9b59b6` |

---

## 16. Dificuldades e Lições Aprendidas

As principais dificuldades encontradas durante o desenvolvimento do projeto:



> ✅ **Solução:** Remover campos inexistentes do `include._count` e só contar relações que realmente existem no modelo.

### 🚫 **Next.js 15 App Router — `params` é uma Promise**
Mudança não documentada entre Next.js 14 e 15. Todos os endpoints API que recebiam `params.id` deixaram de funcionar, pois agora `params` é uma `Promise`.

> ✅ **Solução:** Adicionar `const resolvedParams = await params` ANTES de aceder a qualquer propriedade do params.

### 🚫 **Prisma Decimal — Bug `Number(null) = 0`**
Quando convertes um campo Decimal null para Number() o JavaScript retorna 0, que é uma nota válida. Isso causou notas com valor 0 aparecerem quando na realidade eram null.

> ✅ **Solução:** Sempre verificar com `!= null` ANTES de converter para Number.

### 🚫 **TurboPack Hydration Errors**
O novo bundler do Next.js 15 causa vários erros de hidratação com componentes client-side, especialmente com datas e formatação de números.

> ✅ **Solução:** Remover fontes padrão Geist do layout.tsx, formatar datas apenas dentro de `useEffect()`.

### 🚫 **Modelo de Relações 1 para N**
O relacionamento entre Curso e Disciplina não estava correctamente definido no schema, o que causou vários erros na API Admin.

> ✅ **Solução:** Rever o schema cada vez antes de fazer uma query `include` para confirmar que a relação realmente existe.

### 🚫 **Timezone UTC shift em datas (Africa/Luanda UTC+1)**
Quando crias `new Date("2025-03-17T00:00:00")` em JavaScript, o objeto Date é armazenado internamente como UTC. Em Africa/Luanda (UTC+1), meia-noite local vira 23:00 UTC do dia ANTERIOR. Quando o Prisma serializa o DateTime para JSON, usa `toISOString()` que retorna `2025-03-16T23:00:00.000Z` — e o `.split("T")[0]` no frontend fica com o dia 16 em vez de 17. Isto fazia:
- As provas aparecerem no calendário com a data errada (um dia antes)
- A adição de provas guardar a data deslocada no banco

> ✅ **Solução:** Ao criar registos, usar `new Date(data + "T12:00:00")` (meio-dia) em vez de `T00:00:00` (meia-noite) — meio-dia não ultrapassa a fronteira de UTC. Ao retornar dados, formatar manualmente com `.getFullYear()`, `.getMonth()`, `.getDate()` em vez de confiar no `toISOString()`.

---

## 17. Known Issues / Notes

1. **Prisma 7** — requires `@prisma/adapter-pg`. After every schema change: `db push` → `prisma generate` → `seed`. Never skip `generate` or TypeScript types stay stale.
2. **WSL not used** — everything runs on Windows native PowerShell (WSL não funcionou por problemas de rede e Docker).
3. **TypeScript path aliases** — if `@/lib/auth` gives "cannot find module", restart TS server: `Ctrl+Shift+P` → `TypeScript: Restart TS Server`.
4. **Dev server slow on first load** — Next.js compiles pages on-demand in dev. Normal.
5. **Reset database** — always run `npx prisma db push` after `npx prisma migrate reset`, otherwise tables don't exist and seed fails with `P2021`.
6. **Apenas UM Professor por Disciplina** — regra de negócio implementada: quando adicionas um novo professor, todos os outros são apagados automaticamente daquela disciplina.

---

## 17. Post-Completion Additions

> Implementar **apenas depois** de todos os 5 módulos estarem funcionais. Não são requisitos do documento oficial.

### G. Gestão de Cursos Admin (Implementado 18/04/2026)

#### Funcionalidades Implementadas:

✅ **Modal de Edição Completo:**
- Campos: Nome do Curso, Duração (anos), Departamento
- Tabs por ano curricular (1º, 2º, 3º, etc.)
- Preços de propina e multa por ano curricular

✅ **Botão Único "Salvar Alterações":**
- Salva todos os dados do curso de uma vez (nome, duração, departamento e preços)
- Posicionado ao lado do botão "Fechar"
- Feedback visual: mostra alerta de sucesso ou erro

✅ **Interface Limpa:**
- Removido botão individual de salvar preços (agora tudo salvo junto)
- Campos de Propina e Multa lado a lado
- Uma única ação para guardar todas as alterações

✅ **API PUT para Cursos:**
- `PUT /api/admin/cursos/[id]` — atualiza nome, duração e departamento
- `PUT /api/admin/config/precos-curso/[id_curso]` — salva preços por ano
- `DELETE /api/admin/cursos/[id]` — remove curso

---

### F. Gestão de Orientadores Admin (Implementado 16/04/2026)

#### Funcionalidades Implementadas:

✅ **Barra de Pesquisa e Filtros:**
- Campo de pesquisa por nome do orientador (com debounce de 300ms)
- Filtro por Departamento (dropdown)
- Filtro por Curso (dropdown)
- Os filtros funcionam em conjunto (pesquisa + departamento + curso)

✅ **Gestão de Gestor por Departamento:**
- Ao tentar tornar um orientador em gestor, o sistema verifica se já existe outro gestor nesse departamento
- Se existir, mostra um modal de confirmação: "Já existe um gestor neste departamento (X). Deseja remover o gestor atual e tornar este orientador no novo gestor?"
- Se confirmar, remove o gestor anterior e atribui ao novo
- API `PATCH /api/admin/orientadores` com suporte a `substituir_gestor: true`

✅ **Edição de Orientadores:**
- Modal de edição com campos: nome, departamento, especialidade, telemóvel
- Checkbox para marcar/desmarcar como gestor

---

### A. Mock Terminal Multicaixa
Página `/multicaixa` pública que simula o terminal físico. Estudante insere número de estudante → sistema mostra dívida → confirma pagamento. Demonstra o fluxo real do Multicaixa Express sem integração externa e sem alterar nada no backend existente.

### B. File Storage com MinIO (Opcional — migrar do filesystem)

> **Nota:** O sistema agora usa **filesystem local** para armazenar PDFs (sem MinIO). Esta secção documenta como migrar para MinIO no futuro se necessário.

Guardar PDFs de monografias em object storage local em vez do filesystem. URLs de download temporários e assinados — ficheiros inacessíveis sem sessão válida. Requer Docker.

```bash
docker run -d -p 9000:9000 -p 9001:9001 \
  -v ~/minio/data:/data --name minio \
  minio/minio server /data --console-address ":9001"
```

Variáveis adicionais no `.env`:
```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=sge-atlantida
```

### C. Database Backup Script
```bash
# backup.sh — correr diariamente
pg_dump -U postgres sge_atlantida | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_20260403.sql.gz | psql -U postgres sge_atlantida
```
Estratégia: diário (7 dias) + semanal (4 semanas) + mensal (6 meses). Espaço estimado: ~150MB total.

### D. Security Headers
```ts
// next.config.js
async headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ]
  }]
}
```

### E. Input Validation com Zod
```bash
npm install zod
```
Adicionar schemas a todos os POST endpoints — especialmente `/api/notas` e `/api/estudante/pagamentos/confirmar`.

---

## 🆕 Departamento Section Updates (21/04/2026)

### Novas funcionalidades implementadas:

#### 1. Gestão de Gestor via Departamento
✅ **Adicionado kemampuan untuk atribuir gestor melalui edit do departamento:**
- No modal de edição do departamento, há um dropdown "Gestor do Departamento"
- Lista todos os orientadores daquele departamento
- Permite seleccionar um gestor ou remover (opção "Nenhum (Sem gestor)")
- O gestor anterior é automaticamente removido ao seleccionar novo

**API atualizada:**
- `PATCH /api/admin/departamentos` agora aceita `id_gestor` (int ou null)
- Remove automaticamente o gestor anterior e atribui o novo

#### 2. Expansão Múltipla de Departamentos
✅ **Mudança de UX — agora pode.expandir VARIOS cartões ao mesmo tempo:**
- Antes: apenas 1 cartão podia estar expandido de cada vez
- Depois: clique em "Ver Detalhes" expande esse cartão, outros ficam abertos
- Cada cartão mostra independentemente "Ver Detalhes" ou "Ocultar Detalhes"

**Estado interno modificado:**
- `expandedId: number | null` → `expandedIds: number[]`
- `detalhes: DetalhesDepartamento` → `detalhesMap: Record<number, DetalhesDepartamento>`
- `loadingDetalhes: boolean` → `loadingDetalhesIds: number[]>`

#### 3. Badge GESTOR Visível
✅ **Na detalhes expandidos, gestor tem-badge prominente:**
- Estilo: fundo teal (#2dd4bf), texto preto, padding 2px 6px
- Appears ao lado do nome do orientador na lista de orientadores
- Muito mais visível que só "(Gestor)" em texto simples

---

#### 🆕 Melhorias no Dashboard de Disciplinas (Gestor) — 28/04/2026

##### Removido Botão "Atribuir a Curso"
- ✅ Botão `📚 Atribuir a Curso` removido do `DisciplinasDashboard.tsx` — esta funcionalidade é duplicada e melhor implementada na página de Currículo
- ✅ Modal de atribuição removido (~200 linhas de código eliminadas)
- ✅ Estado e tipos associados ao modal removidos

##### Filtro por Turno na Lista de Estudantes
- ✅ Adicionado filtro por turno (Matinal / Vespertino / Noturno) acima da tabela de notas
- ✅ Mostra contador "X de Y alunos" com base no filtro activo
- ✅ Coluna "Turno" adicionada ao cabeçalho da tabela
- ✅ Filtro reinicia automaticamente ao mudar de disciplina
- ✅ Campo `turno` incluído no tipo `Estudante` no frontend

##### Correção: Contagem de Estudantes
- ✅ **API `GET /api/gestor/disciplinas`** — contagem de estudantes agora filtra apenas por:
  - Estudantes activos (`estado: "EmCurso"`)
  - Curso e ano actual do estudante correspondentes à colocação da disciplina no currículo
- ✅ Antes contava TODAS as Notas, agora conta apenas os que realmente devem estar na disciplina

##### Correção: Lista de Estudantes por Disciplina
- ✅ **API `GET /api/gestor/disciplinas/[id]/estudantes`** — agora filtra estudantes cujo `ano_current` corresponde ao ano curricular da disciplina no currículo
- ✅ Alunos do 1º ano já não aparecem em listas de disciplinas do 2º ano
- ✅ Adicionado campo `turno` na resposta da API (com consulta ao modelo `Estudante`)

##### Limpeza de Notas Futuras (Script)
- ✅ **Script `prisma/seed-limpar-notas-futuras.ts`** — percorre todos os estudantes activos e limpa valores de Nota em disciplinas cujo ano curricular no currículo é superior ao ano actual do estudante
- ✅ Executado: **3 notas limpas** (Meme, Myers, Len Lon — tinham Base de Dados I (2º ano) com notas preenchidas enquanto estavam no 1º ano)

##### Atribuição de Disciplinas a Estudantes Existentes (Script)
- ✅ **Script `prisma/seed-fix-estudantes-disciplinas.ts`** — percorre todos os estudantes activos e cria Notas em branco para disciplinas do seu ano curricular que ainda não existiam
- ✅ Executado: **46 Notas criadas** para estudantes que não tinham disciplinas atribuídas

##### Salvaguarda: Bloqueio de Notas para Anos Futuros
- ✅ **API `POST /api/notas`** — nova validação que impede o gestor de lançar notas para disciplinas cujo ano curricular é superior ao ano actual do estudante
- ✅ Rejeita com erro claro: "Esta disciplina é do Xº Ano, mas o estudante está no Yº Ano"
- ✅ Previne o problema de notas futuras acontecer novamente

---

## 18. Current State

### Completed

- [x] Full project scaffolded (Next.js 15 + TypeScript + Tailwind)
- [x] PostgreSQL database with all 26 tables (incl. HorarioAula, PlanoProva, co-autores na monografia)
- [x] NextAuth JWT authentication + role-based routing + middleware
- [x] Login page working
- [x] DashboardLayout shared component with active nav detection
- [x] All 5 role dashboard shells
- [x] Student dashboard (visão geral) fully wired to DB
- [x] Grade schema: AC components + dispensa logic + recurso/especial as raw scores
- [x] Seed: Ben Minogashita (2º ano) + Ana Silva (4º ano)
- [x] `/estudante/notas` — full grade history with exam chain, averages, payment block
- [x] `/estudante/pagamentos` — full payment history with Multicaixa confirmation and duplicate protection
- [x] `/estudante/monografia` — pre-projecto + monografia submission with PDF upload + co-autores
- [x] `/estudante/certificados` — certificate request + PDF download with @react-pdf/renderer
- [x] Armazenamento local de arquivos (filesystem) — sem MinIO, sem Docker

### Module 2 — Grade Management ✅ COMPLETO

- [x] Modelo `ProfessorDisciplina` adicionado ao schema
- [x] Seed atualizado com disciplinas atribuídas ao orientador (BD1, RC1, SO1)
- [x] `lib/audit.ts` — helper para registar alterações no AuditLog
- [x] `lib/notas.ts` — função `calcularNotaFinal()` com lógica de dispensa/recurso/especial
- [x] Dashboard do orientador com lista de disciplinas e edição inline de notas
- [x] Dashboard do gestor com visão geral do departamento e filtros
- [x] `/gestor/estudantes` — lista de estudantes do departamento
- [x] `/gestor/disciplinas` — lista de disciplinas com filtro por ano/semestre
- [x] DisciplinasDashboard: clicar numa disciplina mostra estudantes com notas editáveis (accordion/dropdown)
- [x] DisciplinasDashboard: nome do professor/orientador responsável aparece na disciplina selecionada
- [x] API `GET /api/gestor/disciplinas/[id]/estudantes` — inclui campo `orientador` com nome do professor
- [x] API `GET /api/orientador/disciplinas` — disciplinas atribuídas ao orientador
- [x] API `GET /api/orientador/disciplinas/[id]/estudantes` — estudantes com notas
- [x] API `POST /api/notas` — criar/atualizar notas com cálculo automático + audit log
- [x] API `GET /api/gestor/estudantes` — todos os estudantes do departamento
- [x] API `GET /api/gestor/disciplinas` — todas as disciplinas do departamento
- [x] API `GET /api/gestor/disciplinas/[id]/estudantes` — estudantes e notas de uma disciplina
- [x] Conta de gestor adicionada ao seed: `gestor@ispatlantida.ao` / `gestor123`
- [x] UI accordion: tabela de estudantes aparece dentro da disciplina (não no fundo da página)
- [x] Toggle: clicar na mesma disciplina fecha a tabela
- [x] Seta indicadora ▼ que roda 180° quando expandido
- [x] `/gestor/horario` — grade semanal com filtro de turno, turno disabled no form, tabela professores, impressão com createPortal + nome do gestor
- [x] `/gestor/plano-provas` — calendário de provas por disciplina com impressão via createPortal
- [x] `app/gestor/gestorNav.ts` — navegação centralizada com dropdown "Plano Escolar"
- [x] API `GET/POST/DELETE /api/gestor/horario` — horário com filtro turno, professores incluídos, guarda turno na BD
- [x] API `GET/POST/DELETE /api/gestor/plano-provas` — calendário de provas
- [x] API `GET /api/gestor/curriculo` — disciplinas do currículo do curso
- [x] Turnos no Curso (Matinal/Vespertino/Noturno) — configurável no admin
- [x] Configuração de duração da aula e intervalo no admin (`/admin/precos`)
- [x] Schema `HorarioAula` com campo `turno` (+ unique constraint actualizada)

### Module 3 — Monografia Workflow ✅ COMPLETO

- [x] `/estudante/orientador` — página para pedir orientação (só 4º ano + propina paga)
- [x] API `POST /api/estudante/solicitacao-orientacao` — submeter pedido de orientação
- [x] API `GET /api/estudante/solicitacao-orientacao` — ver estado do pedido
- [x] `/orientador/solicitacoes` — lista de pedidos de orientação pendentes, aceitar/rejeitar
- [x] API `GET /api/orientador/solicitacoes` — listar solicitações do orientador
- [x] API `PATCH /api/orientador/solicitacoes/[id]` — aceitar/rejeitar solicitação
- [x] `/orientador/monografias` — lista das monografias dos seus estudantes com info de co-autores
- [x] API `GET /api/orientador/monografias` — listar monografias do orientador (inclui co-autores)
- [x] API `PATCH /api/orientador/monografias/[id]` — rever monografia, dar feedback, mudar estado
- [x] `/gestor/monografias` — todas as monografias do departamento com estado actual e co-autores
- [x] API `PATCH /api/gestor/monografias/[id]` — agendar defesa e atribuir nota final
- [x] Seed atualizado com monografia da Ana Silva (estado: Submetida, com co-autores)
- [x] Campos `nome_co_orientador` e `nome_co_autor` adicionados ao schema e APIs
- [x] `id_orientador` preenchido automaticamente da orientação aceite
- [x] Download de PDF via filesystem local (sem MinIO)

### Next step

**Module 4 — Recepcionista**
1. Criar página `/recepcionista` para pesquisa de estudante
2. Criar página `/recepcionista/estudante/[id]` para detalhe do estudante
3. Criar APIs para recepcionista (pesquisa, detalhe, emitir)

---

#### 🆕 Melhorias no módulo de Estudante (Gestor) — 27/04/2026

##### Schema — Campo `turno` adicionado ao Estudante
- ✅ Campo `turno` (String) adicionado ao modelo `Estudante` no schema Prisma
- ✅ Permite registar se o estudante é Matinal, Vespertino ou Noturno
- ✅ BD actualizada com `npx prisma db push`

##### Atribuição Automática de Disciplinas — `lib/atribuirDisciplinas.ts`
- ✅ Nova função `atribuirDisciplinasAoEstudante()` que:
  - Busca todas as disciplinas definidas no currículo do curso para o ano do estudante
  - Cria registos `Nota` em branco (com `ano_lectivo`, `semestre` correctos) para cada disciplina
  - Cria/actualiza registos `CurriculoAcademico` para o ano lectivo do estudante
  - Pode ser chamada na criação do estudante ou quando o estudante muda de ano

##### API `POST /api/admin/estudantes` actualizada
- ✅ Aceita novo campo opcional: `turno` (string)
- ✅ Após criar o estudante, chama automaticamente `atribuirDisciplinasAoEstudante()`
- ✅ As notas em branco são criadas logo no momento do cadastro

##### API `GET /api/gestor/estudantes/[id]` — Detalhes + Histórico
- ✅ Retorna dados completos do estudante: `turno`, `ano_current`, `ano_electivo`, `estado`, `pagamento`, `tipo_bolsa`, `data_cadastro`
- ✅ Inclui informações do curso com `turnos_disponiveis`
- ✅ **Histórico por ano curricular** (`anos_curriculares`):
  - Itera do 1º ano até `ano_current`
  - Para cada ano, busca as disciplinas definidas no currículo (`CursoDisciplina`)
  - Busca as notas do estudante para esse ano lectivo
  - Organiza por semestre (S1, S2)
  - Retorna todos os campos de nota (AC1-AC3, TTP, PP1-PP2, Exame, Recurso, Exame Especial, Nota Final)
  - Indica se o estudante foi dispensado, aprovado ou está em curso

##### API `PUT /api/gestor/estudantes/[id]/notas/[id_nota]` — Editar Notas
- ✅ Actualiza componentes individuais da nota (AC1, AC2, AC3, TTP, PP1, PP2, Exame, Recurso, Exame Especial)
- ✅ Recalcula a nota final automaticamente usando `calcularNotaFinal()` da `lib/notas.ts`
- ✅ Apenas actualiza campos enviados no body
- ✅ Valida que a nota pertence ao estudante correcto
- ✅ Retorna a nota actualizada completa

##### Dashboard de Estudantes (`/gestor/estudantes`) — Reescrevido completamente
- ✅ **Filtros**: pesquisa por número de estudante ou nome + filtro por curso
- ✅ **Stats**: total estudantes, estudantes activos, propina pendente, ano lectivo
- ✅ **Lista de estudantes** com nome, número, curso, ano, estado e pagamento
- ✅ Ao clicar num estudante, mostra o **painel de detalhes**:
  - **Info do estudante**: nome, número, curso, turno, estado, ano actual, bolsa
  - **Percurso Académico**: tabs por ano curricular (ex: `[1º Ano 2024/2025] [2º Ano 2025/2026]`)
  - Ano actual destacado com ponto verde
  - **Filtro por semestre**: botões S1/S2 para organizar disciplinas
  - **Tabela detalhada** com todas as colunas: disciplina, semestre, AC1, AC2, AC3, TTP, PP1, PP2, Exame, Recurso, Exame Especial, Nota Final, Estado
  - Botão **✏️ Editar** em cada disciplina (desabilitado se não houver registo de nota)
- ✅ **Modal de edição de nota**:
  - Inputs para cada componente com validação (0-20, recurso/exame_especial max 12)
  - **Pré-visualização em tempo real** da nota final calculada
  - Exibe o tipo de avaliação (Dispensado, Com Exame, Recurso, Especial)
  - Guarda via PUT e actualiza a tabela instantaneamente

##### Seed actualizado
- ✅ `turno: "Matinal"` adicionado ao estudante Ben Minogashita
- ✅ `turno: "Vespertino"` adicionado à estudante Ana Silva
- ✅ `CurriculoAcademico` criado para Ben: 1º Ano (2024/2025) e 2º Ano (2025/2026)
- ✅ `CurriculoAcademico` criado para Ana: 1º ao 4º Ano (2021/2022 — 2024/2025)

##### Fix: Chave duplicada no Horário
- ✅ `app/gestor/horario/page.tsx` — alterado `key={p.id_disciplina}` para `key={idx}` na tabela de professores
- ✅ Resolve erro React "Encountered two children with the same key"

---

#### 🆕 Filtros Avançados na Lista de Disciplinas (28/04/2026)

##### Filtro por Curso na lista de disciplinas
- ✅ Dropdown de cursos disponível na área de filtros (junto com ano e semestre)
- ✅ Quando seleccionado, a contagem `total_estudantes` de cada disciplina reflete **APENAS** os estudantes desse curso
- ✅ Ao clicar numa disciplina, a tabela de estudantes mostra **APENAS** alunos desse curso (mesmo que a disciplina esteja em vários cursos)
- ✅ API `GET /api/gestor/disciplinas` actualizada: aceita `?cursoId=X` para filtrar contagem

##### Filtro por Turno (Matinal/Vespertino/Noturno)
- ✅ Novo dropdown de turnos na área de filtros (junto com curso, ano e semestre)
- ✅ Quando seleccionado, a contagem e a tabela de estudantes filtram por aquele turno
- ✅ Integrado na API `GET /api/gestor/disciplinas` via query param `?turno=X`
- ✅ Integrado na API `GET /api/gestor/disciplinas/[id]/estudantes` via query param `?turno=X`

##### Comportamento da Contagem
| Filtro Activo | Contagem na Disciplina | Tabela de Estudantes |
|---|---|---|
| Nenhum | Total de todos os cursos | Todos os estudantes |
| Curso A | Só Curso A | Só Curso A |
| Curso A + Matinal | Curso A + Matinal | Curso A + Matinal |
| Só Matinal | Matinal (todos os cursos) | Matinal (todos os cursos) |

##### Recarga Automática
- ✅ Quando mudas o filtro de **Curso** ou **Turno**, a lista de disciplinas e a tabela de estudantes recarregam automaticamente via servidor
- ✅ Nova função `carregarDisciplinas()` no frontend que faz fetch com os filtros actuais
- ✅ A contagem `total_estudantes` é sempre consistente com o filtro activo (não causa confusão na UX)

##### Remoção de Filtro Antigo
- ✅ Filtro de turno removido de dentro da tabela de estudantes (agora está na área de filtros principais)
- ✅ Contador "X de Y alunos" actualizado para usar o filtro global em vez de filtro local
