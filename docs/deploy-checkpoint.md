# SGE Atlântida — Deploy Checkpoint
> Cria este ficheiro para pores o próximo AI rapidamente a par do estado.

## Estado Actual (14/05/2026)

| Fase | Estado |
|------|--------|
| 1️⃣ GitHub | ✅ Código no `github.com/JustWebAprogrammer/SGE-Atl-ntida` |
| 2️⃣ Neon DB | ✅ Base criada, strings obtidas |
| 3️⃣ Migrations | ✅ `prisma migrate deploy` + `prisma db push` executados |
| 3.5 Seed | ✅ `npm run seed-base` executado na Neon |
| 4️⃣ Env Vars | ✅ Colectadas (ver .env local) |
| 5️⃣ Vercel Deploy | ✅ Site em: http://sge-atl-ntida.vercel.app/ |
| 6️⃣ NEXTAUTH_URL | ⏳ Pendente — ver abaixo |
| 7️⃣ Verificar | ❌ Não iniciado |
| 8️⃣ Updates Futuros | ❌ Não iniciado |

## ⏳ O que falta — Fase 6 (NEXTAUTH_URL)

No dashboard da Vercel → Project **SGE-Atl-ntida** → **Settings** → **Environment Variables**:

Actualizar (ou criar) as seguintes variáveis:

| Key Name | Value |
|---|---|
| `NEXTAUTH_URL` | `http://sge-atl-ntida.vercel.app/` |
| `NEXT_PUBLIC_APP_URL` | `http://sge-atl-ntida.vercel.app/` |

Depois → **Deployments** → clicar no último deploy → `...` → **Redeploy**.

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
|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_bTsvqyP39JSU@ep-noisy-silence-ap4ah0dr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `DIRECT_URL` | `postgresql://neondb_owner:npg_bTsvqyP39JSU@ep-noisy-silence-ap4ah0dr.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `NEXTAUTH_SECRET` | `sge-atlantida-secret-key-2026` |
| `NEXTAUTH_URL` | http://sge-atl-ntida.vercel.app/ |
| `NEXT_PUBLIC_APP_URL` | http://sge-atl-ntida.vercel.app/ |

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

## Next.js Config (já modificada)

O `next.config.ts` tem:
- `eslint.ignoreDuringBuilds: true`
- `typescript.ignoreBuildErrors: true`

O `package.json` tem:
- Script `build` = `prisma generate && next build`
- Script `postinstall` = `prisma generate`

## Notas importantes

- Minio está desligado (não configurado para produção)
- Matrícula está **fechada** no seed base (admin precisa activar no painel)
- SSL mode usa `require` — funciona, mas na próxima versão do pg será melhor usar `verify-full`