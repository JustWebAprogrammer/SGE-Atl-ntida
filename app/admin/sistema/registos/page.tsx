import { Metadata } from "next"
import RegistosDashboard from "./RegistosDashboard"

export const metadata: Metadata = {
  title: "Registos Lectivo",
}

export default function Page() {
  return <RegistosDashboard />
}