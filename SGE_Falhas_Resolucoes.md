# Registo de Falhas e Resoluções — SGE Atlantida

> Este documento regista bugs identificados, suas causas e resoluções implementadas. É útil para manutenção futura e onboarding de novos desenvolvedores.

---

## 📋 Índice

1. [Falha: JWT não atualiza nome de utilizador após edição de perfil](#falha-jwt-nao-atualiza-nome-de-utilizador-apos-edicao-de-perfil)
2. [Falha: Display mostra nome completo em vez de nome de utilizador](#falha-display-mostra-nome-completo-em-vez-de-nome-de-utilizador)
3. [Falha: Invoice number unique constraint violation](#falha-invoice-number-unique-constraint-violation)
4. [Falha: Calendário de datas mostra meses/dias em inglês](#falha-calendario-de-datas-mostra-mesesdias-em-inglês)

---

## Falha: JWT não atualiza nome de utilizador após edição de perfil

### 🐛 Descrição do Problema

Após um utilizador editar o seu nome no perfil, o nome não atualiza no display até que o utilizador faça logout e login novamente. Isso ocorre porque:

1. O JWT (JSON Web Token) do NextAuth é **stateless** — uma vez emitido, não pode ser "atualizado" diretamente
2. O `display name` no Dashboard usa o valor em cache do JWT, não os dados mais recentes do banco de dados
3. A chamada ao `refresh-session` não atualiza efetivamente o token JWT

### 🔍 Causa Raiz

O sistema estava usando uma abordagem incorreta para atualizar o JWT:

- A API `/api/auth/refresh-session` apenas **retornava** os dados atualizados mas não **atualizava** a sessão do NextAuth
- O NextAuth com estratégia JWT não tem um mecanismo de "force update" — o token é válido até expirar
- O frontend não estava chamando o método `update()` do NextAuth para forçar uma atualização

### ✅ Resolução Implementada

#### 1. Criado novo endpoint `/api/auth/refresh-jwt`

Esse endpoint recarrega os dados do utilizador do banco de dados e retorna:
- `name` — nome completo (para display)
- `nome_usuario` — nome de utilizador curto  
- `role`, `id`, `email`

```typescript
// app/api/auth/refresh-jwt/route.ts
export async function POST() {
  // Recarregar dados do DB
  // Retornar dados atualizados
}
```

#### 2. Atualizado `DashboardLayout.tsx`:

Na função `salvarPerfil()`:

```typescript
// Após salvar perfil com sucesso:
const refreshRes = await fetch('/api/auth/refresh-jwt', { method: 'POST' })
const refreshData = await refreshRes.json()

// Atualizar a sessão do NextAuth
if (update) {
  await update({
    name: refreshData.name,
    nome_usuario: refreshData.nome_usuario,
    email: refreshData.email,
    role: refreshData.role,
    id: refreshData.id
  })
}
```

#### 3. Corrigido display do nome:

Alterado no `DashboardLayout.tsx`:

**Antes:**
```typescript
const displayName = dadosPerfil.nome || session?.user?.name || ""
```

**Depois:**
```typescript
const displayName = dadosPerfil.nome_usuario || session?.user?.nome_usuario || session?.user?.name || ""
```

Agora o sistema usa:
1. `dadosPerfil.nome_usuario` — valor editado localmente (display imediato)
2. `session.user.nome_usuario` — valor do JWT atualizado
3. `session.user.name` — fallback para nome completo

---

## Falha: Display mostra nome completo em vez de nome de utilizador

### 🐛 Descrição do Problema

Em alguns casos, o perfil do utilizador estava a mostrar o **nome completo** (ex: "João Pedro Silva Santos") em vez do **nome de utilizador** (ex: "joaosilva") no menu lateral e头像 no dashboard.

### 🔍 Causa Raiz

Confusão entre dois campos diferentes:

| Campo | Tabela | Descrição |
|-------|--------|-----------|
| `nome_completo` | Tabela específica (Estudante, Orientador, etc.) | Nome longo, ex: "João Pedro Silva Santos" |
| `nome_usuario` | Tabela `usuario` | Nome curto, ex: "joaosilva" |

O código estava usando `dadosPerfil.nome` (que é `nome_completo`) no display principal.

### ✅ Resolução Implementada

#### Alteração em `DashboardLayout.tsx`:

```typescript
// Usar dadosPerfil.nome_usuario para display (nome de usuário curto)
// Caso contrário, usar session.user.nome_usuario da sessão
// E como fallback, session.user.name
const displayName = dadosPerfil.nome_usuario || session?.user?.nome_usuario || session?.user?.name || ""
```

#### Lógica do Iniciais (Avatar):

```typescript
const initials = displayName
  ?.split(" ")
  .map((n) => n[0])
  .join("")
  .toUpperCase()
  .slice(0, 2) ?? "?"
```

Agora as iniciais são geradas baseado no nome de utilizador, não no nome completo.

---

## Falha: Invoice number unique constraint violation

### 🐛 Descrição do Problema

Um membro do grupo adicionou uma nova funcionalidade de serviços para estudantes. Quando um estudante tentava comprar um segundo serviço (após já ter comprado um anteriormente), ocorria um erro interno (HTTP 500) com a mensagem:

```
Unique constraint failed on the fields: (`numero_factura`)
Error code: 'P2002'
```

### 🔍 Contexto

1. Um membro do grupo implementou a funcionalidade de serviços dinamâmicos
2. A API `POST /api/estudante/servicos/comprar` permite aos estudantes comprar serviços
3. Ao testar a compra de um segundo serviço diferente, o sistema retornava erro 500

### 🔍 Causa Raiz

O campo `numero_factura` na tabela `Factura` tem uma restrição **@unique**:

```prisma
numero_factura    String?       @unique @db.VarChar(20)
```

Mas o código gerava o número da factura sempre igual para o mesmo estudante:

```typescript
// ANTES - Código problemático
const numero_factura = `${ano}/${cursoAbrev}/${numero}`  
// Resultado: "2026/CC/12345" (sempre igual para o mesmo estudante)
```

Quando o estudante comprava um segundo serviço diferente, o sistema tentava criar outra factura com o **mesmo número**, violando a restrição unique.

### ✅ Resolução Implementada

Adicionado um contador sequencial baseado no número de facturas existentes do estudante:

```typescript
// NOVO - Código corrigido

// 1. Contar facturas existentes do estudante
const existingFacturas = await prisma.factura.count({
  where: { id_estudante: estudante.id_estudante }
})

// 2. Gerar sequência (001, 002, etc.)
const sequencia = String(existingFacturas + 1).padStart(3, '0')

// 3. Número único: ANO/CURSO/NUMESTUDANTE/SEQUENCIA
const numero_factura = `${ano}/${cursoAbrev}/${numero}/${sequencia}`
// Resultado: "2026/CC/12345/001", "2026/CC/12345/002", etc.
```

### 📁 Arquivo Modificado

- `app/api/estudante/servicos/comprar/route.ts`

---

## Falha: Calendário de datas mostra meses/dias em inglês

### 🐛 Descrição do Problema

Na página de auditoria (`admin/audit`), o filtro de datas (`DatePickerPT`) mostrava os meses e dias da semana em **inglês** (January, February, etc.) mesmo num sistema configurado para português.

### 🔍 Causa Raiz

O código tinha uma locale `ptPT` manualmente definida mas incompleta:

```typescript
// Locale mal configurado - falta funções localize.month, localize.day, etc.
const ptPT: Locale = {
  localize: () => '',  // ❌ Erro: vazio, não uma função
}
```

O `react-day-picker` exige que `localize` seja um objeto com funções (`localize.month(index)`, `localize.day(index)`, etc.), não strings vazias.

### ✅ Resolução Implementada

1. **Removido** o `ptPT` manual incompleto
2. **Importado** `ptBR` de `date-fns/locale`
3. **Passado** `locale={ptBR}` ao `DayPicker`

```typescript
// Antes (causava erro)
import type { Locale } from 'react-day-picker'
const ptPT: Locale = { ... } // ❌ incompleto

// Depois (funciona)
import { ptBR } from 'date-fns/locale'
<DayPicker locale={ptBR} ... />
```

### 📁 Arquivo Modificado

- `app/admin/audit/page.tsx`

---

## 📝 Notas para Desenvolvedores

### Como o JWT funciona no NextAuth

1. **JWT é stateless** — uma vez criado, é válido até expirar
2. **Não há "update" real do JWT** — o NextAuth usa o método `update()` para atualizar o estado local e força uma nova requisição que pode resultar em novo JWT
3. **Para atualizar dados após edição**:
   - Atualizar o banco de dados
   - Chamar uma API para recarregar dados
   - Usar `update()` do NextAuth para atualizar o estado local
   - O display local atualizará imediatamente

### Melhores práticas

- Sempre usar `nome_usuario` para display curto (menus, avatares)
- Usar `nome_completo` apenas quando necessário (certificados, relatórios)
- Chamada ao `update()` no cliente é a forma correta de solicitar atualização de sessão

---

## Falha: Sidebar nav overflow — logout inacessível

### 🐛 Descrição do Problema

No dashboard admin (e outros roles), a sidebar continha muitos itens de navegação. Quando a lista de menus era maior que a altura do ecrã, o botão **Terminar Sessão** era empurrado para fora da viewport e ficava inacessível — o utilizador não conseguia fazer logout sem fazer zoom out.

### 🔍 Causa Raiz

O `<aside>` da sidebar usava `minHeight: "100vh"` em vez de `height: "100vh"`. Isso permitia que o sidebar crescesse além do ecrã quando o conteúdo interno (brand + user + nav + logout) excedia a altura disponível. O `<nav>` tinha `flex: 1` e `overflowY: "auto"`, mas como o pai podia crescer infinitamente, o flex layout nunca encolhia a área do nav para criar scroll.

### ✅ Resolução Implementada

1. **`<aside>` sidebar**: `minHeight: "100vh"` → `height: "100vh"` + `overflow: "hidden"`
2. **`<nav>`**: adicionado `scrollbarWidth: "thin"` e `scrollbarColor` para scrollbar dark-themed

Agora o sidebar está rigidamente limitado à altura do viewport. O `<nav>` recebe o espaço restante e scrolla internamente quando há muitos itens. O logout permanece sempre visível na parte inferior.

### 📁 Arquivos Modificados

- `app/components/DashboardLayout.tsx`

---

## Falha: Modal de perfil encostado às bordas do ecrã

### 🐛 Descrição do Problema

O modal "Meu Perfil" (acessível ao clicar no utilizador na sidebar) crescia verticalmente até tocar nas bordas superior e inferior do ecrã, sem qualquer margem ou respiro visual. Em ecrãs pequenos ou com muitos campos, ficava colado às edges.

### 🔍 Causa Raiz

O container interno do modal não tinha `maxHeight` definido. Com 7+ campos de formulário (nome, username, email, telemóvel, 3 passwords), o modal simplesmente expandia até ultrapassar o viewport.

### ✅ Resolução Implementada

Adicionado ao container interno do modal:
- `maxHeight: '85vh'` — limita a 85% da altura do viewport
- `overflowY: 'auto'` — scroll interno quando o conteúdo excede
- `margin: '16px'` — garante espaço visível em todos os lados
- `boxShadow` — profundidade visual para separar do backdrop
- `scrollbarWidth: "thin"` + `scrollbarColor` — scrollbar consistente com o tema dark

### 📁 Arquivos Modificados

- `app/components/DashboardLayout.tsx`

---

## Falha: Inputs transbordam containers (box-sizing)

### 🐛 Descrição do Problema

Inputs com `width: '100%'` e `padding: '12px'` estavam transbordando dos seus containers pais. O texto/cursor ficava cortado ou o input parecia mais largo que o espaço disponível. Isso ocorria no:
- Modal de perfil (todos os 7 inputs)
- Página `/admin/precos` (inputs de propina fallback e multa)
- Modais de adicionar/editar serviço

### 🔍 Causa Raiz

Por padrão, o CSS usa `box-sizing: content-box`, onde `width: 100%` define apenas a largura do **conteúdo**. O `padding` (12px de cada lado = 24px total) é **adicionado** por fora, resultando num elemento de `100% + 24px` — sempre maior que o pai.

### ✅ Resolução Implementada

Adicionado `boxSizing: 'border-box'` a todos os inputs afetados. Com `border-box`, o `width: 100%` inclui padding e border no cálculo, garantindo que o input nunca exceda o container pai.

**Inputs corrigidos:**
- `DashboardLayout.tsx`: 7 inputs do modal de perfil + input de telemóvel
- `PrecosAdminDashboard.tsx`: 4 inputs de propina fallback + 1 input de multa + 6 inputs dos modais de serviço

### 📁 Arquivos Modificados

- `app/components/DashboardLayout.tsx`
- `app/admin/precos/PrecosAdminDashboard.tsx`

---

## Falha: Filtro de Departamento no Audit não funciona correctamente para Orientadores

### 🐛 Descrição do Problema

Na página de auditoria (`admin/audit`), quando se seleccionava o cargo **"Orientador"** no filtro, aparecia um dropdown de **Departamento** em vez de Curso. Isso causava dois problemas:

1. **Lentidão / falta de actualização**: O campo Departamento demorava ou não actualizava correctamente quando se mudava de orientador
2. **Sem utilidade prática**: O utilizador queria ver as alterações que um professor fez para um **curso específico**, não para um departamento inteiro

### 🔍 Causa Raiz

- O filtro de Departamento usava a relação directa `Orientador.id_departamento`, que não reflectia a realidade: um orientador lecciona disciplinas de vários cursos dentro do departamento
- Quando se seleccionava um curso para estudante e depois mudava para orientador, o sistema não conseguia mapear correctamente
- A query de audit logs não filtrava correctamente quando nenhum orientador correspondia ao critério — mostrava **todos** os logs em vez de **nenhum**

### ✅ Resolução Implementada

#### 1. Removido filtro de Departamento
- Eliminado completamente o dropdown de Departamento da página `admin/audit`
- Removido o estado `filtroDepartamento`, `departamentos` e toda a lógica associada

#### 2. Campo Curso funciona para ambos os roles
- O dropdown de **Curso** agora aparece tanto para `estudante` como para `orientador`
- Para **estudantes**: filtra por `Estudante.id_curso` (comportamento anterior)
- Para **orientadores**: filtra por disciplinas que o orientador lecciona no curso, via `ProfessorDisciplina → Disciplina → CursoDisciplina`

#### 3. Correcção do bug "mostra todos os logs"
- Quando se seleccionava um curso mas nenhum orientador leccionava disciplinas nesse curso, o `filteredUserIds` ficava vazio
- O código só aplicava `where.id_usuario = { in: [...] }` quando o set tinha **> 0 elementos**, resultando em nenhum filtro aplicado
- **Fix**: Adicionada condição `else if (id_curso)` que força `where.id_usuario = { in: [] }` quando o curso foi seleccionado mas nenhum utilizador corresponde

### 📁 Arquivos Modificados

- `app/admin/audit/page.tsx` — removido Departamento, Curso aparece para ambos os roles
- `app/api/audit/route.ts` — filtro de orientadores por curso via ProfessorDisciplina, fix do bug de logs vazios

---

## Falha: Edição de notas do gestor — tabela não actualiza e valores sobrescritos

### 🐛 Descrição do Problema

Ao editar notas de estudantes no dashboard do gestor, ocorriam dois problemas:
1. **Tabela não actualizava** depois de guardar — os valores continuavam a mostrar travessões (—)
2. **Valores eram sobrescritos** — ao guardar um campo novo (ex: AC2), os campos anteriores (ex: AC1) desapareciam

O comportamento era inconsistente: funcionava para alguns estudantes/ disciplinas mas não para outros.

### 🔍 Causa Raiz

Três problemas distintos, mas que interagiam entre si:

#### 1. API PUT aceitava `null` e gravava na BD

No ficheiro `app/api/gestor/estudantes/[id]/notas/[id_nota]/route.ts`:
```typescript
// ANTES: aceitava null, gravava NULL na BD
if (ac1 !== undefined) dadosAtualizar.ac1 = ac1
// se ac1 = null, null !== undefined → true → grava null
```

O frontend enviava todos os campos no body, incluindo os que o utilizador não tinha alterado. Quando o modal abria com campos vazios (estado desactualizado), enviava `null` para campos que já tinham valor na BD, sobrescrevendo-os.

#### 2. Frontend: patch manual do estado quebrava com `id_nota` null

No `handleNotaSave`, o código tentava substituir a nota no estado local comparando `n.id_nota === notaActualizada.id_nota`. Quando uma nota era criada pela primeira vez, o `id_nota` era `null` no estado local mas a BD devolvia um número (ex: 123). A comparação `null === 123` falhava e o estado nunca era actualizado.

#### 3. `carregarDetalhe` resetava o ano selecionado

O `handleNotaSave` chamava `carregarDetalhe` que fazia:
```typescript
setEstudanteSelecionado(null)
setAnoSelecionado(null)
// depois forçava:
setAnoSelecionado(data.ano_current)
```

Se o utilizador estivesse a ver o 1º ano de um estudante do 2º ano, depois do save o sistema saltava para o 2º ano (que não tinha notas → tudo travessões).

#### 4. Ciclo vicioso completo

1. Guardas AC1=20 → BD salva certo → tabela não actualiza (bug #2)
2. Tabela mostra vazio → clicas Editar → modal abre com AC1 = null
3. Metes TTP=15 e Guardas → PUT envia `{ ac1: null, ttp: 15 }` → BD apaga AC1 (bug #1)
4. Repetes e a BD perde campos um por um

### ✅ Resolução Implementada

#### 1. API PUT: Ignorar null nos campos

```typescript
// DEPOIS: só actualiza se for valor numérico real
if (ac1 !== undefined && ac1 !== null) dadosAtualizar.ac1 = ac1
```

Agora se o frontend enviar `null`, a API ignora esse campo e mantém o valor existente na BD.

#### 2. Frontend: fetch directo em vez de patch manual

```typescript
async function handleNotaSave(_notaActualizada: NotaDetalhe) {
    if (!estudanteSelecionado) return
    setNotaEditando(null)
    const res = await fetch(`/api/gestor/estudantes/${estudanteSelecionado.id_estudante}`)
    if (res.ok) {
        const data = await res.json()
        const anoAtual = anoSelecionado
        setEstudanteSelecionado(data)
        setAnoSelecionado(anoAtual) // preserva o ano que o user está a ver
    }
}
```

#### 3. Script de fix: CursoDisciplina

Criado `prisma/seed-fix-curriculo.ts` que verifica e corrige os registos em `CursoDisciplina` (tabela que liga disciplinas ao curso). O seed original não criava esses registos, e a API admin que os criava não definia `ano_curricular` nem `semestre` (ficavam com default 1/S1).

### 📁 Arquivos Modificados

- `app/api/gestor/estudantes/[id]/notas/[id_nota]/route.ts` — PUT ignora null
- `app/gestor/estudantes/EstudantesDashboard.tsx` — handleNotaSave preserva anoSelecionado
- `prisma/seed-fix-curriculo.ts` — (novo) script de correção de CursoDisciplina

---

## Falha: Disciplinas aparecem no ano/semestre errado — conflito entre `Disciplina` e `CursoDisciplina`

### 🐛 Descrição do Problema

Quando um gestor adicionava uma disciplina ao currículo de um curso num ano específico (ex: 2º ano, S2), a disciplina aparecia ao estudante e na carreira académica como sendo do 1º ano S1. Além disso, surgiram notas duplicadas e semestre errado para dados existentes.

### 🔍 Causa Raiz

O schema tem **dois sítios** onde `ano_curricular` e `semestre` são armazenados:

| Campo | Tabela | Significado |
|-------|--------|-------------|
| `Disciplina.ano_curricular` / `Disciplina.semestre` | `Disciplina` | Valor "padrão" da disciplina (default 1/S1) |
| `CursoDisciplina.ano_curricular` / `CursoDisciplina.semestre` | `CursoDisciplina` | Ano/semestre **correcto** definido no currículo do curso |

O `CursoDisciplina` é a tabela que liga um curso a uma disciplina e define **em que ano e semestre** essa disciplina é oferecida naquele curso específico. Uma mesma disciplina pode estar no 2º ano do Curso A e no 3º ano do Curso B.

O código estava a usar `Disciplina.ano_curricular` e `Disciplina.semestre` em vez dos valores do `CursoDisciplina` em 4 sítios:

1. **Criação de Notas** (`lib/atribuirDisciplinas.ts`): usava `cd.disciplina.semestre` em vez de `cd.semestre`
2. **Vista do gestor** (`app/api/gestor/estudantes/[id]/route.ts`): filtrava Notas por `disciplina.ano_curricular` em vez de pelos IDs do `CursoDisciplina`
3. **Resumo de notas do estudante** (`app/api/estudante/notas-resumo/route.ts`): mesmo problema — filtrava por `disciplina.ano_curricular`
4. **Página de notas do estudante** (`app/api/estudante/notas/route.ts`): agrupava notas por `disciplina.ano_curricular`

### ✅ Resolução Implementada

Foram corrigidos **6 ficheiros**:

#### 1. `lib/atribuirDisciplinas.ts`
```typescript
// ANTES: semestre da Disciplina (pode estar errado)
semestre: cd.disciplina.semestre
// DEPOIS: semestre do CursoDisciplina (correcto)
semestre: cd.semestre
```

#### 2. `app/api/gestor/estudantes/[id]/route.ts`
```typescript
// ANTES: filtrava por disciplina.ano_curricular
disciplina: { ano_curricular: ano }
// DEPOIS: filtra por IDs do CursoDisciplina e agrupa por cd.semestre
const disciplinasIds = disciplinasDoCurso.map(cd => cd.id_disciplina)
id_disciplina: { in: disciplinasIds }
semestres[cd.semestre].push({...})
```

#### 3. `app/api/estudante/notas-resumo/route.ts`
```typescript
// ANTES: filtrava por disciplina.ano_curricular
disciplina: { ano_curricular: estudante.ano_current }
// DEPOIS: busca disciplinas do currículo e filtra por IDs
const disciplinasDoCurso = await prisma.cursoDisciplina.findMany({
  where: { id_curso: ..., ano_curricular: ... }
})
id_disciplina: { in: disciplinasIds }
semestre: n.semestre // ← valor guardado na Nota
```

#### 4. `app/api/estudante/notas/route.ts`
```typescript
// ANTES: usava disciplina.ano_curricular
ano: n.disciplina.ano_curricular
// DEPOIS: mapa de CursoDisciplina
const disciplinaAnoMap = new Map(curriculoMapping.map(cd => [cd.id_disciplina, cd.ano_curricular]))
ano: disciplinaAnoMap.get(n.id_disciplina) ?? n.disciplina.ano_curricular
```

### ⚠️ Limitações

As correcções só afectam **dados novos**. Para dados existentes foi criado `prisma/fix-notas-limpeza.ts` (remove duplicados, corrige semestres, cria notas em falta).

O seed `prisma/seed-estudantes.ts` ficou demasiado complexo — tenta criar estudantes, atribuir disciplinas, criar notas, propinas e monografias ao mesmo tempo. Recomenda-se criar estudantes manualmente e usar um seed simplificado só para notas.

### 📁 Arquivos Modificados

- `lib/atribuirDisciplinas.ts`
- `app/api/gestor/estudantes/[id]/route.ts`
- `app/api/estudante/notas-resumo/route.ts`
- `app/api/estudante/notas/route.ts`
- `prisma/fix-notas-limpeza.ts` — (novo) script de limpeza de dados existentes

---
## Registos Futuros

Para novas falhas, adicionar uma nova secção neste documento com:
- Data da identificação
- Descrição detalhada
- Causa raiz
- Resolução aplicada
