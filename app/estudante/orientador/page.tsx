import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import OrientadorDashboard from "./OrientadorDashboard"

export default async function OrientadorPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") redirect("/login")

  return <OrientadorDashboard />
}