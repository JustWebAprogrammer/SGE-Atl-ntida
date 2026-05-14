// ✅ LISTA OFICIAL DOS MENUS ADMIN
// Esta é a ÚNICA fonte verdade. Altera aqui e aparece em TODAS as paginas automaticamente!

export const adminNavItems = [
  { label: "Visão Geral", path: "/admin" },
  { 
    label: "Usuários", 
    children: [
      { label: "Administradores", path: "/admin/admins" },
      { label: "Estudantes", path: "/admin/estudantes" },
      { label: "Orientadores", path: "/admin/orientadores" },
      { label: "Recepcionistas", path: "/admin/recepcionistas" },
      
    ]
  },
  { label: "Departamentos", path: "/admin/departamentos" },
  { label: "Cursos", path: "/admin/cursos" },
  { label: "Disciplinas", path: "/admin/disciplinas" },
  { label: "Preços", path: "/admin/precos" },
  { 
    label: "Sistema", 
    children: [
      { label: "Ano Lectivo", path: "/admin/sistema/ano-lectivo" },
      { label: "Layout de Documentos", path: "/admin/sistema/layout-documentos" },
      { label: "Assinaturas", path: "/admin/sistema/assinaturas" },
      { label: "Registos Lectivo", path: "/admin/sistema/registos" },
      { label: "Finalistas", path: "/admin/sistema/finalistas" },
    ]
  },
  { label: "Registo de auditoria", path: "/admin/audit" },
]
