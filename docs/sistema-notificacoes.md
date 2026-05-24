# Sistema de Notificações — SGE Atlântida

> Criado em 24/05/2026

## Arquitetura

O sistema segue o mesmo padrão do sistema de Auditoria (AuditLog), com 4 camadas:

```
Prisma Model → lib/notificacoes.ts → API Routes → UI (DashboardLayout)
```

### 1. Modelo `Notificacao` (Prisma Schema)

```prisma
model Notificacao {
  id          Int      @id @default(autoincrement())
  id_usuario  Int
  tipo        String   @db.VarChar(50)
  titulo      String   @db.VarChar(200)
  mensagem    String   @db.Text
  lida        Boolean  @default(false)
  link_url    String?  @db.VarChar(500)
  data_hora   DateTime @default(now())
  usuario     Usuario  @relation(fields: [id_usuario], references: [id_usuario])
}
```

Campos:
- `id_usuario` — destinatário (sempre um `Usuario`)
- `tipo` — categorização: `"propina"`, `"nota"`, `"horario"`, `"provas"`, `"premonografia"`, `"monografia"`, `"declaracao"`, `"certificado"`, `"solicitacao"`, `"defesa"`
- `lida` — false = não lida (badge vermelho)
- `link_url` — caminho relativo para onde o user é redirecionado ao clicar (ex: `"/estudante/pagamentos"`)

### 2. `lib/notificacoes.ts`

```typescript
import { prisma } from "./prisma"

interface CriarNotificacaoParams {
  id_usuario: number
  tipo: string
  titulo: string
  mensagem: string
  link_url?: string
}

export async function criarNotificacao(params: CriarNotificacaoParams) {
  try {
    await prisma.notificacao.create({ data: { ...params } })
  } catch (error) {
    console.error("Erro ao criar notificação:", error)
  }
}
```

Nunca quebra o fluxo principal — se falhar, apenas loga o erro.

### 3. API Routes

| Rota | Método | Função |
|---|---|---|
| `GET /api/notificacoes` | GET | Lista últimas 30 notificações do user autenticado |
| `GET /api/notificacoes/contagem` | GET | Retorna `{ total: number }` de não lidas |
| `PUT /api/notificacoes/[id]` | PUT | Marca uma notificação como lida |
| `PUT /api/notificacoes/marcar-todas` | PUT | Marca todas como lidas |

### 4. UI

Localizada no **DashboardLayout** (`app/components/DashboardLayout.tsx`):
- 🔔 Sino no topbar (junto do badge do simulador)
- Badge vermelho com contagem de não lidas
- Dropdown ao clicar: lista das últimas notificações com título, mensagem, data e link
- Notificações não lidas destacadas (fundo + bolinha vermelha)
- Botão "Marcar todas lidas"
- Refresh automático da contagem a cada 30 segundos

---

## Eventos × Destinatários × Estado

### ✅ Implementados

| Evento | Handler | `tipo` | Quem recebe | Link |
|---|---|---|---|---|
| Propina gerada | `admin/gerar-propinas/route.ts` | `"propina"` | Estudante | `/estudante/pagamentos` |
| Propina em atraso | `admin/gerar-propinas-falta/route.ts` | `"propina"` | Estudante | `/estudante/pagamentos` |
| Nota lançada (campos individuais) | `notas/route.ts` | `"nota"` | Estudante | `/estudante/notas` |
| Horário atualizado | `gestor/horario/route.ts` | `"horario"` | Estudantes do curso + Professor | `/estudante/horario`, `/orientador/plano-aula` |
| Prova publicada | `gestor/plano-provas/route.ts` | `"provas"` | Estudantes do curso + Professor | `/estudante/plano-provas`, `/orientador/plano-aula` |
| Pré-projecto aprovado/rejeitado | `gestor/premonografia/[id]/route.ts` | `"premonografia"` | Estudante | `/estudante/monografia` |
| Monografia aprovada/rejeitada/defesa | `gestor/monografias/[id]/route.ts` | `"monografia"` | Estudante | `/estudante/monografia` |
| Declaração pronta para levantar | `recepcionista/declaracoes/[id_declaracao]/status/route.ts` | `"declaracao"` | Estudante | `/estudante/servicos` |
| Certificado pronto para levantar | `recepcionista/certificados/[id]/status/route.ts` | `"certificado"` | Estudante | `/estudante/servicos` |
| Solicitação de orientação | `estudante/solicitacao-orientacao/route.ts` | `"solicitacao"` | Gestores do departamento | `/gestor/estudantes` |

### ❌ Por implementar

| Evento | Handler | `tipo` | Quem recebe | Motivo |
|---|---|---|---|---|
| Pagamento de documento → Recepcionista | `estudante/pagamentos/confirmar/route.ts` | `"pagamento_documento"` | Recepcionista | Pouco crítico (recepcionista vê na dashboard) |
| Data de defesa → Orientador | `gestor/monografias/[id]/route.ts` | `"defesa"` | Orientador do aluno | Já notifica estudante; falta adicionar orientador |
| Disciplina atribuída → Professor | `gestor/disciplinas/[id]/professores/route.ts` | `"disciplina"` | Orientador | Raro (só no início do semestre) |
| Pré-projecto submetido → Gestor | `estudante/premonografia/route.ts` | `"premonografia"` | Gestor | Gestor vê na lista de pré-projectos |
| Monografia submetida → Gestor | `estudante/monografia/upload/route.ts` | `"monografia"` | Gestor | Gestor vê na lista de monografias |

---

## Como adicionar uma nova notificação

1. **Importar** a função no handler:
   ```typescript
   import { criarNotificacao } from "@/lib/notificacoes"
   ```

2. **Incluir `id_usuario`** no select do Prisma sempre que precisares do destinatário:
   ```typescript
   const estudante = await prisma.estudante.findUnique({
     where: { id_estudante: algumId },
     select: { id_usuario: true, ... }
   })
   ```

3. **Chamar `criarNotificacao()`** após a ação principal:
   ```typescript
   await criarNotificacao({
     id_usuario: estudante.id_usuario,
     tipo: "meu_tipo",
     titulo: "Título curto e descritivo",
     mensagem: "Mensagem mais detalhada sobre o que aconteceu",
     link_url: "/estudante/minha-pagina"
   })
   ```

4. **Usar sempre `try/catch`** para não quebrar o fluxo principal se a notificação falhar.

## Notas

- O refresh da contagem de não lidas é automático a cada 30s
- O dropdown carrega as últimas 30 notificações ao clicar no sino
- As notificações antigas não são apagadas automaticamente — considerar limpeza periódica se houver muitas
- O campo `tipo` serve para filtragem futura (ex: "mostrar só notificações de propinas")