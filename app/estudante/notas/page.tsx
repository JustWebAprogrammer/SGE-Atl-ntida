import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import NotasDashboard from "./NotasDashboard"

export default async function NotasPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") redirect("/login")
  return <NotasDashboard />
}