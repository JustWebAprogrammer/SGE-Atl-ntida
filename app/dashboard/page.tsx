import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const role = session.user.role
  const e_gestor = session.user.e_gestor

  if (role === "admin") redirect("/admin")
  if (role === "estudante") redirect("/estudante")
  if (role === "orientador" && e_gestor) redirect("/gestor")
  if (role === "orientador") redirect("/orientador")
  if (role === "recepcionista") redirect("/recepcionista")

  redirect("/login")
}
