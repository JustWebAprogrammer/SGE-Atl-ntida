# Auditoria e Correções do Sistema de Pagamentos — SGE Atlântida

> **Data:** 06/05/2026  
> **Tipo:** Correções de bugs e implementações de segurança  
> **Ficheiros alterados:** 15 (entre novos e modificados)  
> **Schema alterado:** +1 campo (`codigo_confirmacao` em Factura)

---

## TASK 1 — Falso Positivo no Estado de Pagamento do Estudante

### Problema
O campo `Estudante.pagamento` era sobrescrito para `"Pago"` sempre que uma única propina era confirmada. Um estudante com 3 meses pendentes pagava 1 e todo o sistema via como `"Pago"` — libertando acesso a notas e certificados.

### Correção
**Ficheiro:** `app/api/estudante/pagamentos/confirmar/route.ts`

Após confirmar o pagamento, o sistema agora:
1. Marca a propina individual como `"Pago"`
2. Consulta TODAS as propinas do estudante com `estado != "Pago"` e `data_vencimento <= hoje`
3. Se existirem pendentes vencidas → `pagamento: "Devedor"`
4. Se zero pendentes vencidas → `pagamento: "Pago"`

```typescript
const propinasVencidasNaoPagas = await prisma.pagamentoPropina.findMany({
  where: {
    id_estudante: estudante.id_estudante,
    data_vencimento: { lte: hoje },
    estado: { not: "Pago" },
  },
})
const novoEstadoPagamento = propinasVencidasNaoPagas.length === 0 ? "Pago" : "Devedor"
```

---

## TASK 2 — Multa Automática (RN-PAG02)

### Problema
A regra de negócio RN-PAG02 diz que multa de 500 Kz é aplicada automaticamente após o dia 10, mas nunca foi implementada — `valor_multa` ficava sempre 0.

### Correção
**Novo ficheiro:** `lib/multa-atraso.ts`  
**Ficheiro alterado:** `app/api/estudante/pagamentos/route.ts`

- Criada função `aplicarMultaAtraso()` que:
  - Usa `getSystemDate()` (respeita o simulador)
  - Só corre se o dia actual > 10
  - Busca propinas do mês actual com `estado = "Pendente"` e `valor_multa = 0`
  - Aplica 500 Kz em `valor_multa` e actualiza `valor_total`
- Chamada no início do GET de pagamentos para executar automaticamente

---

## TASK 3 — Protecção de Estudantes Transferidos

### Problema
O endpoint de geração de propinas (`/api/admin/gerar-propinas`) criava propinas para TODOS os estudantes `EmCurso` sem considerar quando entraram. Um estudante transferido no 3º ano recebia dívidas do 1º e 2º ano.

### Correção
**Ficheiro:** `app/api/admin/gerar-propinas/route.ts`

- O `findMany` agora também selecciona `data_cadastro`
- Antes de gerar propina para cada estudante, verifica se o ano da propina é anterior ao ano de ingresso:
  ```typescript
  if (estudante.data_cadastro) {
    const anoIngresso = estudante.data_cadastro.getFullYear()
    if (ano < anoIngresso) {
      ignoradosTransfer++
      continue
    }
  }
  ```
- Novo campo `ignoradosTransfer` no resultado e no AuditLog

---

## TASK 4 — Fluxo Multicaixa para Serviços

### Problema
Os serviços (Folha de Prova, Certificado, etc.) eram marcados como `"Pago"` imediatamente após a compra, sem qualquer passo de confirmação. Não havia código de 3 dígitos nem validação.

### Correção

#### Schema
**Ficheiro:** `prisma/schema.prisma`
- Adicionado campo `codigo_confirmacao String? @db.VarChar(3)` ao modelo Factura

#### Remoção de duplicação
**Ficheiro:** `app/api/estudante/servicos/route.ts`
- Removido o POST duplicado (que não suportava quantidades)
- Mantido apenas o GET para listar serviços

#### Novo fluxo de compra
**Ficheiro:** `app/api/estudante/servicos/comprar/route.ts`
- A Factura é criada com `estado: "Pendente"` (em vez de `"Pago"`)
- Gera código de 3 dígitos: `String(Math.floor(100 + Math.random() * 900))`
- Guarda o código em `codigo_confirmacao` na Factura
- Retorna `codigo_confirmacao` para o frontend

#### Novo endpoint de confirmação
**Novo ficheiro:** `app/api/estudante/servicos/confirmar/route.ts`
- Recebe `{ factura_id, codigo }`
- Anti-duplicado: se Factura já `"Pago"` → 400
- Valida código contra `codigo_confirmacao` na BD
- Marca como `"Pago"` e regista no AuditLog

#### Frontend
**Ficheiro:** `app/components/MulticaixaModal.tsx`
- Agora aceita `codigoGerado` e `isServico` como props
- Mostra o código de 3 dígitos em destaque (fundo amarelo, letra grande)
- Estudante digita o código para confirmar
- Usa endpoint correcto conforme o tipo (propina vs serviço)

**Ficheiro:** `app/estudante/pagamentos/PagamentosDashboard.tsx`
- Ao comprar serviço, abre MulticaixaModal com o código gerado
- `onServicoConfirmado` actualiza estado e refresca dados

---

## TASK 5 — Admin DELETE de Propinas Avançadas

### Problema
Estudantes podem auto-gerar até 3 meses futuros via `/api/estudante/pagamentos/avancar`. Não havia forma de apagar se geradas por engano.

### Solução
**Novo ficheiro:** `app/api/admin/propinas/[id]/route.ts`

- DELETE protegido: apenas admin pode executar
- Só permite apagar propinas com:
  - `emitido_por = "estudante"` — não mexe em propinas do sistema
  - `estado = "Pendente"` — não mexe em pagamentos confirmados
- Elimina o registo e regista no AuditLog:
  ```typescript
  acao: "ELIMINAR_PROPINA_AVANCO"
  ```
  com dados completos (referência, mês, ano, valor, estudante)

---

## TASK 6 — Double Discount em Bolseiros (Bug Crítico)

### Problema
Estudantes bolseiros (50%) viam o valor correcto de 30.000 Kz (de 60.000), mas quando o pagamento era processado, o desconto era aplicado **duas vezes**:
1. No `avancar/route.ts`: `valor_base = preco.valor_com_desconto` (30K) em vez de `valor_propina` (60K)
2. No GET `pagamentos/route.ts`: reaplicava o desconto sobre o valor já descontado (30K → 15K)

### Correção

#### `app/api/estudante/pagamentos/avancar/route.ts`
```typescript
// ANTES (incorrecto):
const valor_base = preco.valor_com_desconto  // 30K
const valor_total = valor_base               // 30K

// DEPOIS (correcto):
const valor_base = preco.valor_propina       // 60K (original)
const valor_total = preco.valor_com_desconto // 30K (já com desconto)
```

#### `app/api/estudante/pagamentos/route.ts`
- Removidas linhas 32-46 que reaplicavam o desconto no map de resultados
- Agora retorna os valores da BD directamente (que já estão correctos)

### Nota
Propinas geradas pelo admin (`gerar-propinas`) já estavam correctas:
- `valor_base = valor_propina` (original)
- `valor_total = valor_com_desconto` (com desconto)

---

## Resumo de Ficheiros Alterados

| Ficheiro | Tipo | Task |
|----------|------|------|
| `lib/multa-atraso.ts` | **Novo** | TASK 2 |
| `app/api/estudante/pagamentos/confirmar/route.ts` | Alterado | TASK 1 |
| `app/api/estudante/pagamentos/route.ts` | Alterado | TASK 2 + TASK 6 |
| `app/api/estudante/pagamentos/avancar/route.ts` | Alterado | TASK 6 |
| `app/api/admin/gerar-propinas/route.ts` | Alterado | TASK 3 |
| `app/api/estudante/servicos/route.ts` | Alterado | TASK 4 (removido POST) |
| `app/api/estudante/servicos/comprar/route.ts` | Alterado | TASK 4 |
| `app/api/estudante/servicos/confirmar/route.ts` | **Novo** | TASK 4 |
| `app/api/admin/propinas/[id]/route.ts` | **Novo** | TASK 5 |
| `app/components/MulticaixaModal.tsx` | Alterado | TASK 4 |
| `app/estudante/pagamentos/PagamentosDashboard.tsx` | Alterado | TASK 4 |
| `prisma/schema.prisma` | Alterado | TASK 4 (+1 campo) |

---

## Fluxos Corrigidos

### Antes
```
Propina → Geração (valor correcto) → Confirmação (muda pagamento para "Pago" cegamente)
Serviço → Compra (marca como "Pago" imediatamente) 
Bolseiro → Geração (valor já descontado) → GET (reaplica desconto → double discount)
```

### Depois
```
Propina → Geração (valor correcto) → Confirmação (verifica pendentes vencidas → "Pago" ou "Devedor") 
Serviço → Compra (cria Pendente com código 3 dígitos) → Confirmação (valida código → marca Pago)
Bolseiro → Geração (valor_base=original, valor_total=descontado) → GET (usa valores da BD)
Multa → GET verifica dia > 10 → aplica 500 Kz automaticamente
Transfer → Geração verifica data_cadastro → salta estudantes de anos anteriores
DELETE Admin → Só permite eliminar propinas "estudante" + "Pendente"