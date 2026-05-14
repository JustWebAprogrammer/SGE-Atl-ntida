## 9. Regras de Negócio (Business Rules)

> **Legenda:**
>
> - ✅ **Implementado** — já existe no sistema
> - 🔧 **A implementar** — mencionado nos requisitos, ainda não feito
> - 💡 **Sugerido** — proposta adicional para robustez do sistema

---

### RN-U — Gestão de Utilizadores

| Código | Regra                                                                                                                                                                                                  | Estado           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| RN-U01  | Todos os utilizadores podem alterar o seu nome, email e palavra-passe clicando no botão com o seu nome no header do dashboard                                                                         | ✅ Implementado  |
| RN-U02  | O estudante**não pode** alterar o seu número de estudante — é um identificador permanente atribuído pelo sistema                                                                            | 🔧 A implementar |
| RN-U03  | Nenhum utilizador pode alterar a sua própria função (role) — apenas o Admin pode fazê-lo                                                                                                          | 🔧 A implementar |
| RN-U04  | O Admin pode fazer**reset de conta** de qualquer outro utilizador: a password é reposta para um valor padrão e o utilizador é forçado a alterá-la no próximo login                         | 🔧 A implementar |
| RN-U05  | Quando o Admin cria um estudante, o número de estudante é**gerado automaticamente** pelo sistema (formato sequencial por ano de entrada, ex: `2026001`) — o Admin não introduz manualmente | 🔧 A implementar |
| RN-U06  | Após um reset de conta pelo Admin, o utilizador é obrigado a definir nova password no primeiro login (`must_change_password = true`)                                                               | 💡 Sugerido      |
| RN-U07  | O Admin não pode fazer reset da sua própria conta nem de outra conta Admin                                                                                                                           | 💡 Sugerido      |

---

### RN-A — Controlo de Acesso por Função

| Código | Regra                                                                                                                                                                                                               | Estado           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| RN-A01  | O**Orientador** pertence a um departamento — só vê disciplinas e estudantes do seu departamento                                                                                                            | 🔧 A implementar |
| RN-A02  | O**Gestor** pertence a um departamento — só gere estudantes, disciplinas e monografias do seu departamento                                                                                                  | ✅ Implementado  |
| RN-A03  | O dashboard do Orientador e do Gestor mostra métricas relevantes: cursos, disciplinas, monografias, pré-projetos — não mostra total genérico de estudantes                                        | ✅ Implementado |
| RN-A04  | O**Gestor e o Admin**, quando pesquisam um estudante, podem ver o **currículo académico completo** — desde o 1.º ano até ao ano actual — e editar notas de qualquer ano (com registo em AuditLog) | 🔧 A implementar |
| RN-A05  | O**Orientador** só lança e edita notas das disciplinas que lhe estão atribuídas via `ProfessorDisciplina` no ano lectivo corrente                                                                       | ✅ Implementado  |
| RN-A06  | Nem Orientador nem Gestor podem editar notas de anos lectivos anteriores (bloqueado na API)                                                                                                                         | ✅ Implementado  |
| RN-A07  | A**Recepcionista** só acede a: pesquisa de estudantes, pagamentos presenciais (caderneta e taxa de monografia) e confirmação de levantamento físico de certificados                                       | ✅ Implementado  |

---

### RN-S — Estrutura Académica (Departamentos, Cursos e Disciplinas)

| Código | Regra                                                                                                                                                                                                 | Estado                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| RN-S01  | Cada**curso** pertence a um departamento                                                                                                                                                        | ✅ Implementado                         |
| RN-S02  | Uma**disciplina** pode pertencer a vários cursos (relação N:N via `CursoDisciplina`)                                                                                                    | ✅ Implementado                         |
| RN-S03  | Uma disciplina pertence a um departamento mas pode ser atribuída a cursos de outros departamentos (ex: "Introdução à Informática" pode estar no curso de Direito além dos cursos de Engenharia) | ✅ Implementado                         |
| RN-S04  | É o**Gestor** que atribui um professor responsável a cada disciplina, tendo em conta as atribuições inter-departamentais                                                                    | ✅ Implementado                         |
| RN-S05  | Cada disciplina tem**apenas 1 professor responsável** por ano lectivo — ao atribuir um novo, o anterior é removido automaticamente                                                           | ✅ Implementado                         |
| RN-S06  | A**taxa de monografia** é exclusiva para estudantes **finalistas** (4.º ano ou último ano do curso)                                                                                    | 🔧 A implementar                        |
| RN-S07  | A**Recepcionista** deve poder filtrar estudantes por **curso** e **ano curricular** para facilitar a pesquisa                                                                       | 🔧 A implementar                        |
| RN-S08  | O número máximo de estudantes que um orientador pode supervisionar em simultâneo é configurável pelo Gestor (sugestão: máx. 5)                                                                 | 💡 Sugerido                             |

---

### RN-CUR — Gestão de Currículo (Grade Curricular)

| Código | Regra                                                                                                                                                                                              | Estado           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| RN-CUR01 | O **Gestor** pode gerir o currículo de qualquer curso do seu departamento — atribuir disciplinas, definir ano curricular e semestre                                                              | ✅ Implementado  |
| RN-CUR02 | O sistema mostra **todas as disciplinas de todos os departamentos** para possível inclusão no currículo — com filtros por departamento e pesquisa por nome/código                                | ✅ Implementado  |
| RN-CUR03 | Uma disciplina só pode ser adicionada **uma vez** por curso — a tabela `CursoDisciplina` usa chave composta `(id_curso, id_disciplina)`                                                            | ✅ Implementado  |
| RN-CUR04 | O ano curricular atribuído no currículo pode ser diferente do `ano_curricular` original da disciplina — permite flexibilidade entre cursos                                                         | ✅ Implementado  |
| RN-CUR05 | A visualização do currículo é organizada por **ano** e **semestre** (S1/S2), mostrando todas as disciplinas atribuídas ao curso                                                                    | ✅ Implementado  |
| RN-CUR06 | O Gestor pode **remover** uma disciplina do currículo a qualquer momento — esta operação não afecta notas já lançadas (preservação de dados históricos)                                           | ✅ Implementado  |
| RN-CUR07 | A duração do curso (número de anos) limita os anos disponíveis no formulário — um curso de 4 anos só permite adicionar disciplinas no 1.º ao 4.º ano                                              | ✅ Implementado  |

> **Páginas:** `/gestor/curriculo` (frontend), APIs: `/api/gestor/curriculo` (GET/POST/DELETE), `/api/gestor/cursos`, `/api/gestor/disciplinas/disponiveis`

---

### RN-P — Progressão Académica

| Código | Regra                                                                                                                          | Estado           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| RN-P01  | Um estudante só avança para o ano seguinte quando**todas as disciplinas do ano corrente** têm `nota_final >= 10`    | ✅ Implementado  |
| RN-P02  | A progressão de ano é confirmada pelo Admin e registada no `AuditLog`                                                      | ✅ Implementado  |
| RN-P03  | Um estudante**não pode pedir orientador** sem ter **todas as disciplinas aprovadas** (nota_final >= 10 em todas)  | 🔧 A implementar |
| RN-P04  | Um estudante**não pode pagar a taxa de monografia** sem ter todas as disciplinas aprovadas                              | 🔧 A implementar |
| RN-P05  | O pagamento da taxa de monografia**só pode ser feito após** o pré-projecto ser aprovado pelo Gestor                   | 🔧 A implementar |
| RN-P06  | O**Certificado de Conclusão** só pode ser solicitado após: todos os 4 anos aprovados + nota final de monografia >= 10 | 💡 Sugerido      |

---

### RN-G — Sistema de Notas

| Código | Regra                                                                                                                                       | Estado          |
|---| ---|---|
| RN-G01  | Escala de 0 a 20. Nota mínima de aprovação: 10                                                                                           | ✅ Implementado |
| RN-G02  | Dispensa: se `tem_dispensa = true` e `nota_final_ac >= nota_dispensa (14)` → dispensado do exame                                       | ✅ Implementado |
| RN-G03  | Cadeia de exames: AC →*(se < 10 ou sem dispensa)* → Exame → *(se < 10)* → Recurso → *(se < 10)* → Exame Especial                | ✅ Implementado |
| RN-G04  | Recurso e Exame Especial são**notas secas** (máx. 12) — substituem `nota_final` directamente, não combinam com AC               | ✅ Implementado |
| RN-G05  | Recurso só pode ser lançado se existir nota de exame normal prévia                                                                       | ✅ Implementado |
| RN-G06  | Toda a alteração de nota gera entrada no `AuditLog`: id do professor, valor antes, valor depois, timestamp, IP                          | ✅ Implementado |
| RN-G07  | Notas do ano corrente ficam**bloqueadas** para o estudante se a propina estiver Pendente                                              | ✅ Implementado |
| RN-G08  | AC incompleto (ex: só AC1 e AC2 lançados, AC3 null) →`nota_final` fica null até estar completo                                        | ✅ Implementado |
| RN-G09  | O ano lectivo das notas é bloqueado pelo Gestor no final do ano — após bloqueio, ninguém pode editar (nem Gestor) sem override do Admin | 💡 Sugerido     |

### RN-G10 — Conflitos de Professor (Implementado 28/04/2026)

| Código | Regra                                                                                                                                       | Estado          |
|---| ---|---|
| RN-G10  | **Professor não pode leccionar duas disciplinas ao mesmo tempo** — mesmo que sejam disciplinas diferentes ou em cursos diferentes (ex: Matemática no 1º ano e Física no 2º ano, ambas às 08:00 Segunda) | ✅ Implementado |
| RN-G11  | **Apenas PP1 e PP2** são verificados para conflitos de professor — Exame, Recurso e Exame_Especial são vigiados por outros professores (proctors) | ✅ Implementado |
| RN-G12  | Verificação é **cross-curso**: se o professor lecciona a mesma disciplina em dois cursos, o conflito é detetado ao tentar colocar no mesmo horário | ✅ Implementado |
| RN-G13  | A verificação exclui APENAS a mesma disciplina + curso + ano + semestre — outras disciplinas do professor no mesmo horário SÃO detetadas | ✅ Implementado |

---

### RN-PAG — Sistema de Pagamentos

| Código  | Regra                                                                                                                                                                                               | Estado           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| RN-PAG01 | No dia 1 de cada mês, o sistema gera automaticamente um registo de propina `Pendente` para cada estudante activo                                                                                 | ✅ Implementado  |
| RN-PAG02 | Se o dia actual for > dia 10 e a propina estiver Pendente, é adicionada uma multa de 500 Kz automaticamente                                                                                        | ✅ Implementado  |
| RN-PAG03 | O estudante usa o código de referência Multicaixa Express para pagar; confirma com código de 3 dígitos no portal                                                                                | ✅ Implementado  |
| RN-PAG04 | O `id_estudante` na confirmação de pagamento vem sempre da sessão — nunca do request body                                                                                                     | ✅ Implementado  |
| RN-PAG05 | Protecção contra pagamento duplicado: se já existir registo `Pago` para o mesmo mês/ano/estudante → API retorna 400                                                                          | ✅ Implementado  |
| RN-PAG06 | Com propina Pendente, o estudante não pode: pedir orientador, descarregar certificados, submeter monografia, ver notas do ano corrente                                                             | ✅ Implementado  |
| RN-PAG07 | O sistema**monitoriza o tempo** que decorre desde que um pagamento ficou em atraso. Quando ultrapassa o limiar definido (sugestão: 30 dias), é gerada automaticamente uma `NotaCobrança` | 🔧 A implementar |
| RN-PAG08 | A `NotaCobrança` activa aparece como um **sticker/badge** na visão geral do estudante, com botão para descarregar o documento PDF                                                        | 🔧 A implementar |
| RN-PAG09 | Após**3 meses consecutivos** em dívida, o estado do estudante transita automaticamente de `EmCurso` para `Suspenso` (bloqueio de todos os serviços)                                    | 💡 Sugerido      |
| RN-PAG10 | A taxa de monografia é um pagamento único, separado das propinas mensais, processado pela Recepcionista                                                                                           | ✅ Implementado  |
| RN-PAG11 | A taxa de monografia só é apresentada a estudantes do**último ano do curso** (`ano_curricular = ano_total_do_curso`)                                                                     | 🔧 A implementar |

---

### RN-M — Fluxo de Monografia

| Código | Regra                                                                                                                                                                                | Estado                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| RN-M01  | O estudante só pode submeter pré-projecto se: estiver no 4.º ano + propina paga                                                                                                   | ✅ Implementado                                                 |
| RN-M02  | O estudante**não precisa** de orientação aceite para submeter o **pré-projecto**                                                                                     | ✅ Implementado                                                 |
| RN-M03  | O estudante só pode submeter a**monografia** se: 4.º ano + orientação aceite + propina paga + **taxa de monografia paga** + **todas as disciplinas aprovadas** | 🔧 A implementar (falha a condição das disciplinas e da taxa) |
| RN-M04  | Fluxo de estados:`Submetida → EmRevisao → Aprovada → ParaDefender → Defendida` (com ramo `Rejeitada`)                                                                        | ✅ Implementado                                                 |
| RN-M05  | Um pré-projecto `Reprovado` pode ser **resubmetido** pelo estudante com novo tema                                                                                           | ✅ Implementado                                                 |
| RN-M07  | O orientador só revê monografias dos seus próprios estudantes (`MonografiasParaCorrecao`)                                                                                       | ✅ Implementado                                                 |
| RN-M08  | O Gestor agenda a defesa e atribui a nota final — para qualquer monografia do departamento                                                                                          | ✅ Implementado                                                 |
| RN-M09  | A data de defesa deve ser agendada com um mínimo de**7 dias de antecedência**                                                                                                | 💡 Sugerido                                                     |
| RN-M10  | Um orientador não pode ser atribuído a mais de**N estudantes** em simultâneo (N configurável pelo Gestor)                                                                  | 💡 Sugerido                                                     |
| RN-M11  | Co-autor e Co-orientador são campos opcionais e de texto livre (podem ser pessoas externas à faculdade)                                                                            | ✅ Implementado                                                 |

---

### RN-R — Rececionista

| Código | Regra                                                                                                                                     | Estado                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| RN-R01  | A Recepcionista pode pesquisar estudantes com filtro por**curso** e **ano curricular**                                        | 🔧 A implementar             |
| RN-R02  | A Recepcionista processa pagamentos presenciais: propinas em caderneta, taxa de monografia, confirmação de levantamento de certificados | ✅ Implementado              |
| RN-R03  | A taxa de monografia só aparece na lista de cobranças da Recepcionista para estudantes**finalistas**                              | 🔧 A implementar             |
| RN-R04  | A Recepcionista**não pode** alterar notas, estados de monografia, nem dados de perfil de utilizadores                              | 💡 Sugerido (validar na API) |

---

### RN-C — Certificados

| Código | Regra                                                                                                                            | Estado          |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| RN-C01  | O estudante não pode solicitar certificados com propina Pendente                                                                | ✅ Implementado |
| RN-C02  | O**Certificado de Disciplinas** lista as notas dos anos lectivos terminados                                                | ✅ Implementado |
| RN-C03  | O**Certificado de Conclusão** só está disponível para estudantes do 4.º ano com curso completo e monografia defendida | ✅ Implementado |
| RN-C04  | Cada certificado tem um**código único de verificação** para autenticação externa                                     | 💡 Sugerido     |

---

### RN-BOL — Alunos Bolseiros

| Código  | Regra                                                                                                                                                                                               | Estado           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| RN-BOL01 | Um estudante pode ter estatuto de**bolseiro** com dois níveis: **50%** (desconto de metade na propina) ou **100%** (propina totalmente isenta)                                   | ✅ Implementado |
| RN-BOL02 | O bolseiro de**100%** está **isento de multa por atraso** — a penalização de 500 Kz não é aplicada independentemente do dia do mês                                               | ✅ Implementado |
| RN-BOL03 | O bolseiro de**50%** paga metade do valor da propina do seu ano. **Nenhuma multa é aplicada** para bolseiros de qualquer nível                                                                              | ✅ Implementado |
| RN-BOL04 | O perfil de estudantes bolseiros tem um**sticker/badge visível** na visão geral do estudante e na ficha vista pela Recepcionista, Gestor e Admin (ex: 🎓 "Bolseiro 50%" ou "Bolseiro 100%") | 🔧 A implementar |
| RN-BOL05 | Apenas o**Admin** pode atribuir, alterar ou revogar o estatuto de bolseiro de um estudante                                                                                                    | 🔧 A implementar |
| RN-BOL06 | A atribuição ou revogação de bolsa é registada no `AuditLog`                                                                                                                                 | 🔧 A implementar |
| RN-BOL07 | O estatuto de bolseiro é por**ano lectivo** — tem de ser renovado pelo Admin no início de cada ano (não é automático entre anos)                                                        | 💡 Sugerido      |
| RN-BOL08 | A bolsa só pode ser atribuída a estudantes com estado `EmCurso`                                                                                                                                 | 💡 Sugerido      |

> **Schema:** Adicionar campo `tipo_bolsa` ao modelo `Estudante` com enum `TipoBolsa { Nenhuma, Cinquenta, Cem }` e campo `ano_bolsa String?` para o ano lectivo da bolsa.

---

### RN-PREC — Gestão de Preços (Admin)

| Código   | Regra                                                                                                                                                        | Estado           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| RN-PREC01 | O**Admin** pode alterar o valor das **propinas mensais** por ano curricular (1.º ao 4.º ano)                                                   | 🔧 A implementar |
| RN-PREC02 | O**Admin** pode alterar o valor da **taxa de monografia**                                                                                        | 🔧 A implementar |
| RN-PREC03 | O**Admin** pode alterar o valor das **folhas de prova** (caderneta)                                                                              | 🔧 A implementar |
| RN-PREC04 | O**Admin** pode alterar o valor da **multa de atraso** (actualmente fixo em 500 Kz)                                                              | 🔧 A implementar |
| RN-PREC05 | Alterações de preço só têm efeito em**novos registos de pagamento** — propinas já geradas no mês corrente não são alteradas retroactivamente | 🔧 A implementar |
| RN-PREC06 | Toda a alteração de preço é registada no `AuditLog` com o valor anterior e o novo valor                                                                | 🔧 A implementar |
| RN-PREC07 | Os preços actuais são sempre visíveis numa página de configuração do Admin, com data da última actualização                                         | 💡 Sugerido      |

> **Schema:** Substituir as tabelas `Precos` e `PrecosPropina` por uma única tabela `ConfiguracaoTaxas` com uma só linha (id = 1), contendo: `propina_ano1`, `propina_ano2`, `propina_ano3`, `propina_ano4`, `valor_monografia`, `valor_folhas_prova`, `valor_multa_atraso`, `atualizado_por`, `atualizado_em`. O preço da propina de um estudante é lido com `config[propina_ano${estudante.ano_curricular}]`. Actualizar o seed para popular esta tabela em vez das duas antigas.

---

### RN-AU — Auditoria e Segurança

| Código | Regra                                                                                                                              | Estado           |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| RN-AU01 | Toda a alteração de nota é registada no `AuditLog` com: id do professor, disciplina, valor antes, valor depois, timestamp, IP | ✅ Implementado  |
| RN-AU02 | Resets de conta pelo Admin são registados no `AuditLog`                                                                         | 🔧 A implementar |
| RN-AU03 | Progressões de ano são registadas no `AuditLog`                                                                                | ✅ Implementado  |
| RN-AU04 | Os registos de `AuditLog` **não podem ser apagados** por nenhum utilizador (apenas leitura — nem o Admin apaga)          | 💡 Sugerido      |
| RN-AU05 | Retenção mínima de logs de auditoria:**5 anos** (requisito típico para acreditação académica)                         | 💡 Sugerido      |

---

### Documentação Adicional

#### Registo de Falhas e Resoluções

Para um registo completo de bugs identificados, suas causas e resoluções implementadas, consulte:

📄 **[SGE_Falhas_Resolucoes.md](./SGE_Falhas_Resolucoes.md)**

Este documento contém:
- Descrição detalhada de falhas encontradas durante desenvolvimento
- Causas raiz identificadas
- Soluções implementadas com código
- Notas para desenvolvedores sobre melhores práticas
- Referências a arquivos modificados

#### Principais Correções Aplicadas

1. **Atualização do JWT após edição de perfil**: O sistema agora utiliza um novo endpoint `/api/auth/refresh-jwt` para recarregar dados do banco após edição de perfil, seguido de chamada ao método `update()` do NextAuth.

2. **Correção de display do nome de utilizador**: Alterado para usar `nome_usuario` (nome curto) em vez de `nome_completo` no display do sidebar.

3. **Tipagem correta de sessão**: O `lib/auth.ts` foi verificado e inclui corretamente `nome_usuario` nas interfaces de Session e JWT.

---

## Resumo de Implementação

| Estado                                      | Quantidade |
| ------------------------------------------- | ---------- |
| ✅ Já implementado                         | ~32 regras |
| 🔧 A implementar (requisitos identificados) | ~21 regras |
| 💡 Sugerido (recomendações adicionais)    | ~13 regras |

> As regras 🔧 devem ser priorizadas antes da entrega — são regras de negócio directamente visíveis nos casos de uso. As regras 💡 são recomendadas para um sistema mais robusto mas podem ser implementadas após a entrega como "Post-Completion Additions".

### Funcionalidades Implementadas nesta Iteração

- **Dashboard do Gestor**: 7 cards (cursos, disciplinas, ano lectivo, pré-projetos, monografias para avaliar, para defender, defendidas sem nota)
- **Dashboard do Orientador**: 4 cards (disciplinas, ano lectivo, pré-projetos, monografias para avaliar)
- **Tabela de Disciplinas com Filtros**: filtro por ano e semestre (vindo do currículo), dropdown de alunos com notas editáveis
- **Corrigido 27/04/2026**: A página de disciplinas do gestor agora mostra **todas as disciplinas do departamento via currículo** — não apenas as que o gestor lecciona
- **Corrigido 27/04/2026**: O `ano_curricular` e `semestre` agora vêm do currículo (`CursoDisciplina`), não dos campos fixos da tabela `Disciplina`
- **Corrigido 27/04/2026**: Cada disciplina mostra badges com as suas colocações nos cursos (ex: "Engenharia · 1º Ano · S1")
- **Corrigido 27/04/2026**: Filtros dinâmicos baseados nos anos reais do currículo
- **Página de Currículo** (`/gestor/curriculo`): gestão completa do currículo dos cursos com filtros por departamento e nome
- **Navegação Centralizada**: `gestorNav.ts` com dropdown "Plano Escolar" (como o admin)
- **Página de Horário** (`/gestor/horario`): grade semanal (Segunda-Sábado) com disciplinas, horas e salas
- **Página de Plano de Provas** (`/gestor/plano-provas`): calendário de avaliações por mês (AC1, AC2, AC3, Exame, Recurso)
- **APIs**: `/api/gestor/resumo`, `/api/orientador/resumo`, `/api/gestor/curriculo`, `/api/gestor/cursos`, `/api/gestor/disciplinas/disponiveis`, `/api/gestor/horario`, `/api/gestor/plano-provas`

> ⚠️ **Nota para desenvolvimento**: Após esta alteração, correr `npx prisma migrate dev` para criar as novas tabelas `HorarioAula` e `PlanoProva` na base de dados.
