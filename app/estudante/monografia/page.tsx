import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import MonografiaDashboard from "./MonografiaDashboard"

export default async function MonografiaPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") redirect("/login")

  return <MonografiaDashboard />
}