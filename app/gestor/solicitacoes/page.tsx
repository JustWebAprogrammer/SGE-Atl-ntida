import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SolicitacoesGestorDashboard from "./SolicitacoesGestorDashboard"

export default async function SolicitacoesGestorPage() {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user.role === "orientador" && session.user.e_gestor)) redirect("/login")

  return <SolicitacoesGestorDashboard />
}