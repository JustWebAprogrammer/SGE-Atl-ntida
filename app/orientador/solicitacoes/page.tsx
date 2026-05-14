import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SolicitacoesDashboard from "./SolicitacoesDashboard"

export default async function SolicitacoesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "orientador") redirect("/login")

  return <SolicitacoesDashboard />
}