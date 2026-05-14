Um# Auditoria do Pipeline de Pré-Projecto/Monografia

## Visão Geral

Este documento descreve as alterações realizadas para auditar e verificar a consistência do pipeline de pré-projecto/monografia no SGE Atlântida. O pipeline abrange desde a solicitação de orientação pelo estudante até à defesa e atribuição de nota final pelo gestor.

---

## 1. O Pipeline (Workflow Completo)

```
👨‍🎓 Estudante (Ultimo ano + propina paga)
    │
    ├── 1. Solicitar Orientação → Pendente → Aceite / Recusado
    │      (POST /api/estudante/solicitacao-orientacao)
    │      (Orientador aceita/recusa em PATCH /api/orientador/solicitacoes/[id])
    │
    ├── 2. Submeter Pré-Projecto → Proposto → Aprovado / Reprovado
    │      (POST /api/estudante/premonografia)
    │      (Orientador aprova/reprova em PATCH /api/orientador/premonografia/[id])
    │
    ├── 3. Submeter Monografia → Submetida → EmRevisão → Aprovada / Rejeitada
    │      (POST /api/estudante/monografia/upload)
    │      (Orientador avalia em PATCH /api/orientador/monografias/[id])
    │                              ↓
    └── 4. Defesa (Gestor) → ParaDefender → Defendida (com nota) 🎓 Finalizado
           (Gestor agenda defesa + atribui nota via PATCH /api/gestor/monografias/[id])
           │
           └── Quando monografia é "Defendida" com nota ≥ 10:
                → Estudante automaticamente passa para "Finalizado"
```

### Transições de Estado Permitidas

| Estado Actual | Transições Válidas | Responsável |
|---|---|---|
| Submetida | → EmRevisao | Orientador ou Gestor |
| EmRevisao | → Aprovada, Rejeitada | Orientador ou Gestor |
| Aprovada | → ParaDefender | Gestor |
| ParaDefender | → Defendida | Gestor |

---

## 2. AuditLog Adicionado

Adicionámos chamadas `logAudit()` em **6 rotas** para registar cada acção no pipeline. Cada registo guarda: quem fez, o quê, quando, estado anterior e estado novo.

### Rotas Modificadas

#### 2.1. `POST /api/estudante/solicitacao-orientacao`
**Acção:** `CRIAR_SOLICITACAO`
- **Quando:** Estudante solicita orientação a um orientador
- **Dados registados:** estado="Pendente", id_orientador, nome_orientador, observações
- **Ficheiro:** `app/api/estudante/solicitacao-orientacao/route.ts`

#### 2.2. `PATCH /api/orientador/solicitacoes/[id]` (já existia)
**Acções:** `ACEITAR_SOLICITACAO` / `RECUSAR_SOLICITACAO`
- **Quando:** Orientador aceita ou recusa um pedido
- **Dados registados:** estado anterior → estado novo, id_estudante
- **Ficheiro:** `app/api/orientador/solicitacoes/[id]/route.ts`

#### 2.3. `POST /api/estudante/premonografia`
**Acção:** `SUBMETER_PRE_PROJECTO`
- **Quando:** Estudante submete um pré-projecto
- **Dados registados:** tema, estado="Proposto", nome_arquivo
- **Ficheiro:** `app/api/estudante/premonografia/route.ts`

#### 2.4. `PATCH /api/orientador/premonografia/[id]`
**Acções:** `APROVAR_PRE_PROJECTO` / `REPROVAR_PRE_PROJECTO`
- **Quando:** Orientador aprova ou reprova o pré-projecto
- **Dados registados:** estado anterior → estado novo, feedback
- **Ficheiro:** `app/api/orientador/premonografia/[id]/route.ts`

#### 2.5. `POST /api/estudante/monografia/upload`
**Acção:** `SUBMETER_MONOGRAFIA`
- **Quando:** Estudante submete a monografia final
- **Dados registados:** titulo, estado="Submetida", id_orientador, co-orientador, co-autor
- **Ficheiro:** `app/api/estudante/monografia/upload/route.ts`

#### 2.6. `PATCH /api/orientador/monografias/[id]`
**Acções:** `AVALIAR_MONOGRAFIA_EmRevisao` / `AVALIAR_MONOGRAFIA_Aprovada` / `AVALIAR_MONOGRAFIA_Rejeitada`
- **Quando:** Orientador avalia a monografia
- **Dados registados:** estado anterior → estado novo, feedback
- **Ficheiro:** `app/api/orientador/monografias/[id]/route.ts`

#### 2.7. `PATCH /api/gestor/monografias/[id]`
**Acções:**
- `GESTOR_MARCAR_REVISAO` — Gestor coloca monografia em revisão
- `GESTOR_APROVAR_MONOGRAFIA` — Gestor aprova monografia
- `GESTOR_REJEITAR_MONOGRAFIA` — Gestor rejeita monografia
- `GESTOR_AGENDAR_DEFESA` — Gestor agenda data e sala de defesa
- `GESTOR_ATRIBUIR_NOTA` — Gestor atribui nota final
- `GESTOR_ACTUALIZAR_MONOGRAFIA` — Outras actualizações
- **Dados registados:** estado anterior, nota anterior, data_defesa, sala_defesa → novos valores
- **Ficheiro:** `app/api/gestor/monografias/[id]/route.ts`

---

## 3. Endpoints de Verificação

### 3.1. `GET /api/gestor/pipeline-consistency`

**Objectivo:** Detecta problemas no pipeline que precisam de atenção.

**Autenticação:** Apenas gestor (orientador com `e_gestor=true`)

**O que verifica:**

| # | Tipo | Gravidade | Descrição |
|---|---|---|---|
| 1 | `ORIENTACAO_SEM_PRE_PROJECTO` | ALTA (>30 dias) / MÉDIA | Estudante tem orientação aceite mas não submeteu pré-projecto |
| 2 | `PRE_APROVADO_SEM_MONOGRAFIA` | ALTA | Pré-projecto aprovado há >30 dias sem monografia |
| 3 | `MONOGRAFIA_SUBMETIDA_SEM_REVISAO` | MÉDIA | Monografia submetida há >15 dias sem revisão |
| 4 | `MONOGRAFIA_APROVADA_SEM_DEFESA` | MÉDIA | Monografia aprovada há >15 dias sem defesa agendada |
| 5 | `DEFESA_AGENDADA_SEM_NOTA` | ALTA | Defesa agendada há >30 dias sem nota |
| 6 | `DEFENDIDA_SEM_NOTA` | ALTA | Monografia defendida mas sem nota final |

**Exemplo de resposta:**
```json
{
  "total_problemas": 3,
  "problemas": [
    {
      "tipo": "ORIENTACAO_SEM_PRE_PROJECTO",
      "gravidade": "ALTA",
      "estudante": "Maria Santos",
      "curso": "Engenharia Informática",
      "dias_desde_orientacao": 97,
      "descricao": "Estudante tem orientação aceite há 97 dias mas ainda não submeteu pré-projecto."
    }
  ],
  "estatisticas": {
    "total_estudantes_departamento": 17,
    "com_orientacao_sem_pre": 1,
    "pre_aprovado_sem_monografia": 0,
    "monografias_submetidas_sem_revisao": 3,
    "monografias_aprovadas_sem_defesa": 0,
    "defesas_sem_nota": 0
  }
}
```

**Ficheiro:** `app/api/gestor/pipeline-consistency/route.ts`

### 3.2. `GET /api/gestor/pipeline-report`

**Objectivo:** Relatório completo do estado de cada estudante no pipeline.

**Autenticação:** Apenas gestor (orientador com `e_gestor=true`)

**O que retorna:**
- Lista de estudantes (3º ano ou mais) com o estado detalhado em cada etapa
- Etapa actual (NENHUMA → ORIENTAÇÃO → PRÉ-PROJECTO → MONOGRAFIA → DEFESA)
- Dias no estado actual
- Dados completos: solicitação, pré-projecto, monografia, notas
- Estatísticas agregadas: total por etapa, média de notas, total defendidos

**Etapas do pipeline:**

| Nível | Etapa | Ordem |
|---|---|---|
| NENHUMA | Sem qualquer actividade | 0 |
| ORIENTACAO_PENDENTE | Solicitação pendente | 0.5 |
| ORIENTACAO_ACEITE | Orientação aceite | 1 |
| PRE_SUBMETIDO | Pré-projecto submetido | 2 |
| PRE_APROVADO | Pré-projecto aprovado | 3 |
| MONOGRAFIA_SUBMETIDA | Monografia submetida/em revisão | 4 |
| APROVADA | Monografia aprovada | 4 |
| PARA_DEFENDER | Defesa agendada | 5 |
| DEFENDIDA | Monografia defendida (com nota) | 6 |

**Exemplo de resposta:**
```json
{
  "stats": {
    "total_estudantes": 12,
    "por_etapa": {
      "nenhuma": 2,
      "orientacao_pendente": 1,
      "orientacao_aceite": 1,
      "pre_submetido": 0,
      "pre_aprovado": 0,
      "monografia_submetida": 3,
      "aprovada": 0,
      "para_defender": 0,
      "defendida": 0
    },
    "total_monografias_defendidas": 0,
    "total_com_nota": 0,
    "media_notas": null
  },
  "report": [
    {
      "estudante": "Ana Silva",
      "numero_estudante": "20220001",
      "curso": "Engenharia Informática",
      "etapa_atual": "MONOGRAFIA_SUBMETIDA",
      "dias_em_estado_atual": 69,
      "orientador": "Prof. Walter Neto",
      "solicitacao": { "estado": "Aceite", "data": "2025-01-15T00:00:00.000Z" },
      "premonografia": null,
      "monografia": { "estado": "Submetida", "titulo": "IA na Educação...", "nota_final": null }
    }
  ]
}
```

**Ficheiro:** `app/api/gestor/pipeline-report/route.ts`

---

## 4. Correção de Erros Pré-existentes

### 4.0. Bug: Ano Final Hardcoded na Premonografia

**Problema:** Na rota `POST /api/estudante/premonografia`, a validação do ano estava hardcoded como `4`:

```typescript
// ❌ Antes: ignorava cursos com duração diferente
if (estudante.ano_current !== 4) {
    return NextResponse.json({ error: "Só estudantes do 4º ano..." })
}
```

Isto significa que um curso de 5 anos (ex: Engenharia Civil em algumas instituições) nunca permitiria submeter pré-projecto, pois o estudante estaria no 5º ano e o código só aceitava `4`.

**Solução:** Passar a usar a duração real do curso (`curso.duracao_anos`):

```typescript
// ✅ Agora: funciona para qualquer curso (4 anos, 5 anos, 6 anos...)
const ultimoAno = estudante.curso?.duracao_anos ?? 4
if (estudante.ano_current !== ultimoAno) {
    return NextResponse.json({ error: `Só estudantes do ${ultimoAno}º ano podem submeter pré-projecto` })
}
```

**Impacto:** Todas as outras rotas do pipeline já usavam `curso.duracao_anos` correctamente. Nenhuma outra rota tinha o valor hardcoded:

| Rota | Verificação | Status |
|---|---|---|
| `POST /api/estudante/solicitacao-orientacao` | `curso?.duracao_anos ?? 4` (linha 86) | ✅ Correcto |
| `GET /api/estudante/solicitacao-orientacao` | `curso?.duracao_anos ?? 4` (linha 49) | ✅ Correcto |
| `POST /api/estudante/monografia/upload` | `curso?.duracao_anos ?? 4` (linha 33) | ✅ Correcto |
| `GET /api/estudante/monografia` | `curso?.duracao_anos ?? 4` (linha 32) | ✅ Correcto |

Apenas a `premonografia` estava com o valor hardcoded.

**Ficheiro corrigido:** `app/api/estudante/premonografia/route.ts`

### 4.1. Campo `ProfessorDisciplina` — Unique Constraint (TypeScript)

### 4.1. Campo `ProfessorDisciplina` — Unique Constraint

**Problema:** O schema mudou o nome do unique constraint de `id_usuario_id_disciplina_ano_lectivo` para `id_usuario_id_disciplina_ano_lectivo_semestre` (adicionando `semestre`), mas 3 ficheiros ainda usavam o nome antigo.

**Ficheiros corrigidos:**

| Ficheiro | O que mudou |
|---|---|
| `prisma/seed.ts` | `id_usuario_id_disciplina_ano_lectivo` → `id_usuario_id_disciplina_ano_lectivo_semestre` + campo `semestre: "S1"` no where e create |
| `prisma/seed-estudantes.ts` | Mesma alteração em 2 upserts |
| `prisma/seed-fix-ano-lectivo.ts` | Mesma alteração + `semestre: pd.semestre` no where |

### 4.2. Null Safety em `fix-curriculo-duplicado.ts`

**Problema:** `c.descricao` pode ser `null` (o campo é `String?` no schema), mas estava a ser usado como chave de `Map<string, ...>` sem fallback.

**Solução:** `c.descricao ?? ""`

### 4.3. Parâmetro `params` Desactualizado

**Problema:** O Next.js 15+ exige `params: Promise<{ id: string }>` em vez de `params: { id: string }`.

**Ficheiro corrigido:** `app/api/admin/propinas/[id]/route.ts`
- Assinatura: `{ params }: { params: Promise<{ id: string }> }`
- Uso: `const resolvedParams = await params; parseInt(resolvedParams.id)`

---

## 5. Como Testar

### 5.1. Verificar Consistência do Pipeline
```bash
# Fazer login como gestor (orientador@ispatlantida.ao / orientador123)
# Depois aceder:
GET /api/gestor/pipeline-consistency
```

### 5.2. Ver Relatório Completo
```bash
GET /api/gestor/pipeline-report
```

### 5.3. Verificar AuditLog
```bash
# Os logs são guardados na tabela AuditLog da base de dados
# Cada acção no pipeline gera um registo com:
# - id_usuario: quem fez
# - acao: o que fez (ex: "APROVAR_PRE_PROJECTO")
# - tabela: tabela afectada
# - id_registro: ID do registo afectado
# - valor_antes: estado anterior (JSON)
# - valor_depois: estado novo (JSON)
# - data_hora: quando aconteceu
```

### 5.4. Fluxo Completo de Teste
1. **Login como Pedro Costa** (pedro@ispatlantida.ao / student4ano123) — 4º ano sem orientação
2. **Solicitar orientação** → POST /api/estudante/solicitacao-orientacao
3. **Login como orientador** → Aceitar solicitação
4. **Login como Pedro** → Submeter pré-projecto
5. **Login como orientador** → Aprovar pré-projecto
6. **Login como Pedro** → Submeter monografia
7. **Login como orientador** → Avaliar monografia (Aprovada)
8. **Login como gestor** → Agendar defesa
9. **Login como gestor** → Atribuir nota final

Cada passo fica registado no AuditLog.

---

## 6. Ficheiros Criados/Modificados

### Novos
- `app/api/gestor/pipeline-consistency/route.ts` — Endpoint de consistência
- `app/api/gestor/pipeline-report/route.ts` — Endpoint de relatório

### Modificados (AuditLog)
- `app/api/estudante/solicitacao-orientacao/route.ts` — + import logAudit + chamada
- `app/api/estudante/premonografia/route.ts` — + import logAudit + chamada
- `app/api/estudante/monografia/upload/route.ts` — + import logAudit + chamada
- `app/api/orientador/premonografia/[id]/route.ts` — + import logAudit + chamada
- `app/api/orientador/monografias/[id]/route.ts` — + import logAudit + chamada
- `app/api/gestor/monografias/[id]/route.ts` — + import logAudit + chamada

### Modificados (Correcção de Erros)
- `prisma/seed.ts` — Campo unique + semestre
- `prisma/seed-estudantes.ts` — Campo unique + semestre
- `prisma/seed-fix-ano-lectivo.ts` — Campo unique + semestre
- `prisma/fix-curriculo-duplicado.ts` — Null safety
- `app/api/admin/propinas/[id]/route.ts` — params Promise

---

## 7. Modelos de Dados Relacionados (schema.prisma)

| Modelo | Descrição |
|---|---|
| `SolicitacaoOrientacao` | Pedido de orientação (Pendente/Aceite/Recusado/Cancelado) |
| `Premonografia` | Pré-projecto (Proposto/Aprovado/Reprovado/Cancelado) |
| `Monografia` | Monografia (Submetida/EmRevisao/Aprovada/ParaDefender/Defendida/Rejeitada) |
| `MonografiasParaCorrecao` | Correções solicitadas pelo orientador |
| `AuditLog` | Registo de auditoria de todas as acções |
| `Orientador` | Orientador (com campo `e_gestor` para gestores de departamento) |