# SGE Atlântida — Sistema de Cores e Acessibilidade
> Criado em 15/05/2026 · Última actualização 16/05/2026

## 1. Paleta de Cores do Sistema

O tema do SGE é escuro (`#0d0f14` fundo geral, `#1e2230` cartões). Para garantir boa legibilidade, o texto segue esta hierarquia:

| Uso | Cor Antiga | Cor Nova | Contraste (sobre `#1e2230`) | Norma WCAG |
|-----|-----------|---------|-----------------------------|------------|
| Texto principal (títulos, valores) | `#e8eaf0` | `#e8eaf0` | ~10:1 ✅ | AAA |
| **Texto secundário** (labels, th, descrições, sidebar) | `#9098b0` | **`#d0d7e8`** | ~4:1 → **~8:1** ✅ | AA/AAA |
| **Texto terciário** (timestamps, badges inactivos, metadados) | `#555e78` | **`#b0b8cf`** | ~3:1 → **~6:1** ✅ | AA |
| Fundo de cartões | — | `#1e2230` | — | — |
| Fundo geral | — | `#0d0f14` | — | — |

### Quando usar cada cor

- **`#e8eaf0`** — Nomes, títulos de cartões, valores numéricos, texto principal que o utilizador precisa ler primeiro
- **`#d0d7e8`** (a mais comum) — Labels de formulários ("Nome Completo *", "Email *"), cabeçalhos de tabelas (th), descrições/blocos de texto, itens da sidebar, placeholders, textos de informação ("A carregar...", "Nenhum registo encontrado")
- **`#b0b8cf`** — Timestamps ("Submetido em 15/05/2026"), badges de estado "Cancelado"/"Inactivo", metadados (códigos de disciplina, nº de estudante), labels uppercase tipo "OBSERVAÇÕES", detalhes de ficheiros ("2.4 MB"), legendas secundárias
- **`#f0a500`** (destaque dourado) — Badge de senha padrão, elementos de alerta/informação, links/hover

### Cores de realce (badges, estados)

| Estado | Cor | Fundo |
|--------|-----|-------|
| Sucesso / Aprovado | `#22c55e` | `rgba(34,197,94,0.12)` |
| Erro / Reprovado | `#e03d3d` | `rgba(224,61,61,0.12)` |
| Atenção / Pendente | `#f0a500` | `rgba(240,165,0,0.15)` |
| Info / Processando | `#3b82f6` | `rgba(59,130,246,0.12)` |
| Inactivo / Cancelado | `#b0b8cf` | `rgba(176,184,207,0.2)` |
| Gestor (roxo) | `#9b59b6` | `rgba(155,89,182,0.12)` |

## 2. Password Padrão nos Modais de Criação

Sempre que um administrador cria um novo funcionário (Admin, Orientador, Recepcionista), o sistema gera uma senha automática. Para o admin saber qual é, todos os modais de criação mostram um badge informativo:

### Onde se aplica

| Painel | Ficheiro | Password | Linhas |
|--------|----------|---------|--------|
| Admin → Administradores | `app/admin/admins/page.tsx` | `admin123` | ~404-407 |
| Admin → Orientadores | `app/admin/orientadores/OrientadoresAdminDashboard.tsx` | `orientador123` | ~507-509 |
| Admin → Recepcionistas | `app/admin/recepcionistas/page.tsx` | `recepcionista123` | ~391-395 |

### Código padrão (consistente nos 3 painéis)

```tsx
{!editingRecepcionista && (
  <div style={{ marginBottom: '20px', padding: '12px', background: '#f0a50020', borderRadius: '8px' }}>
    <span style={{ color: '#f0a500', fontSize: '13px' }}>🔑 Senha padrão: <strong>recepcionista123</strong></span>
  </div>
)}
```

**Regras:**
- O badge só aparece quando **`editingX === null`** (ou seja, no modal de criação, não na edição)
- Usa a variável `SENHA_PADRAO` definida no início do componente — se precisar mudar a password, muda só essa variável
- Fundo: `#f0a50020` (dourado com 12% opacidade)
- Texto: `#f0a500` com `fontSize: '13px'`

### Botão Reset (só na edição)

No modal de edição, aparece um botão "🔑 Reset" / "🔑 Reset Password" que redefine a senha para o mesmo valor padrão. Usa `confirm()` antes de aplicar.

## 3. Como Adicionar Novos Componentes

### Para manter a consistência visual:

1. Usar sempre **inline styles** — o projecto não usa Tailwind nem CSS modules nos componentes do dashboard
2. Seguir a hierarquia de cores:
   - Labels e textos principais → `#d0d7e8`
   - Metadados e timestamps → `#b0b8cf`
   - Valores / nomes → `#e8eaf0`
3. Para badges de estado, usar as cores da tabela acima com fundo a 12-15% opacidade
4. Se precisar de criar um modal de criação de funcionário, copiar o padrão do badge de senha (secção 2)

### Exemplo boilerplate para um label:

```tsx
<label style={{ display: 'block', marginBottom: '6px', color: '#d0d7e8', fontSize: '13px' }}>
  Nome do Campo *
</label>
```

## 4. Reset de Password (API)

Sempre que um admin faz reset à password de um funcionário, o sistema faz um `PATCH` para a API correspondente.

### Rotas de Reset

| Funcionário | Ficheiro da Rota | Método | Rota |
|-------------|-----------------|--------|------|
| Administrador | `app/api/admin/admins/route.ts` | `PATCH` | `/api/admin/admins` |
| Orientador | `app/api/admin/orientadores/route.ts` | `PATCH` | `/api/admin/orientadores` |
| Recepcionista | `app/api/admin/recepcionistas/[id]/route.ts` | `PATCH` | `/api/admin/recepcionistas/{id}` |

### Estrutura do Request PATCH

```json
{
  "id_recepcionista": 2,
  "tipo": "reset_password"
}
```

### Funcionamento

1. O frontend envia `PATCH /api/admin/recepcionistas/2` com body `{ tipo: "reset_password" }`
2. A API busca o recepcionista pelo `id_recepcionista` para obter o `id_usuario`
3. Faz hash da senha padrão (`recepcionista123`) com `bcrypt.hash(senha, 10)`
4. Actualiza `usuario.senha` na base de dados
5. Retorna mensagem de sucesso

### Importante

- O ficheiro `app/api/admin/recepcionistas/[id]/route.ts` precisa de ter `import bcrypt from 'bcryptjs'` para funcionar
- As senhas são armazenadas com hash bcrypt (cost factor 10)
- O botão "🔑 Reset" no modal de edição dispara este PATCH

## 5. Fluxo de Serviços Físicos (Recepcionista)

O recepcionista gere documentos **físicos** que o estudante paga como serviço extra e vai buscar pessoalmente.

### Serviços considerados físicos

| Serviço | Gera certificado físico? | Aparece no recepcionista como |
|---------|------------------------|-------------------------------|
| Certificado de Conclusão | ✅ Sim, `isFisico: true` | "Certificados para Levantar" |
| Declaração Académica | ✅ Sim, `isFisico: true` | "Certificados para Levantar" |
| Folha de Prova | ❌ Não (não é documento) | "Pagamentos e Documentos" (factura) |

### Como detectar (`lib/servicos-tipos.ts`)

```typescript
export function isServicoFisico(descricao: string): boolean {
  const d = descricao.toLowerCase()
  return d.includes("certificado") || d.includes("declara") || d.includes("folha de prova")
}
```

### Fluxo completo

1. **Estudante** paga por um serviço físico em `/estudante/servicos` (confirma com código Multicaixa)
2. **API** (`app/api/estudante/servicos/confirmar/route.ts`):
   - Marca a factura como "Pago"
   - Se for Certificado de Conclusão → cria `Certificado` com `isFisico: true` e `tipo: "Conclusao"`
   - Se for Declaração Académica → cria `Certificado` com `isFisico: true` e `tipo: "Participacao"`
   - Se for Folha de Prova → só marca factura como paga (não gera certificado)
3. **Recepcionista** abre a ficha do estudante em `/recepcionista/estudante/[id]`
4. **API do recepcionista** (`app/api/recepcionista/estudante/[id]/route.ts`) filtra:
   ```typescript
   certificados: { where: { isFisico: true } }
   ```
5. **Frontend** mostra secção "Certificados para Levantar" com botão "✓ Confirmar Levantamento"
6. Recepcionista clica no botão, o status do certificado muda para "Entregue"

### Campo no Schema

```prisma
model Certificado {
  ...
  isFisico Boolean @default(false)
  ...
}
```

Adicionado via `prisma db push` na Neon.

## 6. PDFs do Recepcionista (sem QR Code)

Os PDFs gerados pelo recepcionista são documentos **físicos** (carimbados manualmente), por isso **não têm QR code** de verificação digital. As assinaturas do presidente/director são mantidas.

| Rota | Componente PDF | QR Code | Assinaturas |
|------|---------------|---------|-------------|
| `/api/recepcionista/estudantes/[id]/declaracao/pdf` | `DeclaracaoPDF` | ❌ Removido | ✅ Mantidas |
| `/api/recepcionista/certificados/[id]/pdf` (Conclusão) | `CertificadoConclusaoPDF` | ❌ Removido | ✅ Mantidas |
| `/api/recepcionista/certificados/[id]/pdf` (Disciplinas) | `CertificadoPDF` | ❌ Removido | ✅ Mantidas |

Os PDFs **digitais** gerados pelo estudante em `/estudante/certificados` continuam a ter QR code com link de verificação.

## 7. Botões Removidos no Recepcionista

No ficheiro `app/recepcionista/estudante/[id]/EstudanteDetalhe.tsx` foram removidos:

| Botão | Motivo |
|-------|--------|
| 📄 **Documento** | Gerava HTML manual de declaração/certificado — documentos digitais são gerados pelo estudante |
| 📦 **Entregar / Entregue** | Marcava como entregue fisicamente — só faz sentido para docs físicos pagos como serviço |

**Funções removidas:**
- `marcarEntregue()` — já não é usada
- `imprimirDocumento()` — gerava HTML manual
- `ContagemImpressao` type e state `contagens` — já não são necessários

**Função simplificada:**
- `auditarImpressao()` — agora só aceita `id_factura` (sempre regista como "fatura", já que documentos foram removidos)

## 8. Dropdown no Histórico de Propinas

Quando o histórico de propinas tem mais de 3 itens, o card recolhe mostrando apenas os 3 mais recentes, com um botão para expandir:

- Estado inicial: mostra as 3 propinas mais recentes + botão "▼ Mostrar tudo (12)"
- Ao clicar: expande para mostrar todas + botão "▲ Recolher"

Implementado no ficheiro `app/recepcionista/estudante/[id]/EstudanteDetalhe.tsx` com state `propinasExpandido`.

## 9. Histórico de Alterações

| Data | Descrição | Autor |
|------|-----------|-------|
| 16/05/2026 | Adicionado dropdown no histórico de propinas quando extenso (+3 itens) | Cline |
| 15/05/2026 | Criado fluxo de serviços físicos com campo `isFisico`, filter na API e criação automática de certificados no pagamento | Cline |
| 15/05/2026 | Removidos botões 📄 Documento e 📦 Entregar de documentos digitais no recepcionista | Cline |
| 15/05/2026 | Removido QR code dos PDFs emitidos pelo recepcionista (declaração e certificados) | Cline |
| 15/05/2026 | Corrigido handler PATCH em falta no reset de password do recepcionista (estava 405) + import bcrypt | Cline |
| 15/05/2026 | Substituição global `#9098b0`→`#d0d7e8` e `#555e78`→`#b0b8cf` (41 ficheiros) para melhorar contraste | Cline |
| 15/05/2026 | Adicionado badge de senha padrão no modal de criação de recepcionistas | Cline |
