import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import MonografiasDashboard from "./MonografiasDashboard"

export default async function MonografiasPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "orientador") redirect("/login")

  return <MonografiasDashboard />
}