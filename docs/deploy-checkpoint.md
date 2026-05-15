# SGE Atlântida — Deploy Checkpoint
> Estado actualizado a 15/05/2026

## Estado Actual

| Fase | Estado |
|------|--------|
| 1️⃣ GitHub | ✅ Código no `github.com/JustWebAprogrammer/SGE-Atl-ntida` |
| 2️⃣ Neon DB | ✅ Base criada, strings obtidas |
| 3️⃣ Migrations | ✅ `prisma migrate deploy` + `prisma db push` executados |
| 3.5 Seed | ✅ `npm run seed-base` executado na Neon |
| 4️⃣ Env Vars | ✅ Colectadas (ver .env local) |
| 5️⃣ Vercel Deploy | ✅ Site em: https://sge-atl-ntida.vercel.app/ |
| 6️⃣ NEXTAUTH_URL | ✅ Concluída — ver nota abaixo |
| 7️⃣ Verificar | ✅ Concluída — ver nota abaixo |
| 8️⃣ Updates Futuros | ⏳ Pendente |

## Histórico de correcções (15/05/2026)

### 1. QR codes dos PDFs — Bug de URL localhost em produção
**Problema:** Os QR codes usavam `process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin`. Como `NEXT_PUBLIC_APP_URL=http://localhost:3000` estava no `.env`, todos os QR codes apontavam para localhost mesmo em produção.

**Solução:** Removido `NEXT_PUBLIC_APP_URL` de todos os 6 geradores de PDF. Agora usam apenas `request.nextUrl.origin`, que detecta automaticamente o domínio real (localhost em dev, vercel.app em produção).

**Ficheiros alterados:**
- `app/api/estudante/declaracao/pdf/route.ts`
- `app/api/estudante/declaracao/[id]/pdf/route.ts`
- `app/api/estudante/certificado/conclusao/pdf/route.ts`
- `app/api/estudante/certificado/disciplinas/pdf/route.ts`
- `app/api/recepcionista/estudantes/[id]/declaracao/pdf/route.ts`
- `app/api/recepcionista/certificados/[id]/pdf/route.ts`

### 2. Rotas de verificação do recepcionista — Inconsistentes
**Problema:** Os QR codes dos certificados gerados pelo recepcionista usavam `/verificar/cert/ID` e `/verificar/cert-disc/ID`, mas a rota de verificação só aceita `/verificar/ID`.

**Solução:** Corrigido para usar o mesmo formato `/verificar/ID` dos restantes documentos.

### 3. Página de verificação — Estilo inconsistente
**Problema:** A página `/verificar/[id]` usava classes Tailwind básicas, visualmente diferente do resto do sistema (que usa inline styles com cores customizadas).

**Solução:** Redesenhada com o mesmo estilo do login (fundo #0d0f14, cartão #1e2230, logo A vermelho, badges coloridos por tipo de documento).

### 4. Login infinito — NEXTAUTH_URL com HTTP em vez de HTTPS
**Problema:** A variável `NEXTAUTH_URL` estava configurada como `http://sge-atl-ntida.vercel.app/` mas a Vercel serve em HTTPS. O NextAuth rejeitava callbacks com protocolo diferente, fazendo o botão "A entrar..." ficar infinito.

**Solução:** Alterar na Vercel:
1. Dashboard → Project → Settings → Environment Variables
2. `NEXTAUTH_URL` → `https://sge-atl-ntida.vercel.app/`
3. Remover `NEXT_PUBLIC_APP_URL` (já não é usada)
4. Redeploy

## Credenciais (seed-base)

| Role | Email | Senha |
|------|-------|-------|
| Admin | admin@ispatlantida.ao | admin123 |
| Orientador (gestor EI) | orientador@ispatlantida.ao | orientador123 |
| Orientador (gestor EC) | orientador2@ispatlantida.ao | orientador123 |
| Orientador (GE) | orientador3@ispatlantida.ao | orientador123 |
| Orientador (EI) | orientador4@ispatlantida.ao | orientador123 |
| Recepção | recepcao@ispatlantida.ao | recepcao123 |

## Env Vars (Vercel)

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_bTsvqyP39JSU@ep-noisy-silence-ap4ah0dr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `DIRECT_URL` | `postgresql://neondb_owner:npg_bTsvqyP39JSU@ep-noisy-silence-ap4ah0dr.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `NEXTAUTH_SECRET` | `sge-atlantida-secret-key-2026` |
| `NEXTAUTH_URL` | `https://sge-atl-ntida.vercel.app/` |
| ~~`NEXT_PUBLIC_APP_URL`~~ | ❌ Removida — QR codes usam `request.nextUrl.origin` |

## Comandos úteis

```bash
# Desenvolvimento local
npm run dev

# Seed base (dados iniciais)
npm run seed-base

# Rodar migrations na produção (se houver mudanças no schema)
npx prisma db push

# Seed na produção
npm run seed-base
```

## Next.js Config

O `next.config.ts` tem:
- `eslint.ignoreDuringBuilds: true`
- `typescript.ignoreBuildErrors: true`

O `package.json` tem:
- Script `build` = `prisma generate && next build`
- Script `postinstall` = `prisma generate`

## Notas importantes

- **QR codes antigos** (gerados antes de 15/05/2026) continuam com links quebrados — só novos documentos têm QR codes correctos
- Minio está desligado (não configurado para produção)
- Matrícula está **fechada** no seed base (admin precisa activar no painel)
- SSL mode usa `require` — funciona, mas na próxima versão do pg será melhor usar `verify-full`