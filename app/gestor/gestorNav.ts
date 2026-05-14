// ✅ LISTA OFICIAL DOS MENUS DO GESTOR
// Esta é a ÚNICA fonte verdade. Altera aqui e aparece em TODAS as paginas automaticamente!

export const gestorNavItems = [
  { label: "Visão Geral", path: "/gestor" },
  { label: "Estudantes", path: "/gestor/estudantes" },
  { label: "Disciplinas", path: "/gestor/disciplinas" },
  { label: "Solicitações", path: "/gestor/solicitacoes" },
  { label: "Monografias", path: "/gestor/monografias" },
  {
    label: "Plano Escolar",
    children: [
      { label: "Currículo", path: "/gestor/curriculo" },
      { label: "Horário", path: "/gestor/horario" },
      { label: "Plano de Provas", path: "/gestor/plano-provas" },
    ]
  },
]
