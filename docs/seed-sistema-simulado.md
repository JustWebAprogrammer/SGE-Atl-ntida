# Seed e Simulador do Sistema — Documentação

## Visão Geral

Foram criados novos scripts de seed e melhorias no dashboard do ano lectivo para permitir uma **simulação completa do tempo** no sistema SGE Atlântida.

---

## 1. Scripts de Seed

### 1.1 `npm run seed-base` — Reset Completo + Dados Base

**Ficheiro:** `prisma/seed-base.ts`

**O que faz:**
- Apaga TODOS os dados usando `TRUNCATE TABLE ... CASCADE` (ignora tabelas que não existem)
- Cria dados estruturais:
  - **3 Departamentos:** Eng. Informática, Eng. Civil, Gestão Empresarial
  - **3 Cursos:** cada um no seu departamento, com durações (4, 4, 3 anos)
  - **31 Disciplinas:** 15 EI + 8 EC + 8 GE, com códigos únicos (ex: `EI-MAT1`, `EC-MS1`)
  - Ligações `CursoDisciplina` para cada disciplina
  - Configuração de taxas (propinas por ano, multas, taxa de reenrollment)
  - Preços por curso/ano
  - 6 Serviços acadêmicos
- Cria utilizadores:
  - **1 Admin:** `admin@ispatlantida.ao` / `admin123`
  - **4 Orientadores:** 2 gestores, 2 não-gestores
  - **2 Recepcionistas**
- Configuração do sistema:
  - Ano lectivo: `2025/2026`
  - Matrícula: **FECHADA** (15/01/2026 a 31/03/2026)
  - Simulador: **INACTIVO**

**Requisitos:** Nenhum (não precisa de servidor a rodar)

---

### 1.2 `npm run seed-estudantes` — Criar Estudantes

**Ficheiro:** `prisma/seed-estudantes.ts`

**O que faz:**
1. **Verifica a matrícula** via `GET /api/admin/sistema/config`
   - ✅ Se aberta → continua
   - ❌ Se fechada → mostra erro e aborta
2. Carrega dados base (departamentos, cursos, disciplinas, orientadores)
3. **Cria 17 estudantes** em 3 cursos com diferentes estados:
   - **EI:** Ben (2º, bolsa 50%), Ana (4º finalista), Carlos (4º), Maria (4º), Pedro (4º, sem orientação), João (3º), Sofia (2º), Tiago (1º), Rui (🎓 Finalizado), Lara (⛔ Suspenso)
   - **EC:** André (3º), Beatriz (2º), Diogo (4º finalista), Helena (🎓 Finalizado)
   - **GE:** Ricardo (3º finalista), Vera (2º), Nuno (1º)
4. **Atribui disciplinas** a cada estudante via `atribuirDisciplinasAoEstudante()` — cria registos de Nota em branco
5. **Cria currículos acadêmicos** para anos anteriores
6. **Cria notas manuais** para estudantes específicos (Ben, João, Rui, Lara, André, Helena) com cálculos reais de nota final, dispensa, recurso
7. **Atribui professores** (orientadores) a disciplinas
8. **Cria solicitações de orientação** (Aceites e Pendentes)
9. **Cria monografias** submetidas para finalistas
10. **Cria propinas** Pendentes para estudantes activos

**Requisitos:** Servidor a rodar (`npm run dev`) + matrícula aberta no simulador

**Ano lectivo:** Usa `ano_lectivo_atual` vindo da API (respeita o simulador)

---

### 1.3 `npm run seed-fix-ano` — Sincronizar Ano Lectivo

**Ficheiro:** `prisma/seed-fix-ano-lectivo.ts`

**O que faz:**
- Consulta o ano lectivo actual via API
- Actualiza `ano_lectivo` em todas as tabelas para o ano simulado:
  - `ProfessorDisciplina` (com tratamento de unique constraint)
  - `Estudante.ano_electivo` (apenas EmCurso)
  - `HorarioAula`, `PlanoProva`, `PeriodoProva`
- **Não altera** Notas (são históricas)

**Requisitos:** Servidor a rodar (`npm run dev`)

---

### 1.4 `npm run seed-limpar-estudantes` — Limpar Apenas Estudantes

**Ficheiro:** `prisma/seed-limpar-estudantes.ts`

**O que faz:**
- Apaga dados relacionados com estudantes (TRUNCATE CASCADE):
  - SnapshotSemestre, Declaracao, Certificado*, SolicitaçãoOrientacao, Premonografia, Monografia*, Nota, PagamentoPropina, NotaCobranca, Factura, CurriculoAcademico, Estudante
- Apaga usuários do tipo `estudante`
- **Mantém** todo o resto (admin, orientadores, recepcionistas, cursos, disciplinas, etc.)

**Requisitos:** Nenhum (não precisa de servidor)

---

## 2. Melhorias no AnoLectivoDashboard

**Ficheiro:** `app/admin/sistema/ano-lectivo/AnoLectivoDashboard.tsx`

### 2.1 DatePickerPT
- Substituídos todos os inputs `type="date"` pelo componente `DatePickerPT` (estilo escuro, calendário português)
- Afecta: Ano Lectivo Início/Fim, Matrícula Início/Fim, Data do Simulador

### 2.2 Botões "Avançar" Interactivos
Os botões "Avançar 1 mês" e "Avançar 1 semana" agora:
1. Calculam a nova data localmente
2. Enviam a nova data para `POST /api/admin/sistema/simulador`
3. Chamam `fetchConfig()` para recarregar os status cards

**Antes:** Só mudavam o estado React local — os cards não actualizavam
**Depois:** Servidor + frontend sincronizados — tudo actualiza em tempo real

---

## 3. Credenciais

Ver `docs/credenciais-seed.md` para a lista completa.

**Resumo:**
| Tipo | Senha Padrão |
|------|-------------|
| Admin | `admin123` |
| Orientadores | `orientador123` |
| Recepcionistas | `recepcao123` |
| Estudantes (1º-3º ano) | `student123` |
| Estudantes (4º ano) | `student4ano123` |

---

## 4. Fluxo de Trabalho Recomendado

```bash
# 1. Reset completo (não precisa de servidor)
npm run seed-base

# 2. Iniciar servidor
npm run dev

# 3. Ir ao Admin > Ano Lectivo:
#    - Configurar datas do ano lectivo
#    - Escolher data dentro do período de matrícula
#    - Clicar "Activar Simulador"

# 4. Criar estudantes (só se matrícula aberta)
npm run seed-estudantes

# (Opcional) Se mudar o simulador depois de criar estudantes:
npm run seed-fix-ano

# (Opcional) Para apagar só estudantes e recriar:
npm run seed-limpar-estudantes
npm run seed-estudantes
```

## 5. Casos de Teste

### Estudantes especiais:
| Estudante | Situação | O que testar |
|-----------|----------|--------------|
| Pedro Costa (EI) | 4º ano, sem orientação | Fluxo completo de pedido de orientação |
| Maria Santos (EI) | 4º ano, orientação pendente | Aceitar/recusar solicitação |
| Rui Martins (EI) | Finalizado | Ver certificado de conclusão |
| Helena Mendes (EC) | Finalizado | Ver certificado de conclusão |
| Lara Costa (EI) | Suspenso | Tentar re-matrícula |
| Ben Minogashita (EI) | 2º ano, bolsa 50% | Verificar desconto nas propinas |

### Simulador:
- Avançar para dentro do período de matrícula → status "Abertas"
- Avançar para fora → status "Fechadas"
- Mudar de ano lectivo → `seed-fix-ano` sincroniza tudo