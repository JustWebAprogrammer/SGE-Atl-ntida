import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import RecepcionistaDashboard from "./RecepcionistaDashboard"

export default async function RecepcionistaPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "recepcionista") {
    redirect("/login")
  }

  return <RecepcionistaDashboard />
}