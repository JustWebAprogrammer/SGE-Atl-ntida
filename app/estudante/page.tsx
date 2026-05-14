import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import EstudanteDashboard from "./EstudanteDashboard"

export default async function EstudantePage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") redirect("/login")
  return <EstudanteDashboard />
}