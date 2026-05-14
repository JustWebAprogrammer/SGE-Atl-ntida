import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (path.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (path.startsWith("/estudante") && token?.role !== "estudante") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (path.startsWith("/orientador") && token?.role !== "orientador") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (path.startsWith("/recepcionista") && token?.role !== "recepcionista") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    // Gestor (orientador com e_gestor=true) ou admin podem acessar /gestor
    const isGestor = token?.role === "orientador" && token?.e_gestor === true
    const isAdmin = token?.role === "admin"
    if (path.startsWith("/gestor") && !isGestor && !isAdmin) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/estudante/:path*",
    "/orientador/:path*",
    "/recepcionista/:path*",
    "/gestor/:path*",
    "/dashboard/:path*",
  ],
}