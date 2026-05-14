# Sistema de Semestres (S1 / S2) — Documentação

## Visão Geral

O SGE Atlântida suporta a simulação de **dois semestres lectivos** (S1 e S2) dentro de um ano lectivo.  
O semestre actual é controlado pelo Admin e afecta:

- O que os **estudantes** vêem (horários e provas)
- O que os **orientadores** podem aceder (disciplinas atribuídas)
- O que os **gestores** podem criar (horários e provas bloqueados para o semestre errado)
- A **transição automática** ao mudar de S1 → S2: snapshots + limpeza

---

## 1. Estrutura de Dados

### Schema (Prisma)

```prisma
model SistemaConfig {
  id_config               Int       @id @default(1)
  // ... outros campos ...
  semestre_atual          Semestre  @default(S1)   // "S1" | "S2"
}

enum Semestre {
  S1
  S2
}
```

Todas as tabelas que dependem de semestre têm um campo `semestre`:

| Tabela | Campo | Finalidade |
|--------|-------|------------|
| `CursoDisciplina` | `semestre` | Em que semestre a disciplina é leccionada |
| `Nota` | `semestre` | Semestre da nota do estudante |
| `ProfessorDisciplina` | `semestre` | Semestre em que o professor foi atribuído |
| `HorarioAula` | `semestre` | Semestre do horário |
| `PlanoProva` | `semestre` | Semestre da prova |
| `PeriodoProva` | `semestre` | Semestre do período de provas |
| `SnapshotSemestre` | `semestre` | Semestre do snapshot guardado |
| `FaseAvaliacao` | `semestre` | Semestre da fase de avaliação |

---

## 2. Funções Utilitárias (`lib/sistema.ts`)

```typescript
// Devolve o semestre actual (S1 ou S2) a partir da SistemaConfig
export async function getSemestreAtual(): Promise<"S1" | "S2">
```

- Se não existir config, retorna `"S1"` como fallback
- Usada por todas as APIs que precisam de filtrar por semestre

---

## 3. Admin — Controlo de Semestre

### Dashboard (`/admin/sistema/ano-lectivo`)

O dashboard `AnoLectivoDashboard.tsx` na secção **"Controlo de Semestre"** permite:

- **Ver** o semestre actual (S1 ou S2 destacado)
- **Mudar para S2** (com confirmação)
- **Bloqueio**: Não pode voltar de S2 para S1

### UI dos botões

```
[ 📖 Semestre 1 ]  → destacado se estiver em S1 (azul)
[ 📗 Semestre 2 ]  → destacado se estiver em S2 (laranja)
```

### Mensagem de confirmação ao mudar para S2

```
⚠️ Tens a certeza? Mudar para S2 vai:

1. Guardar snapshot dos orientadores (ProfessorDisciplina)
2. Guardar snapshot dos planos de prova e horários do S1
3. Apagar os dados do S1 para que possas re-atribuir
4. Os orientadores precisarão de ser re-atribuídos às disciplinas

Continuar?
```

---

## 4. API de Mudança de Semestre

### `POST /api/admin/sistema/semestre`

**Body:** `{ "semestre": "S2" }`

**Fluxo completo:**

```
1. Validar sessão (admin)
2. Validar que o semestre é "S1" → "S2" (não pode voltar)
3. Buscar ProfessorDisciplina do ano lectivo actual → snapshot
4. Buscar PlanoProva do S1 → snapshot
5. Buscar PeriodoProva do S1 → snapshot
6. Buscar HorarioAula do S1 → snapshot
7. Criar SnapshotSemestre (tipo "completo") com todos os dados
8. Apagar ProfessorDisciplina do ano lectivo actual
9. Apagar PlanoProva do S1
10. Apagar PeriodoProva do S1
11. Apagar HorarioAula do S1
12. Actualizar SistemaConfig.semestre_atual = "S2"
13. Registar no AuditLog
```

### `GET /api/admin/sistema/semestre`

Devolve `{ "semestre_atual": "S1" | "S2" }`

---

## 5. Modelo SnapshotSemestre

```prisma
model SnapshotSemestre {
  id_snapshot         Int       @id @default(autoincrement())
  id_estudante        Int
  ano_lectivo         String
  semestre            Semestre
  data_snapshot       DateTime  @default(now())
  notas_snapshot      Json?
  orientador_snapshot Json?     // Guarda ProfessorDisciplina
  provas_snapshot     Json?     // Guarda PlanoProva + PeriodoProva
  horarios_snapshot   Json?     // Guarda HorarioAula
  tipo                String    // "notas" | "orientador" | "provas" | "completo"
  criado_por          Int?
  estudante           Estudante @relation(...)
  usuario             Usuario?  @relation(...)
}
```

### Tipos de Snapshot

| Tipo | O que guarda | Quando é criado |
|------|-------------|-----------------|
| `completo` | ProfessorDisciplina + Planos + Períodos + Horários | Ao mudar S1 → S2 |
| `notas` | Notas do estudante | Ao fazer rematrícula (`processarRematricula`) |

### Página de Consulta

**Admin → Sistema → Registos Lectivo** (`/admin/sistema/registos`)

- Lista todos os snapshots paginados
- Filtros por: nome/ nº estudante, curso, turno, ano lectivo
- Expande para mostrar tabela detalhada de notas
- Identifica disciplinas reprovadas (nota_final < 10) com ✗

---

## 6. Efeitos em cada Perfil

### 6.1 Estudante

#### Horário (`/api/estudante/horario`)

```typescript
const semestre = await getSemestreAtual()
// Adicionado filtro: semestre no where do Prisma
```

- Se sistema em **S1**: mostra aulas do S1
- Se sistema em **S2**: mostra aulas do S2
- As notas (resumo) mostram S1 + S2 (para acompanhamento completo)

#### Plano de Provas (`/api/estudante/plano-provas`)

```typescript
const semestre = await getSemestreAtual()
// Adicionado filtro: semestre no where do Prisma
```

- Se sistema em **S1**: mostra provas do S1
- Se sistema em **S2**: mostra provas do S2

#### Dashboard

Mostra badge "Semestre Actual" com ícone:
- 📖 S1 (azul)
- 📗 S2 (laranja)

### 6.2 Orientador

#### Disciplinas (`/api/orientador/disciplinas`)

```typescript
const semestreAtual = await getSemestreAtual()
// Filtra ProfessorDisciplina por semestre actual
```

- Se sistema em **S1**: vê disciplinas do S1
- Se sistema em **S2**: vê disciplinas do S2 (que o gestor re-atribuir)
- Ao mudar S1 → S2: **perde todas as disciplinas** (apagadas da BD, guardadas em snapshot)

#### Dashboard

Mostra card **"Semestre Actual"** com cor correspondente.

### 6.3 Gestor

#### Atribuir Professor (`/api/gestor/disciplinas/[id]/professores`)

```typescript
const semestreAtual = await getSemestreAtual()
// Cria ProfessorDisciplina sempre no semestre actual
```

- Ao atribuir um professor, o registo fica no semestre actual
- Se sistema em S2, pode re-atribuir orientadores para o S2

#### Criar Horário (`/api/gestor/horario`)

```typescript
const semestreAtual = await getSemestreAtual()
if (semestre !== semestreAtual) {
  return 400: "Não podes criar horário para X porque o sistema está no Y"
}
```

- **Bloqueia** criação de horários para semestre diferente do actual
- GET permite seleccionar qualquer semestre (para consulta)

#### Criar Prova (`/api/gestor/plano-provas`)

```typescript
const semestreAtual = await getSemestreAtual()
if (semestre !== semestreAtual) {
  return 400: "Não podes criar provas para X porque o sistema está no Y"
}
```

- **Bloqueia** criação de provas para semestre diferente do actual
- GET permite seleccionar qualquer semestre (para consulta)

#### Dashboard

Mostra card **"Semestre Actual"** com cor correspondente.

### 6.4 Admin

#### Dashboard (`/admin`)

Mostra card **"Semestre Actual"** com cor correspondente (no grid de stats).

#### Página Ano Lectivo

Controlo completo do semestre + simulador de tempo.

---

## 7. Rematrícula e Semestre

### Fluxo de Rematrícula (`lib/reenrollment.ts`)

Quando um estudante paga a taxa de rematrícula:

1. **Snapshot** das notas do ano anterior
2. **Verifica aprovação** em todas as disciplinas
3. **Se aprovado**: avança de ano, atribui disciplinas **de todos os semestres** (S1 + S2) via `atribuirDisciplinasAoEstudante`
4. **Se reprovado**: mantém o ano, reseta apenas as disciplinas reprovadas

### Atribuição de Disciplinas (`lib/atribuirDisciplinas.ts`)

```typescript
export async function atribuirDisciplinasAoEstudante(
  id_estudante, id_curso, ano_curricular, ano_lectivo
)
```

- Cria registos de **Nota** para todas as disciplinas do currículo do curso
- Cria do 1º ano até ao ano actual do estudante
- Usa o `semestre` vindo de `CursoDisciplina` (não o da `Disciplina`)
- Cria/actualiza `CurriculoAcademico` para cada ano

---

## 8. Cards "Semestre Actual" nos Dashboards

Foram adicionados cards visuais em 3 dashboards:

| Dashboard | Ficheiro API | Ficheiro UI |
|-----------|-------------|-------------|
| Admin | `app/api/admin/stats/route.ts` | `app/admin/AdminDashboard.tsx` |
| Gestor | `app/api/gestor/resumo/route.ts` | `app/gestor/GestorDashboard.tsx` |
| Orientador | `app/api/orientador/resumo/route.ts` | `app/orientador/OrientadorDashboard.tsx` |

### Cores

| Estado | Ícone | Cor |
|--------|-------|-----|
| S1 | 📖 | `#4fc3f7` (azul) |
| S2 | 📗 | `#ffa726` (laranja) |

---

## 9. Arquivos Modificados/Criados

### Já existiam (implementação original, recuperada)

| Ficheiro | Descrição |
|----------|-----------|
| `lib/sistema.ts` | Função `getSemestreAtual()` |
| `app/api/admin/sistema/semestre/route.ts` | POST (mudar semestre) + GET (consultar) |
| `app/admin/sistema/ano-lectivo/AnoLectivoDashboard.tsx` | UI de controlo de semestre |
| `app/api/admin/sistema/config/route.ts` | Config do ano lectivo |
| `app/api/gestor/horario/route.ts` | POST bloqueia semestre errado |
| `app/api/gestor/plano-provas/route.ts` | POST bloqueia semestre errado |
| `app/api/gestor/disciplinas/[id]/professores/route.ts` | Atribui no semestre actual |
| `app/api/orientador/disciplinas/route.ts` | Filtra por semestre actual |
| `prisma/schema.prisma` | Modelos `SnapshotSemestre`, `SistemaConfig`, enum `Semestre` |
| `app/api/admin/sistema/registos/route.ts` | Lista snapshots paginados |
| `app/admin/sistema/registos/RegistosDashboard.tsx` | UI de consulta de registos |
| `lib/reenrollment.ts` | `processarRematricula` com snapshot de notas |
| `lib/atribuirDisciplinas.ts` | Atribui disciplinas S1+S2 |

### Modificados nesta sessão

| Ficheiro | O que mudou |
|----------|-------------|
| `app/api/estudante/horario/route.ts` | Adicionado filtro `semestre: await getSemestreAtual()` |
| `app/api/estudante/plano-provas/route.ts` | Adicionado filtro `semestre: await getSemestreAtual()` |
| `app/api/admin/stats/route.ts` | Retorna `semestreAtual` |
| `app/admin/AdminDashboard.tsx` | Card "Semestre Actual" no grid |
| `app/api/gestor/resumo/route.ts` | Retorna `semestreAtual` |
| `app/gestor/GestorDashboard.tsx` | Card "Semestre Actual" no grid |
| `app/api/orientador/resumo/route.ts` | Retorna `semestreAtual` |
| `app/orientador/OrientadorDashboard.tsx` | Card "Semestre Actual" no grid |

---

## 10. Testes Recomendados

### Cenário 1: Mudar de S1 para S2

1. Logar como admin → Ano Lectivo
2. Verificar que está em S1 (badge azul)
3. Clicar "Semestre 2" → confirmar
4. Verificar:
   - Semestre mudou para S2 (badge laranja)
   - Admin Dashboard mostra "📗 S2"
   - Snapshot foi criado (verificar em Registos Lectivo)

### Cenário 2: Estudante vê apenas S2

1. Logar como estudante
2. Verificar:
   - Dashboard mostra "📗 S2"
   - Horário: vazio (porque os do S1 foram apagados)
   - Provas: vazias
   - Notas: ainda mostra S1 + S2

### Cenário 3: Gestor bloqueado para S1

1. Logar como gestor
2. Ir a Horário → seleccionar S1
3. Tentar criar aula → deve bloquear com erro

### Cenário 4: Gestor re-atribui orientadores

1. Logar como gestor
2. Ir a Disciplinas
3. Verificar que as disciplinas estão sem professor
4. Atribuir novo professor para S2

### Cenário 5: Não pode voltar para S1

1. Tentar mudar de S2 para S1
2. Deve mostrar erro: "Não podes voltar para Semestre 1"