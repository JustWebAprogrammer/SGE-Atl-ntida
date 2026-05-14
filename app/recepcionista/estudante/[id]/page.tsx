import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import EstudanteDetalhe from "./EstudanteDetalhe"

export default async function EstudanteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "recepcionista") {
    redirect("/login")
  }

  const { id } = await params
  return <EstudanteDetalhe id={id} />
}