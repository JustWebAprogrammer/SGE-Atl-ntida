# Layout Spec — Documentos PDF (SGE Atlântida)

> Este documento descreve o layout visual **exacto** de cada PDF gerado pelo sistema SGE Atlântida.
> Destina-se a guiar a implementação com `@react-pdf/renderer`.
> Baseia-se nas imagens de preview do sistema e nos ficheiros TSX de referência.

---

## Estrutura Comum a Todos os Documentos

Todos os três documentos partilham a mesma estrutura base. As secções seguintes descrevem essa estrutura. As diferenças específicas de cada documento são detalhadas depois.

### Página

- Tamanho: **A4** (`595 x 842 pt`)
- Padding interno: **40pt** em todos os lados
- Fonte base: **Helvetica**, tamanho **11pt**
- Cor de texto padrão: **preto** (`#000000`)

### Borda da Página

- Uma borda rectangular fina (`1px solid #000`) posicionada **absolutamente**
- Posição: `top: 20, left: 20, right: 20, bottom: 20`
- Fica por baixo de todo o conteúdo (deve ser o primeiro elemento renderizado)

---

### Número do Documento

- Posição: **absoluta**, canto superior direito
- Coordenadas: `top: 40, right: 40`
- Texto exemplo: `Nº DOC-2024/0042`
- Estilo: tamanho **10pt**, cor cinzento (`#666666`)
- Fica por cima da borda, mas abaixo do header visualmente

---

### Header (Cabeçalho)

Layout em linha horizontal (`flexDirection: row`, `alignItems: center`), com `marginBottom: 20`.

```
[ LOGO ]   [ NOME DA UNIVERSIDADE (centrado)  ]
           [ DIRECÇÃO ACADÉMICA (subtítulo)   ]
```

**Logo:**
- Imagem quadrada, **60 x 60 pt**
- `marginRight: 20`
- Só é renderizado se `logoUrl` for fornecido e não vazio
- No preview aparece como círculo vermelho com "U" — é a imagem real da instituição

**Bloco de texto do header (`flex: 1`, centrado):**
- Linha 1: Nome da universidade — **14pt, bold** — ex: `Instituto Superior Politécnico Atlântida`
- Linha 2: Subtítulo fixo — **11pt**, cor `#666666` — texto: `DIRECÇÃO ACADÉMICA`
- `marginBottom: 4` entre as duas linhas

---

### Linha Divisória

- `borderBottom: 1px solid #000`
- `marginVertical: 15` (margem acima e abaixo)
- Vai de margem a margem (largura total da área de conteúdo)

---

### Título do Documento

- Centrado horizontalmente
- Tamanho: **18pt**, **bold**
- `textTransform: uppercase` (já vem em maiúsculas no config, mas aplicar mesmo assim)
- `marginVertical: 20`
- Exemplos: `DECLARAÇÃO ACADÉMICA`, `CERTIFICADO DE LICENCIATURA`, `CERTIFICADO DE DISCIPLINAS`

---

### Texto do Corpo

- Container com `marginBottom: 20`
- Texto com `lineHeight: 1.6`, `textAlign: justify`, `marginBottom: 10`
- O texto vem do `config.texto_corpo` com os placeholders `{NOME_COMPLETO}`, `{NUMERO_ESTUDANTE}`, etc. já substituídos antes de chegar ao componente
- **Não há bold dentro do parágrafo** — é texto corrido simples
- Tamanho: **11pt** (herda da página)

---

### Rodapé (Footer)

`marginTop: 30` em relação ao conteúdo anterior.

#### Linha de Data

- Alinhamento: **direita**
- `marginBottom: 10`
- Formato: `{Localidade}, {dia} de {mês} de {ano}` — ex: `Luanda, 7 de maio de 2026`
- Usa `toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })`

#### Bloco de Assinaturas

- `flexDirection: row`, `justifyContent: space-between`, `marginTop: 40`
- Dois blocos simétricos, cada um com `width: 45%`, `textAlign: center`

**Estrutura de cada bloco de assinatura:**

```
[Imagem da assinatura — 100x50pt, objectFit: contain, marginTop: 10]
        (só renderiza se a URL existir)
─────────────────────────────────────────
   Label — ex: "O(A) Director(a) Académico(a)"     (fontSize: 11, marginTop: 5)
   Nome  — ex: "Prof. Dr. António Ferreira"         (fontSize: 11)
```

- A linha (`borderTop: 1px solid #000`) tem `marginTop: 50` acima dela (espaço para assinatura manuscrita) e `marginBottom: 5` abaixo
- Se a imagem de assinatura for fornecida, fica **acima** da linha
- O placeholder `[Assinatura]` que aparece no preview é apenas visual do sistema de preview — no PDF real aparece a imagem ou espaço vazio
- **Esquerda:** Director Académico — label: `config.label_assinatura_diretor`, nome: `directorName` (opcional)
- **Direita:** Presidente — label: `config.label_assinatura_presidente`, nome: `presidentName`

---

### QR Code (só quando `config.tem_qr_code === true`)

- Posição: **absoluta**, canto inferior direito
- Coordenadas: `bottom: 40, right: 40`
- Imagem QR: **80 x 80 pt**
- Texto abaixo: `config.texto_verificacao` — ex: `Verifique a autenticidade deste documento em linha`
  - Tamanho: **9pt**, cor `#666666`, `marginTop: 5`, centrado
- `alignItems: center`

---
---

## Documento 1 — Declaração Académica

**Ficheiro:** `DeclaracaoPDF.tsx`
**Config key:** `"DeclaracaoAcademica"`
**QR Code:** ✅ Activo (`tem_qr_code: true`)

### Conteúdo após o Título

Apenas o **texto do corpo** — um único parágrafo justificado com os placeholders substituídos. Não há tabela de notas nem secção por ano curricular neste documento.

O texto segue o formato:

> O {NOME_UNIVERSIDADE} declara que {NOME_COMPLETO}, com o número de matrícula {NUMERO_ESTUDANTE}, encontra-se matriculado(a) no {ANO_CURRICULAR}º ano do curso de {NOME_CURSO}, no ano lectivo de {ANO_LECTIVO}.

Imediatamente após o corpo vem o rodapé (data + assinaturas + QR).

> ⚠️ **Nota de implementação:** O TSX actual contém código para uma tabela de notas por ano (`gradesByYear`) que **não deve ser renderizada** na versão actual. Existe um problema pendente a resolver futuramente — ignorar essa secção por enquanto.

---
---

## Documento 2 — Certificado de Licenciatura

**Ficheiro:** `CertificadoConclusaoPDF.tsx`
**Config key:** `"CertificadoConclusao"`
**QR Code:** ✅ Activo (`tem_qr_code: true`)

### Tabela de Médias por Ano + Nota Final

Aparece após o texto do corpo. É uma **única tabela** com `border: 1px solid #000`.

- **2 colunas:**

| Coluna         | flex | textAlign |
|----------------|------|-----------|
| Ano Curricular | 2    | left      |
| Média do Ano   | 1    | center    |

**Header:**
- `backgroundColor: #f0f0f0`
- `borderBottom: 1px solid #000`
- `fontWeight: bold`, `padding: 8`

**Linhas de anos** (uma por cada entrada em `gradesByYear`):
- Texto coluna esquerda: `{N}º Ano`
- `borderBottom: 1px solid #ddd`

**Linha Monografia:**
- Texto coluna esquerda: `Monografia`
- Valor: `monografiaGrade`
- `borderBottom: 1px solid #ddd`

**Linha Média Final** (última linha, destacada):
- `backgroundColor: #e8f5e9` (verde muito claro)
- Texto coluna esquerda: `Média Final` — **bold**
- Valor: `finalGrade` — **bold**
- `borderBottom: 1px solid #ddd`

> ⚠️ **Nota:** O código original tinha um `finalGradeBox` verde separado para a nota final. Esse bloco **não deve existir** — a nota final fica apenas na última linha da tabela, com fundo verde como descrito acima. O preview confirma que não há caixa separada, apenas a linha destacada dentro da tabela.

---
---

## Documento 3 — Certificado de Disciplinas

**Ficheiro:** `CertificadoDisciplinasPDF.tsx`
**Config key:** `"CertificadoDisciplinas"`
**QR Code:** ❌ Inactivo (`tem_qr_code: false`) — o toggle aparece desligado no sistema

### Substituição de Placeholders no Corpo

Neste documento, ao contrário dos outros, a substituição de placeholders é feita **no próprio componente** (não vem pré-processada):

```tsx
config.texto_corpo
  .replace("{NOME_COMPLETO}", studentName)
  .replace("{NUMERO_ESTUDANTE}", studentNumber)
  .replace("{NOME_CURSO}", courseName)
  .replace("{NOME_UNIVERSIDADE}", config.nome_universidade)
```

### Tabela de Disciplinas

Aparece após o texto do corpo. Uma única tabela com `border: 1px solid #000`.

- **5 colunas:**

| Coluna         | flex | textAlign |
|----------------|------|-----------|
| Disciplina     | 2    | left      |
| Semestre       | 1    | center    |
| Ano Curricular | 1    | center    |
| Nota Final     | 1    | center    |
| Situação       | 1    | center    |

**Header:**
- `backgroundColor: #f0f0f0`
- `borderBottom: 1px solid #000`
- Todas as células: `padding: 8`, `fontWeight: bold`, `textAlign: center`
- A célula "Disciplina" tem `flex: 2, textAlign: left`

**Linhas de dados** (uma por cada entrada em `disciplinas`):
- `borderBottom: 1px solid #ddd`
- Coluna "Ano Curricular": renderiza `{disc.ano_curricular}º Ano`
- Coluna "Situação": no preview aparece em **verde** (`color: #2e7d32` ou similar) quando o valor é `"Aprovado"` — implementar como texto condicional: se `situacao === "Aprovado"`, aplicar cor verde; caso contrário, cor padrão (preto ou vermelho para reprovado)

> ⚠️ **Nota sobre o QR Code:** Este documento **não renderiza o QR code**. Não deve existir nenhuma `View` de QR no footer — simplesmente omitir a secção inteira.

---
---

## Resumo de Diferenças entre Documentos

| Característica              | Declaração Académica | Certificado de Licenciatura | Certificado de Disciplinas |
|-----------------------------|----------------------|-----------------------------|----------------------------|
| QR Code                     | ✅                    | ✅                           | ❌                          |
| Tabela por ano (com linhas) | ❌ (pendente)         | ❌                           | ❌                          |
| Tabela única de anos        | ❌                    | ✅                           | ❌                          |
| Tabela de disciplinas       | ❌                    | ❌                           | ✅                          |
| Linha Média Final destacada | ❌                    | ✅ (fundo verde na tabela)   | ❌                          |
| Situação colorida           | ❌                    | ❌                           | ✅ (verde se Aprovado)      |
| Substituição no componente  | ❌ (vem do API)       | ❌ (vem do API)              | ✅                          |
| Número de colunas na tabela | 4                    | 2                           | 5                          |

---

## Valores de Estilo de Referência

```
Cores:
  preto:           #000000
  cinzento escuro: #666666
  fundo header:    #f0f0f0
  fundo final row: #e8f5e9
  verde situação:  #2e7d32
  vermelho situação (reprovado): #c62828

Fontes:
  família base:    Helvetica
  tamanho base:    11pt
  título:          18pt, bold
  nome universidade: 14pt, bold
  cabeçalho ano:   13pt, bold
  nº documento:    10pt
  texto QR:        9pt

Espaçamentos:
  padding página:  40pt
  borda página:    20pt do limite exterior
  logo:            60x60pt, marginRight: 20
  assinatura img:  100x50pt
  QR image:        80x80pt
  linha assinatura: marginTop: 50 (espaço manuscrito)
```

---

*Spec gerada com base nos ficheiros `DeclaracaoPDF.tsx`, `CertificadoConclusaoPDF.tsx`, `CertificadoDisciplinasPDF.tsx` e nos screenshots do preview do sistema SGE Atlântida em `localhost:3000`.*
