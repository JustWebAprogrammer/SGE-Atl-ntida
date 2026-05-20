# SGE Atlântida — Project Documentation

**Last updated:** May 20, 2026
**Status:** 🎉 100% COMPLETO! Todos os 5 Módulos + Funcionalidades Extra implementados e funcionais
**Production URL:** [https://sge-atl-ntida.vercel.app/](https://sge-atl-ntida.vercel.app/) (Neon PostgreSQL)

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

| Layer          | Technology                                 | Why                                                                                            |
| -------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Frontend       | Next.js 15 + TypeScript                    | File-based routing, React components, one codebase                                             |
| Styling        | Tailwind CSS                               | Utility-first, no separate CSS files                                                           |
| Auth           | NextAuth JWT (custom refresh-jwt endpoint) | JWT strategy with role-based protection, refresh endpoint to update session after profile edit |
| Backend        | Next.js API Routes                         | Same codebase as frontend, no separate server needed                                           |
| ORM            | Prisma 6                                   | Type-safe database queries, schema-first, auto migrations                                      |
| Database       | PostgreSQL (Neon)                          | Cloud-hosted PostgreSQL with pooled + direct connection                                        |
| DB Driver      | @prisma/adapter-pg                         | Required by Prisma 6 for direct PostgreSQL connection                                          |
| Password       | bcryptjs                                   | Secure password hashing                                                                        |
| PDF Generation | @react-pdf/renderer                        | React components for generating professional certificates & declarations                       |
| Calendar       | react-day-picker + date-fns (locale ptBR)  | Date picker with Portuguese locale                                                             |
| Runtime        | Node.js v22                                | Required for Next.js                                                                           |

### What is NOT in this stack (and why)

- **No Python/FastAPI** — was needed for AI model, AI was removed from scope
- **No Redis** — NextAuth handles sessions natively, no cache layer needed
- **No blockchain** — removed from scope
- **No WSL required** — project runs on Windows native (WSL had network issues during setup)
- **No MinIO** — file storage uses local filesystem (uploads/ directory)
- **No Docker** — everything runs natively

---

## 4. Project Structure

```
sge-atlantida/
├── app/
│   ├── admin/
│   │   ├── page.tsx                           ← Dashboard: stats, total students, monografias, pagamentos
│   │   ├── adminNav.ts                        ← Fonte única de verdade para navegação admin
│   │   ├── estudantes/
│   │   │   ├── page.tsx
│   │   │   └── EstudantesAdminDashboard.tsx    ← CRUD completo + notas editáveis + pagamentos
│   │   ├── orientadores/
│   │   │   ├── page.tsx
│   │   │   └── OrientadoresAdminDashboard.tsx  ← Com pesquisa, filtros e gestão de gestores
│   │   ├── recepcionistas/
│   │   │   ├── page.tsx
│   │   │   └── RecepcionistasDashboard.tsx     ← CRUD recepcionistas
│   │   ├── admins/
│   │   │   ├── page.tsx
│   │   │   └── AdminsDashboard.tsx            ← Gestão de administradores
│   │   ├── cursos/
│   │   │   ├── page.tsx
│   │   │   └── CursosAdminDashboard.tsx       ← CRUD cursos + preços por ano
│   │   ├── disciplinas/
│   │   │   ├── page.tsx
│   │   │   └── DisciplinasAdminDashboard.tsx  ← CRUD disciplinas + dispensa config
│   │   ├── departamentos/
│   │   │   ├── page.tsx
│   │   │   └── DepartamentosAdminDashboard.tsx ← CRUD departamentos + gestor
│   │   ├── pagamentos/
│   │   │   ├── page.tsx
│   │   │   └── PagamentosAdminDashboard.tsx   ← Todos pagamentos com filtros
│   │   ├── precos/
│   │   │   ├── page.tsx
│   │   │   └── PrecosAdminDashboard.tsx       ← Preços globais + serviços + horário config
│   │   ├── audit/
│   │   │   ├── page.tsx
│   │   │   └── AuditDashboard.tsx             ← Audit log com filtros avançados
│   │   └── sistema/
│   │       ├── ano-lectivo/
│   │       │   ├── page.tsx
│   │       │   └── AnoLectivoDashboard.tsx    ← Gestão ano lectivo + matrícula
│   │       ├── semestre/
│   │       │   ├── page.tsx
│   │       │   └── SemestreDashboard.tsx      ← Controlo de semestre actual
│   │       ├── finalistas/
│   │       │   ├── page.tsx
│   │       │   └── FinalistasDashboard.tsx    ← Finalização de estudantes
│   │       ├── layout-documentos/
│   │       │   ├── page.tsx
│   │       │   └── LayoutDocumentosDashboard.tsx ← Layouts de documentos PDF
│   │       ├── assinaturas/
│   │       │   └── page.tsx                  ← Upload assinaturas (presidente, gestor, diretor)
│   │       ├── registos/
│   │       │   ├── page.tsx
│   │       │   └── RegistosDashboard.tsx     ← Registos/pipeline manuais
│   │       └── simulador/
│   │           └── route.ts                  ← Simulador de data do sistema
│   ├── estudante/
│   │   ├── page.tsx
│   │   ├── EstudanteDashboard.tsx            ← Visão geral: perfil, disciplinas, propina
│   │   ├── orientador/
│   │   │   ├── page.tsx
│   │   │   └── OrientadorDashboard.tsx       ← Pedir orientação, ver estado
│   │   ├── notas/
│   │   │   ├── page.tsx
│   │   │   └── NotasDashboard.tsx            ← Histórico completo de notas
│   │   ├── horario/
│   │   │   ├── page.tsx
│   │   │   └── HorarioDashboard.tsx          ← Horário semanal do estudante
│   │   ├── pagamentos/
│   │   │   ├── page.tsx
│   │   │   └── PagamentosDashboard.tsx       ← Pagamentos, Multicaixa confirmação
│   │   ├── monografia/
│   │   │   ├── page.tsx
│   │   │   └── MonografiaDashboard.tsx       ← Pré-projecto + monografia + upload
│   │   ├── certificados/
│   │   │   ├── page.tsx
│   │   │   └── CertificadosDashboard.tsx     ← Pedir/descarregar certificados
│   │   ├── declaracao/
│   │   │   ├── page.tsx
│   │   │   └── DeclaracaoDashboard.tsx       ← Declarações académicas
│   │   └── servicos/
│   │       ├── page.tsx
│   │       └── ServicosDashboard.tsx         ← Comprar serviços
│   ├── orientador/
│   │   ├── page.tsx
│   │   ├── OrientadorDashboard.tsx           ← Dashboard: disciplinas, solicitações
│   │   ├── solicitacoes/
│   │   │   └── page.tsx                     ← Pedidos de orientação pendentes
│   │   └── monografias/
│   │       └── page.tsx                     ← Monografias dos seus estudantes
│   ├── recepcionista/
│   │   ├── page.tsx                          ← Dashboard + pesquisa de estudante
│   │   └── estudante/
│   │       └── [id]/page.tsx                ← Detalhe: pagamentos, documentos, emitir
│   ├── gestor/
│   │   ├── page.tsx
│   │   ├── GestorDashboard.tsx               ← Visão geral do departamento
│   │   ├── gestorNav.ts                     ← Navegação centralizada com dropdown
│   │   ├── estudantes/
│   │   │   ├── page.tsx
│   │   │   └── EstudantesDashboard.tsx       ← Lista estudantes + percurso académico
│   │   ├── disciplinas/
│   │   │   ├── page.tsx
│   │   │   └── DisciplinasDashboard.tsx      ← Disciplinas + edição inline de notas
│   │   ├── horario/
│   │   │   ├── page.tsx
│   │   │   └── HorarioDashboard.tsx          ← Grade semanal + impressão
│   │   ├── plano-provas/
│   │   │   ├── page.tsx
│   │   │   └── PlanoProvasDashboard.tsx      ← Calendário de provas + impressão
│   │   ├── curriculo/
│   │   │   ├── page.tsx
│   │   │   └── CurriculoDashboard.tsx        ← Gestão de currículo do curso
│   │   ├── monografias/
│   │   │   ├── page.tsx
│   │   │   └── MonografiasDashboard.tsx      ← Todas monografias do departamento
│   │   └── pipeline-monografia/
│   │       ├── page.tsx
│   │       └── PipelineDashboard.tsx         ← Pipeline visual de monografias
│   ├── verificar/
│   │   └── [id]/page.tsx                    ← Verificação de documentos
│   ├── login/
│   │   └── page.tsx
│   ├── components/
│   │   ├── DashboardLayout.tsx              ← Layout partilhado (sidebar + topbar)
│   │   ├── SessionProvider.tsx
│   │   ├── DatePickerPT.tsx                 ← DatePicker com locale português
│   │   ├── DeclaracaoPDF.tsx                ← PDF declaração académica
│   │   ├── CertificadoDisciplinasPDF.tsx    ← PDF certificado de disciplinas
│   │   ├── CertificadoConclusaoPDF.tsx      ← PDF certificado de conclusão
│   │   ├── FacturaPDF.tsx                   ← PDF factura
│   │   └── FacturaTalao.tsx                 ← PDF talão de factura
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   └── refresh-jwt/route.ts         ← Recarrega dados do DB e atualiza JWT
│   │   ├── auth/refresh-jwt/route.ts
│   │   ├── estudante/
│   │   │   ├── perfil/route.ts
│   │   │   ├── disciplinas/route.ts
│   │   │   ├── notas/route.ts
│   │   │   ├── notas-resumo/route.ts
│   │   │   ├── horario/route.ts
│   │   │   ├── plano-provas/route.ts
│   │   │   ├── monografia/
│   │   │   │   ├── route.ts
│   │   │   │   └── upload/route.ts
│   │   │   ├── premonografia/route.ts
│   │   │   ├── solicitacao-orientacao/route.ts
│   │   │   ├── certificados/
│   │   │   │   ├── route.ts
│   │   │   │   └── pedir/route.ts
│   │   │   ├── declaracao/
│   │   │   │   ├── route.ts
│   │   │   │   ├── pdf/route.ts
│   │   │   │   └── [id]/pdf/route.ts
│   │   │   ├── certificado/
│   │   │   │   ├── conclusao/pdf/route.ts
│   │   │   │   └── disciplinas/pdf/route.ts
│   │   │   ├── pagamentos/
│   │   │   │   ├── route.ts
│   │   │   │   └── confirmar/route.ts
│   │   │   └── servicos/
│   │   │       ├── route.ts
│   │   │       └── confirmar/route.ts
│   │   ├── notas/route.ts                   ← POST criar/actualizar nota
│   │   ├── orientador/
│   │   │   ├── disciplinas/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/estudantes/route.ts
│   │   │   ├── solicitacoes/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── monografias/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── download/route.ts
│   │   │   └── premonografia/[id]/route.ts
│   │   ├── gestor/
│   │   │   ├── resumo/route.ts
│   │   │   ├── estudantes/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   │       └── notas/[id_nota]/route.ts
│   │   │   ├── disciplinas/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/estudantes/route.ts
│   │   │   │   ├── [id]/professores/route.ts
│   │   │   │   └── disponiveis/route.ts
│   │   │   ├── orientadores/
│   │   │   │   ├── route.ts
│   │   │   │   └── lista/route.ts
│   │   │   ├── monografias/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── premonografia/[id]/route.ts
│   │   │   ├── horario/route.ts
│   │   │   ├── plano-provas/route.ts
│   │   │   ├── periodo-provas/route.ts
│   │   │   ├── curriculo/route.ts
│   │   │   ├── cursos/route.ts
│   │   │   ├── pipeline-consistency/route.ts
│   │   │   └── pipeline-report/route.ts
│   │   ├── recepcionista/
│   │   │   ├── me/route.ts
│   │   │   ├── estudante/
│   │   │   │   ├── route.ts                ← Pesquisa de estudantes
│   │   │   │   └── [id]/route.ts
│   │   │   ├── emitir/route.ts             ← Emitir facturas
│   │   │   ├── auditar/
│   │   │   │   ├── impressao/route.ts
│   │   │   │   └── contagem/route.ts
│   │   │   ├── factura/entregar/route.ts
│   │   │   ├── estudantes/[id]/declaracao/pdf/route.ts
│   │   │   └── certificados/[id]/pdf/route.ts
│   │   ├── admin/
│   │   │   ├── estudantes/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── orientadores/route.ts
│   │   │   ├── cursos/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── departamentos/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── disciplinas/route.ts
│   │   │   ├── pagamentos/route.ts
│   │   │   ├── propinas/[id]/route.ts
│   │   │   ├── recepcionistas/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── admins/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── stats/route.ts
│   │   │   ├── config/
│   │   │   │   ├── taxas/route.ts
│   │   │   │   ├── servicos/route.ts
│   │   │   │   └── precos-curso/route.ts
│   │   │   ├── gerar-propinas/route.ts
│   │   │   ├── gerar-propinas-falta/route.ts
│   │   │   ├── assinaturas/
│   │   │   │   ├── presidente/route.ts
│   │   │   │   ├── gestor/route.ts
│   │   │   │   └── diretor/route.ts
│   │   │   ├── layout-documentos/
│   │   │   │   ├── route.ts
│   │   │   │   └── [tipo]/route.ts
│   │   │   └── sistema/
│   │   │       ├── config/route.ts
│   │   │       ├── finalistas/route.ts
│   │   │       ├── semestre/route.ts
│   │   │       ├── registos/route.ts
│   │   │       ├── simulador/route.ts
│   │   │       └── suspender-sem-rematricula/route.ts
│   │   ├── verificar/
│   │   │   └── [id]/route.ts               ← Verificar documento por código
│   │   └── audit/route.ts
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx
├── lib/
│   ├── auth.ts                              ← Config NextAuth + JWT callbacks
│   ├── prisma.ts                            ← Prisma client singleton
│   ├── audit.ts                             ← Helper logAudit()
│   ├── notas.ts                             ← calcularNotaFinal()
│   ├── sistema.ts                           ← getAnoLectivo(), getSemestreAtual(), getSystemDate()
│   ├── precos.ts                            ← getPrecoEstudante(), getPrecosGlobais() (com bolsas)
│   ├── propinas.ts                          ← Geração de propinas
│   ├── multa-atraso.ts                      ← Cálculo de multa por atraso
│   ├── reenrollment.ts                      ← processarRematricula(), suspenderEstudantesSemRematricula()
│   ├── atribuirDisciplinas.ts               ← atribuirDisciplinasAoEstudante()
│   ├── verificarConflitos.ts                ← Conflitos de professor (horário + provas)
│   ├── servicos-tipos.ts                    ← Tipos de serviços
│   ├── layout-defaults.ts                   ← Layouts padrão para documentos PDF
│   ├── phone.ts                             ← Formatação de telefone
│   ├── minio.ts                             ← (opcional) MinIO client
│   └── not used/                            ← (código legacy removido)
├── prisma/
│   ├── schema.prisma                        ← 37 modelos + 17 enums
│   ├── seed.ts                              ← Seed principal (simplificado)
│   ├── seed-base.ts                         ← Dados base (departamentos, cursos, admin)
│   ├── seed-estudantes.ts                   ← Estudantes + notas
│   ├── seed-propinas.ts                     ← Propinas/mensalidades
│   ├── seed-registos.ts                     ← Registos académicos
│   ├── seed-semestre.ts                     ← Config semestre
│   ├── seed-rematricula.ts                  ← Rematrícula
│   ├── seed-snapshot-finalizados.ts         ← Snapshot de estudantes finalizados
│   ├── seed-fix-ano-lectivo.ts
│   ├── seed-fix-curriculo.ts
│   ├── seed-fix-estudantes-disciplinas.ts
│   ├── seed-limpar-estudantes.ts
│   ├── seed-limpar-notas-futuras.ts
│   ├── fix-curriculo-duplicado.ts
│   ├── fix-disciplinas-retroativo.ts
│   ├── fix-estudantes.ts
│   ├── fix-notas-arredondamento.ts
│   ├── fix-notas-incorretas.ts
│   ├── fix-notas-limpeza.ts
│   ├── fix-propinas-transfer.ts
│   └── migrations/
├── uploads/
│   ├── monografias/{student_id}/
│   └── premonografias/{student_id}/
├── docs/
│   ├── audit-pipeline-monografia.md
│   ├── credenciais-seed.md
│   ├── deploy-checkpoint.md
│   ├── deploy-guide.md
│   ├── layout-documentos-pdf.md
│   ├── pagamentos-audit-fixes.md
│   ├── seed-sistema-simulado.md
│   └── sistema-cores-acessibilidade.md
├── middleware.ts
├── .env
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 5. Environment Variables (.env)

```env
# SGE Atlântida - Environment Variables

# Neon Pooled URL (for runtime - app uses this)
DATABASE_URL=postgresql://user:password@ep-xxxx-pooler.c.region.aws.neon.tech/db?sslmode=require

# Neon Direct URL (for Prisma migrations)
DIRECT_URL=postgresql://user:password@ep-xxxx.c.region.aws.neon.tech/db?sslmode=require

NEXTAUTH_SECRET=sge-atlantida-secret-key-2026
NEXTAUTH_URL=http://localhost:3000
```

---

## 6. Key Configuration Files

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
    "/verificar/:path*",
  ],
}
```

### lib/auth.ts

Configura NextAuth com estratégia JWT, incluindo `nome_usuario`, `role`, `e_gestor` no token e session callbacks. Inclui endpoint `/api/auth/refresh-jwt` para recarregar dados do DB e actualizar a sessão após edição de perfil.

---

## 7. Database Schema (37 modelos + 17 enums)

### Enums

| Enum                | Values                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| TipoUsuario         | admin\| estudante \| orientador \| recepcionista                            |
| EstadoEstudante     | EmCurso\| Finalizado \| Desistente \| Suspendido                            |
| EstadoMonografia    | Submetida\| EmRevisao \| Aprovada \| ParaDefender \| Defendida \| Rejeitada |
| EstadoPremonografia | Proposto\| Aprovado \| Reprovado \| Cancelado                               |
| EstadoSolicitacao   | Pendente\| Aceite \| Recusado \| Cancelado                                  |
| EstadoFactura       | Pendente\| Pago \| Atrasado                                                 |
| EstadoNotaCobranca  | Pendente\| Pago \| Negociado                                                |
| FormaPagemento      | Multicaixa\| Transferencia \| Dinheiro                                      |
| TipoCertificado     | Conclusao\| Disciplina \| Participacao                                      |
| StatusCertificado   | Solicitado\| EmPreparacao \| ProntoParaLevantamento \| Entregue             |
| TurnoRecepcionista  | Manha\| Tarde \| Noite                                                      |
| Semestre            | S1\| S2                                                                     |
| TipoAvaliacao       | Normal\| Recurso \| Especial                                                |
| TipoBolsa           | Nenhuma\| Cinquenta \| Cem                                                  |
| EmitidoPor          | sistema\| estudante                                                         |
| TipoFaseAvaliacao   | AC\| PP1 \| TTP_PP2 \| Exame \| Recurso_ExameEspecial                       |
| TipoDocumentoLayout | CertificadoConclusao\| DeclaracaoAcademica \| CertificadoDisciplinas        |

### Core Tables

| Model                                         | Description                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Usuario**                             | Base user — all roles (admin, estudante, orientador, recepcionista) share this                     |
| **Admin**                               | Admin profile (nome_completo, telefone)                                                             |
| **Orientador**                          | Professor profile (nome_completo, especialidade, e_gestor, id_departamento)                         |
| **Estudante**                           | Student profile (nome_completo, numero_estudante, id_curso, ano_current, turno, estado, tipo_bolsa) |
| **Recepcionista**                       | Receptionist profile (nome_completo, turno)                                                         |
| **Departamento**                        | Academic department                                                                                 |
| **Curso**                               | Course (nome, duracao_anos, turnos)                                                                 |
| **Disciplina**                          | Subject (nome, codigo, creditos, id_departamento, tem_dispensa, nota_dispensa)                      |
| **CursoDisciplina**                     | N:N Curso→Disciplina with ano_curricular + semestre                                                |
| **ProfessorDisciplina**                 | Teacher assignment to discipline (id_usuario, id_disciplina, ano_lectivo, semestre)                 |
| **Nota**                                | Full grade record (AC1-3, TTP, PP1-2, Exame, Recurso, Especial, nota_final)                         |
| **Monografia**                          | Monograph/thesis                                                                                    |
| **MonografiasParaCorrecao**             | N:N Monografia→Orientador (correction assignments)                                                 |
| **Premonografia**                       | Pre-project                                                                                         |
| **SolicitacaoOrientacao**               | Advisor request (estudante→orientador)                                                             |
| **Factura**                             | Invoice for services                                                                                |
| **PagamentoPropina**                    | Monthly tuition payment (with Multicaixa confirmation code)                                         |
| **NotaCobranca**                        | Debt collection notice                                                                              |
| **ConfiguracaoTaxas**                   | Singleton: global fee config (propina fallbacks per year, multa, taxa reenrollment, duracao_aula)   |
| **PrecoCurso**                          | Per-course pricing (propina + multa by curricular year)                                             |
| **Servico**                             | Dynamic services (nome, valor, activo)                                                              |
| **Certificado**                         | Certificate request/status                                                                          |
| **CertificadoDisciplinas**              | N:N Certificado→Disciplina                                                                         |
| **Declaracao**                          | Academic declaration with QR verification code                                                      |
| **HorarioAula**                         | Weekly class schedule (curso, turno, dia, hora, sala)                                               |
| **PlanoProva**                          | Exam calendar (PP1, PP2, Exame, Recurso, Especial)                                                  |
| **PeriodoProva**                        | Exam period date range                                                                              |
| **SistemaConfig**                       | Singleton: system config (ano lectivo, matricula window, simulador, semestre_atual)                 |
| **FaseAvaliacao**                       | Evaluation phase control (AC, PP1, TTP/PP2, Exame, Recurso/Especial)                                |
| **SnapshotSemestre**                    | Semester snapshots for re-enrollment & finalization                                                 |
| **AuditLog**                            | Audit trail (quem, quando, IP, valor antes/depois)                                                  |
| **AssinaturaGestor**                    | Gestor signature image per departamento                                                             |
| **AssinaturaPresidente**                | President signature image                                                                           |
| **AssinaturaDiretor**                   | Director signature image                                                                            |
| **LayoutDocumento**                     | Document layout templates (JSON content)                                                            |
| **CurriculoAcademico**                  | Student's academic curriculum per year                                                              |
| **EstatisticasMonografiasDepartamento** | Department monograph statistics                                                                     |

### Nota Model (full structure)

```prisma
model Nota {
  id_nota        Int           @id @default(autoincrement())
  id_estudante   Int
  id_disciplina  Int
  ano_lectivo    String        @db.VarChar(9)
  semestre       Semestre      @default(S1)

  // Avaliação Contínua
  ac1            Decimal?      @db.Decimal(4, 2)
  ac2            Decimal?      @db.Decimal(4, 2)
  ac3            Decimal?      @db.Decimal(4, 2)
  ttp            Decimal?      @db.Decimal(4, 2)
  pp1            Decimal?      @db.Decimal(4, 2)
  pp2            Decimal?      @db.Decimal(4, 2)

  // Exames
  exame          Decimal?      @db.Decimal(4, 2)
  recurso        Decimal?      @db.Decimal(4, 2)
  exame_especial Decimal?      @db.Decimal(4, 2)

  // Resultado
  nota_final     Decimal?      @db.Decimal(4, 2)
  dispensada     Boolean       @default(false)
  tipo_avaliacao TipoAvaliacao @default(Normal)
}
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

### Edge cases do cálculo

- AC incompleto (ex: só AC1 e AC2 lançados, AC3 null) → não calcular `nota_final`, manter `null`
- `tem_dispensa = false` → ignorar threshold, ir sempre a exame independentemente da nota AC
- Recurso lançado sem exame prévio → bloquear na API (validação obrigatória)
- `exame_especial` lançado → substitui tudo, não combina com nada

---

## 8. Payment System

### Sistema de Preços Hierárquico

| Item              | Escopo                                                      |
| ----------------- | ----------------------------------------------------------- |
| Propina Mensal    | 🟠**ESPECIFICO POR CURSO e ANO** (via `PrecoCurso`) |
| Multa de Atraso   | 🟠**ESPECIFICO POR CURSO e ANO**                      |
| Taxa Monografia   | 🔵 GLOBAL IGUAL PARA TODOS                                  |
| Folhas de Prova   | 🔵 GLOBAL IGUAL PARA TODOS                                  |
| Taxa Rematrícula | 🔵 GLOBAL (via `ConfiguracaoTaxas.taxa_reenrollment`)     |

**Lógica de busca** (`lib/precos.ts`):

1. Sistema procura PRIMEIRO por preço definido especificamente para aquele curso e ano (`PrecoCurso`)
2. Se não encontrar valor definido, usa automaticamente o valor padrão global (`ConfiguracaoTaxas`)
3. Aplica desconto de bolsa se aplicável (50% ou 100%)

```typescript
import { getPrecoEstudante } from "@/lib/precos"
const { valor_propina, valor_com_desconto, valor_multa, tipo_bolsa, origem } = await getPrecoEstudante(id_estudante)
```

### Sistema de Bolsas

| Tipo      | Efeito                                   |
| --------- | ---------------------------------------- |
| Nenhuma   | Paga 100% do valor                       |
| Cinquenta | Paga 50% (metade) — sem multa de atraso |
| Cem       | Isento — não paga nada, sem multa      |

### Valores Padrão Globais (Fallback via ConfiguracaoTaxas)

| Year     | Monthly fee | Late fee |
| -------- | ----------- | -------- |
| 1st year | 15,000 Kz   | 500 Kz   |
| 2nd year | 20,000 Kz   | 500 Kz   |
| 3rd year | 25,000 Kz   | 500 Kz   |
| 4th year | 30,000 Kz   | 500 Kz   |
| 5th year | 35,000 Kz   | 500 Kz   |
| 6th year | 40,000 Kz   | 500 Kz   |

### Monthly Propina Flow

1. 1st of month → system generates payment record for every active student
2. Valor da propina é obtido automaticamente via `getPrecoEstudante()` com o valor correcto do curso
3. Student logs in → sees current month reference code and amount
4. If today > 10th and unpaid → late fee added automatically
5. Student takes reference to Multicaixa Express and pays
6. Student enters 3-digit confirmation code → system validates → flips to `Pago`

### Reference Format

```
PROP-{YEAR}-{MONTH}-{STUDENT_INITIALS}-{3_DIGIT_CODE}
Example: PROP2026-04-BEN-847
```

### Duplicate Payment Protection

Before confirming a payment, the API checks if a `Pago` record already exists for the same `mes + ano + id_estudante`. If so, returns `400` error.

### Payment confirmation security

The confirmation endpoint uses `id_estudante` from the session, not from the request body.

### What gets BLOCKED when payment is Pendente

- Cannot request an orientador
- Cannot download certificates
- Cannot submit monografia
- Cannot see grades for current year

### What stays ACCESSIBLE when Pendente

- Login, profile, payment reference
- Grades from all previous years

### Receptionist handles ONLY

- Caderneta payments, monografia fee, physical certificate pickup confirmation
- Multiple folhas de prova (with quantity selector modal)

### Document Printing Limit

- **Documentos** (certificado de conclusão / declaração académica): **máximo 2 impressões por factura**
- **Faturas**: sem limite de impressões
- **Propinas**: sem limite de impressões
- Cada impressão é registada no `AuditLog`

---

## 9. Business Logic Rules

### Year Progression / Re-enrollment

- Student advances when **ALL** subjects of current year have `nota_final >= 10` (max 2 failed subjects from any single curricular year)
- **Path A — Passou tudo**: avança para o ano seguinte + atribui novas disciplinas
- **Path B — Reprovou**: repete o ano, só as disciplinas falhadas são resetadas (notas anteriores preservadas em Snapshot)
- Snapshot realizado antes de qualquer mudança (`SnapshotSemestre`)
- Final year students cannot re-enroll (must pay monografia fee)
- Admin can manually suspend students who haven't re-enrolled (`suspenderEstudantesSemRematricula`)

### Grade System

- **Scale:** 0–20 · **Passing:** 10+
- **Dispensa:** if `tem_dispensa = true` and `nota_final_ac >= nota_dispensa (14)` → dispensed from exam
- **Exam chain:** AC → *(if < 10 or no dispensa)* → Exame → *(if < 10)* → Recurso → *(if < 10)* → Exame Especial
- **Recurso / Exame Especial:** nota seca (raw score), maximum 12, replaces `nota_final` directly
- Every grade change writes to `AuditLog`

### Grade Access Control

- **Orientador** → só lança/edita notas das disciplinas em `ProfessorDisciplina` com o seu `id_usuario` e o ano lectivo corrente
- **Gestor** → lança/edita notas de qualquer disciplina do seu departamento
- Nenhum dos dois pode editar notas de anos lectivos anteriores (validar na API)
- Bloqueio de notas para anos futuros: não permite lançar nota para disciplina cujo ano curricular > ano actual do estudante

### Grade Computing (from CursoDisciplina)

O ano curricular e semestre das disciplinas vêm do `CursoDisciplina` (tabela que liga curso à disciplina), **não** dos campos fixos da tabela `Disciplina`. Uma disciplina pode estar no 2º ano do Curso A e no 3º ano do Curso B.

### Average Calculation

- **Média por ano:** simple average of all subjects with `nota_final` — dispensadas count with `nota_final_ac`, em curso count with nota parcial
- **Média geral:** average of the yearly averages (only years with a calculated média)

### Conflitos de Professor

| Regra                                                                                           | Estado          |
| ----------------------------------------------------------------------------------------------- | --------------- |
| Professor não pode leccionar duas disciplinas ao mesmo tempo (mesmo em cursos diferentes)      | ✅ Implementado |
| Apenas PP1 e PP2 verificados para conflitos (Exame/Recurso/Especial são vigiados por proctors) | ✅ Implementado |
| Verificação cross-curso                                                                       | ✅ Implementado |
| Exclui apenas a mesma disciplina + curso + ano + semestre                                       | ✅ Implementado |

### Monografia Workflow

```
Submetida → EmRevisao → Aprovada → ParaDefender → Defendida
                    ↓
                  Rejeitada
```

- **Pré-projecto:** orientador NÃO é obrigatório (estudante pode submeter sem orientação)
- **Monografia:** orientador É obrigatório (só submete se tiver orientação aceite + propina paga)
- **Co-autor e Co-orientador:** campos opcionais, texto livre
- **Download:** orientador e gestor podem baixar o PDF
- Gestor agenda defesa e atribui nota final
- Pré-projecto Reprovado pode ser resubmetido

### Monografia Access Rules

- Estudante só pode submeter se: `ano_current = 4` + orientação `Aceite` + propina `Pago`
- Orientador só revé monografias dos seus estudantes (`MonografiasParaCorrecao`)
- Gestor agenda defesa e atribui nota final de qualquer monografia do departamento

### Horário de Aulas

- Turnos: Matinal (08:00-13:00), Vespertino (13:00-18:00), Noturno (18:00-23:00)
- Duração e intervalo configuráveis no Admin (`ConfiguracaoTaxas`)
- Cálculo automático de horários baseado na posição (1ª, 2ª, 3ª...)
- Unique constraint: `[id_curso, ano_curricular, semestre, turno, dia_semana, hora_inicio, ano_lectivo]`

### Plano de Provas

- Tipos: PP1, PP2, Exame, Recurso, Exame_Especial
- Unique constraint: `[id_curso, id_disciplina, ano_curricular, semestre, tipo_prova, turno, ano_lectivo]`
- Timezone fix: backend usa `T12:00:00` (meio-dia) para evitar UTC shift

### Sistema de Gestão de Administradores

- Nome de utilizador gerado automaticamente (primeiro nome + último sobrenome)
- Senha padrão: `admin123`
- Ações: reset password, remover administrador

### Gestão de Orientadores Admin

- Barra de pesquisa + filtro por departamento + curso
- Ao marcar como gestor, verifica se já existe gestor no departamento
- Se existir, mostra modal de confirmação para substituir

### Documentos / Assinaturas / Verificação

- Declarações académicas com código único de verificação (`DECL-{ano}-{numero}-{seq}`)
- Página pública `/verificar/[id]` para validar documentos por QR code
- Conteúdo dinâmico por tipo de documento na página de verificação:
  - **Declaração Académica:** mostra Nome, Matrícula, Curso, Ano Lectivo, Ano Curricular, Estado do estudante (EmCurso/Finalizado/Desistente/Suspendido) com badge colorido
  - **Certificado de Disciplinas:** mostra tabela completa das disciplinas (Disciplina, Semestre, Ano Curricular, Nota Final, Situação) — permite ao verificador confirmar se o PDF foi adulterado
  - **Certificado de Conclusão:** mostra Nota Final (numérica em destaque) + Nota por extenso — sem notas de anos anteriores
- Animações: loading com scanner QR animado, fade-in do card, scale-in no selo de verificação, shake no erro
- Design escuro com glassmorphism (backdrop-filter: blur), gradiente no fundo
- Selo "Documento verificado digitalmente" no footer
- Assinaturas: Presidente, Gestor (por departamento), Director — upload de imagem
- Layouts de documentos configuráveis via JSON

---

## 10. Test Credentials (after running seed)

| Role                      | Email                       | Password       | Contexto                                                     |
| ------------------------- | --------------------------- | -------------- | ------------------------------------------------------------ |
| Admin                     | admin@ispatlantida.ao       | admin123       | —                                                           |
| Student (2º ano)         | estudante@ispatlantida.ao   | student123     | Ben — notas e pagamentos                                    |
| Student (4º ano)         | ana@ispatlantida.ao         | student4ano123 | Ana Silva — monografia e certificados                       |
| Student (4º ano)         | carlos@ispatlantida.ao      | student4ano123 | Carlos Manuel — monografia (orientador: Prof. João)        |
| Orientador                | orientador@ispatlantida.ao  | orientador123  | Prof. Walter Neto — com funções de gestor (e_gestor=true) |
| Orientador 2 (NOT gestor) | orientador2@ispatlantida.ao | orientador123  | Prof. João Mendes — sem funções de gestor                |
| Receptionist              | recepcao@ispatlantida.ao    | recepcao123    | —                                                           |

> Payment confirmation code: visible in terminal after seed or via `npx prisma studio` → table `PagamentoPropina`.

---

## 11. Seed Data

O sistema usa múltiplos ficheiros de seed para organização:

| File                                    | Purpose                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `prisma/seed-base.ts`                 | Dados base: departamento, curso, admin, orientadores, recepcionista, preços |
| `prisma/seed-estudantes.ts`           | Estudantes com notas, disciplinas, currículo académico                     |
| `prisma/seed-propinas.ts`             | Propinas/mensalidades                                                        |
| `prisma/seed-registos.ts`             | Registos académicos                                                         |
| `prisma/seed-semestre.ts`             | Configuração de semestre                                                   |
| `prisma/seed-rematricula.ts`          | Rematrícula                                                                 |
| `prisma/seed-snapshot-finalizados.ts` | Snapshot de estudantes finalizados                                           |
| `prisma/seed.ts`                      | Seed principal que chama os seeds acima                                      |

Run with: `npx tsx prisma/seed.ts`

### Currently creates

- 1 department, 1 course (Engenharia Informática, 4 anos)
- 6 propina fallback prices (one per year)
- 15+ subjects across 4 years
- 1 admin, 2 orientadores (1 with e_gestor=true), 1 recepcionista
- Multiple students with different profiles

> All seeds use `upsert` — safe to re-run without duplicating data.

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

- [X] Perfil: nome, curso, ano actual, estado da propina
- [X] Seletor de ano/semestre com disciplinas da BD
- [X] Banner de propina pendente com referência e valor
- [X] API `GET /api/estudante/perfil`
- [X] API `GET /api/estudante/disciplinas?ano=&semestre=`

#### Notas (/estudante/notas)

- [X] Tabela agrupada por Ano → Semestre
- [X] Badge: Aprovado / Reprovado / Dispensado / Em Curso
- [X] Nota parcial a amarelo para disciplinas em curso
- [X] Painel expandido: componentes AC + cadeia de exames com setas
- [X] Nota seca identificada para recurso e especial
- [X] Média por ano + Média geral
- [X] Notas do ano corrente bloqueadas se propina pendente
- [X] API `GET /api/estudante/notas`

#### Pagamentos (/estudante/pagamentos)

- [X] Resumo: total em dívida, pagamentos pendentes, pagamentos efectuados
- [X] Histórico completo ordenado
- [X] Estado: Pendente / Atrasado / Pago com cores
- [X] Valor base + multa separados
- [X] Referência Multicaixa + código de 3 dígitos
- [X] Protecção contra pagamento duplicado
- [X] API `GET /api/estudante/pagamentos`
- [X] API `POST /api/estudante/pagamentos/confirmar`

#### Monografia (/estudante/monografia)

- [X] Submeter pré-projecto e monografia
- [X] Upload de PDF (máx 10MB)
- [X] Co-autor e Co-orientador
- [X] API `GET /api/estudante/monografia`
- [X] API `POST /api/estudante/monografia/upload`
- [X] API `POST /api/estudante/premonografia`

#### Certificados (/estudante/certificados)

- [X] Lista de certificados + pedir novo
- [X] Download PDF
- [X] Certificado de Disciplinas + Conclusão
- [X] API `GET /api/estudante/certificados`
- [X] API `POST /api/estudante/certificados/pedir`

#### Horário (/estudante/horario)

- [X] Grade semanal do estudante (por turno)
- [X] Disciplinas pendentes de anos anteriores
- [X] Nome do professor por disciplina
- [X] API `GET /api/estudante/horario`

#### Serviços (/estudante/servicos)

- [X] Comprar serviços (declarações, etc.)
- [X] Confirmar pagamento
- [X] API `GET /api/estudante/servicos`
- [X] API `POST /api/estudante/servicos/confirmar`

---

### Module 2 — Grade Management ✅ COMPLETO

- [X] Modelo `ProfessorDisciplina` no schema
- [X] Seed com disciplinas atribuídas (BD1, RC1, SO1)
- [X] `lib/audit.ts` — helper logAudit()
- [X] `lib/notas.ts` — calcularNotaFinal()
- [X] Dashboard do orientador com edição inline
- [X] Dashboard do gestor com visão geral
- [X] `/gestor/estudantes` + `/gestor/disciplinas`
- [X] Edição inline de notas com pré-visualização
- [X] Filtros por curso, ano, semestre, turno
- [X] Gestão de professores responsáveis (1 por disciplina)
- [X] Conflitos de professor (horário + provas)
- [X] Correção: ano/semestre vindo do CursoDisciplina (não da Disciplina)
- [X] Bloqueio de notas para anos futuros

#### Plano Escolar (Horário + Provas)

- [X] `/gestor/horario` — grade semanal com turno, impressão
- [X] `/gestor/plano-provas` — calendário de provas, impressão
- [X] `/gestor/curriculo` — gestão do currículo
- [X] API CRUD completo para horário, provas, período
- [X] Turnos configuráveis no curso
- [X] Duração/intervalo configurável no admin

---

### Module 3 — Monografia Workflow ✅ COMPLETO

#### Estudante

- [X] `/estudante/orientador` — pedir orientação
- [X] Ver estado do pedido
- [X] API `POST/GET /api/estudante/solicitacao-orientacao`

#### Orientador

- [X] `/orientador/solicitacoes` — aceitar/rejeitar
- [X] `/orientador/monografias` — rever, feedback
- [X] APIs completas

#### Gestor

- [X] `/gestor/monografias` — agendar defesa, nota final
- [X] Pipeline visual de monografias
- [X] APIs completas

---

### Module 4 — Recepcionista ✅ COMPLETO

- [X] `/recepcionista` — pesquisa de estudante (debounce)
- [X] `/recepcionista/estudante/[id]` — detalhe completo
- [X] Confirmar levantamento de certificado
- [X] Registar pagamento de folhas de prova (quantidade múltipla)
- [X] Registar pagamento de taxa de monografia
- [X] Limite de 2 impressões por documento
- [X] APIs completas

---

### Module 5 — Admin ✅ 100% COMPLETO

- [X] Dashboard com stats
- [X] Gestão de Estudantes (CRUD + notas + pagamentos)
- [X] Gestão de Orientadores (pesquisa, filtros, gestor)
- [X] Gestão de Recepcionistas
- [X] Gestão de Administradores
- [X] Gestão de Cursos (com preços por ano)
- [X] Gestão de Disciplinas
- [X] Gestão de Departamentos (com gestor)
- [X] Gestão de Pagamentos
- [X] Preços Globais + Serviços + Horário
- [X] Audit Log (filtros avançados, cartões de contexto)
- [X] Sistema: Ano Lectivo, Semestre, Finalistas, Layout Documentos, Assinaturas, Registos
- [X] Simulador de data do sistema

---

## 14. Extra Features (Post-Completion)

### Rematrícula

- [X] `lib/reenrollment.ts` — `processarRematricula()` com snapshot
- [X] Avanço de ano (com atribuição automática de disciplinas)
- [X] Repetição de ano (reset só das disciplinas falhadas)
- [X] Suspensão de estudantes sem rematrícula
- [X] SnapshotSemestre para preservar dados antes da mudança

### Documentos e Assinaturas

- [X] Declarações académicas com código de verificação
- [X] Página pública `/verificar/[id]`
- [X] Conteúdo dinâmico na verificação: estado/ano na declaração, tabela disciplinas no cert. disciplinas, nota final no cert. conclusão
- [X] Animações: scanner QR loading, fade-in, scale-in, shake no erro
- [X] Design escuro com glassmorphism e gradiente
- [X] Assinaturas: Presidente, Gestor (por departamento), Director
- [X] Layouts de documentos configuráveis (JSON)
- [X] PDFs com @react-pdf/renderer

### Configuração de Preços por Curso

- [X] `PrecoCurso` — preço de propina e multa por curso + ano
- [X] Admin pode configurar no modal de edição de cursos
- [X] Fallback para valores globais se não houver específico

### Serviços Dinâmicos

- [X] `Servico` — nome, descrição, valor, activo
- [X] Admin pode criar/editar/desactivar serviços
- [X] Estudante compra e confirma pagamento

### Sistema de Bolsas

- [X] `TipoBolsa`: Nenhuma, Cinquenta (50%), Cem (100%)
- [X] Isenção de multa para bolseiros
- [X] Desconto automático no cálculo da propina

### Gestão Centralizada (Admin + Gestor)

- [X] `app/admin/adminNav.ts` — fonte única de navegação admin
- [X] `app/gestor/gestorNav.ts` — navegação gestor com dropdown

---

## 15. Component Architecture

### DashboardLayout (shared by all roles)

**Props:** `navItems`, `title`, `subtitle?`, `children`
**Contains:** Sidebar (brand + nav + logout) · Topbar · Content area
Active nav item detected via `usePathname()` — highlights automatically

✅ Detecta automaticamente sessão expirada e redireciona para login.

### Pattern for each page

```
app/[role]/page.tsx           → server component, auth check, renders Dashboard
app/[role]/[Role]Dashboard    → client component, fetches from API, renders UI
app/api/[resource]/route.ts   → auth check → role check → prisma query → JSON
```

### AuditLog helper (lib/audit.ts)

```ts
export async function logAudit({ id_usuario, acao, tabela, id_registro, valor_antes, valor_depois, ip_address }) {
  await prisma.auditLog.create({
    data: {
      id_usuario, acao, tabela, id_registro,
      valor_antes: valor_antes ? JSON.stringify(valor_antes) : null,
      valor_depois: valor_depois ? JSON.stringify(valor_depois) : null,
      ip_address, criado_em: new Date()
    }
  })
}
```

### Grade calculation helper (lib/notas.ts)

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
  if (exame != null) return { nota_final: nota_final_ac * 0.4 + exame * 0.6, tipo: "Normal" }
  // AC completo mas sem exame
  return { nota_final: null, tipo: "Normal" }
}
```

---

## 16. UI Design System

| Token      | Value                      |
| ---------- | -------------------------- |
| Background | `#0d0f14`                |
| Card       | `#1e2230`                |
| Sidebar    | `#13161e`                |
| Primary    | `#e03d3d` (red)          |
| Secondary  | `#f0a500` (gold)         |
| Teal       | `#2dd4bf`                |
| Text       | `#e8eaf0`                |
| Muted      | `#9098b0`                |
| Dim        | `#555e78`                |
| Border     | `rgba(255,255,255,0.07)` |
| Font       | `system-ui`              |

### Status Colours

| State                            | Colour      |
| -------------------------------- | ----------- |
| Pass / Paid / Active             | `#22c55e` |
| Pending / Warning / Nota parcial | `#f0a500` |
| Fail / Late / Error              | `#e03d3d` |
| Dispensado / Info                | `#2dd4bf` |
| Em curso / Sem nota              | `#555e78` |
| Exame Especial                   | `#9b59b6` |

---

## 17. Dificuldades e Lições Aprendidas

### 🚫 **Next.js 15 App Router — `params` é uma Promise**

Todos os endpoints API que recebiam `params.id` deixaram de funcionar pois agora `params` é uma `Promise`.

> ✅ **Solução:** Adicionar `const resolvedParams = await params` ANTES de aceder a qualquer propriedade.

### 🚫 **Prisma Decimal — Bug `Number(null) = 0`**

`Number(null)` retorna 0 em JavaScript, que é uma nota válida.

> ✅ **Solução:** Sempre verificar com `!= null` ANTES de converter para Number.

### 🚫 **TurboPack Hydration Errors**

O novo bundler do Next.js 15 causa vários erros de hidratação com datas e formatação.

> ✅ **Solução:** Remover fontes padrão Geist, formatar datas apenas dentro de `useEffect()`.

### 🚫 **Timezone UTC shift (Africa/Luanda UTC+1)**

`new Date("2025-03-17T00:00:00")` em UTC+1 vira 23:00 UTC do dia anterior.

> ✅ **Solução:** Usar `T12:00:00` (meio-dia) em vez de `T00:00:00` para evitar shift.

### 🚫 **Sidebar nav overflow**

Quando a sidebar tinha muitos itens, o logout ficava inacessível.

> ✅ **Solução:** `height: 100vh` + `overflow: hidden` no aside, `overflow-y: auto` no nav.

### 🚫 **JWT não atualiza após edição de perfil**

### 🚫 **Disciplinas aparecem no ano/semestre errado**

O código usava `Disciplina.ano_curricular` em vez de `CursoDisciplina.ano_curricular`.

> ✅ **Solução:** Corrigido em 6 ficheiros para usar valores do CursoDisciplina.

### 🚫 **Edição de notas — valores sobrescritos com null**

> ✅ **Solução:** API PUT ignora null, frontend faz fetch directo após save.

### 🚫 **@react-pdf/renderer v4 — Erro React #31 na Vercel**

O `renderToBuffer()` do `@react-pdf/renderer` v4.3.2 causa erro React #31 no servidor da Vercel (Next.js 15 + React 19). O motor interno `react-reconciler` conflita com a versão do React usada pelo servidor.

> ✅ **Solução:** Gerar PDFs no **browser do cliente** (recepcionista) em vez do servidor. O `@react-pdf/renderer` funciona perfeitamente no browser.

**Ficheiros criados:**

| Ficheiro | Função |
|----------|--------|
| `app/lib/pdf-generator-browser.tsx` | Geração de PDF no browser com `pdf().toBlob()` |
| `app/api/recepcionista/certificados/[id]/dados/route.ts` | API que retorna dados do certificado |
| `app/api/recepcionista/declaracoes/[id]/dados/route.ts` | API que retorna dados da declaração |

**Fluxo actual:**
1. Recepcionista clica em "🖨️ Imprimir"
2. Browser busca dados do documento via API (`/dados`)
3. Browser gera o PDF usando `pdf().toBlob()` (import dinâmico)
4. Abre o PDF automaticamente para impressão

**Ficheiros obsoletos (mantidos mas não usados):**
- `app/api/recepcionista/certificados/[id]/pdf/route.ts`
- `app/api/recepcionista/declaracoes/[id]/pdf/route.ts`
- `app/lib/render-pdf-helper.tsx`

---

## 18. Current State

### Completed

- [X] Full project scaffolded (Next.js 15 + TypeScript + Tailwind)
- [X] PostgreSQL database with 37 models + 17 enums
- [X] Production deploy on Vercel + Neon: [sge-atl-ntida.vercel.app](https://sge-atl-ntida.vercel.app/)
- [X] NextAuth JWT authentication + refresh-jwt + middleware
- [X] All 5 role dashboards (Admin, Gestor, Orientador, Recepcionista, Estudante)
- [X] Student: perfil, notas, pagamentos, monografia, certificados, horário, serviços
- [X] Orientador: disciplinas, solicitações, monografias, download
- [X] Gestor: estudantes, disciplinas, notas, horário, plano provas, currículo, monografias, pipeline
- [X] Recepcionista: pesquisa, emitir, auditar impressão
- [X] Admin: CRUD completo + sistema + audit + preços + assinaturas + documentos
- [X] Rematrícula com snapshot e suspensão
- [X] Sistema de bolsas (50% e 100%)
- [X] Conflitos de professor
- [X] Verificação de documentos com código único
- [X] Assinaturas digitais (presidente, gestor, diretor)
- [X] Audit logging completo em todas as operações
- [X] QR code verification on certificates and declarations
- [X] Production-ready with Vercel + Neon (QR codes, HTTPS, login fix)
