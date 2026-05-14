import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import CertificadosDashboard from "./CertificadosDashboard"

export default async function CertificadosPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") redirect("/login")

  return <CertificadosDashboard />
}