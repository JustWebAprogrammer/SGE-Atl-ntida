import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import LayoutDocumentosDashboard from "./LayoutDocumentosDashboard"

export default async function LayoutDocumentosPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") redirect("/login")
  return <LayoutDocumentosDashboard />
}