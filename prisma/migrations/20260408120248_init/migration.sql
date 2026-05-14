-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('admin', 'estudante', 'orientador', 'recepcionista');

-- CreateEnum
CREATE TYPE "EstadoEstudante" AS ENUM ('EmCurso', 'Finalizado', 'Desistente');

-- CreateEnum
CREATE TYPE "EstadoMonografia" AS ENUM ('Submetida', 'EmRevisao', 'Aprovada', 'ParaDefender', 'Defendida', 'Rejeitada');

-- CreateEnum
CREATE TYPE "EstadoPremonografia" AS ENUM ('Proposto', 'Aprovado', 'Reprovado', 'Cancelado');

-- CreateEnum
CREATE TYPE "EstadoSolicitacao" AS ENUM ('Pendente', 'Aceite', 'Recusado', 'Cancelado');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('Pendente', 'Pago', 'Atrasado');

-- CreateEnum
CREATE TYPE "EstadoNotaCobranca" AS ENUM ('Pendente', 'Pago', 'Negociado');

-- CreateEnum
CREATE TYPE "FormaPagemento" AS ENUM ('Multicaixa', 'Transferencia', 'Dinheiro');

-- CreateEnum
CREATE TYPE "TipoCertificado" AS ENUM ('Conclusao', 'Disciplina', 'Participacao');

-- CreateEnum
CREATE TYPE "TurnoRecepcionista" AS ENUM ('Manha', 'Tarde', 'Noite');

-- CreateEnum
CREATE TYPE "TipoAvaliacao" AS ENUM ('Normal', 'Recurso', 'Especial');

-- CreateEnum
CREATE TYPE "Semestre" AS ENUM ('S1', 'S2');

-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nome_usuario" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "tipo_usuario" "TipoUsuario" NOT NULL,
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id_admin" SERIAL NOT NULL,
    "nome_completo" VARCHAR(80),
    "numero_telemovel" VARCHAR(15),
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id_admin")
);

-- CreateTable
CREATE TABLE "Departamento" (
    "id_departamento" SERIAL NOT NULL,
    "nome_departamento" VARCHAR(100) NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id_departamento")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id_curso" SERIAL NOT NULL,
    "nome_curso" VARCHAR(100) NOT NULL,
    "duracao_anos" INTEGER,
    "id_departamento" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id_curso")
);

-- CreateTable
CREATE TABLE "Disciplina" (
    "id_disciplina" SERIAL NOT NULL,
    "nome_disciplina" VARCHAR(100) NOT NULL,
    "codigo_disciplina" VARCHAR(10) NOT NULL,
    "creditos" INTEGER NOT NULL,
    "id_departamento" INTEGER NOT NULL,
    "ano_curricular" INTEGER NOT NULL DEFAULT 1,
    "semestre" "Semestre" NOT NULL DEFAULT 'S1',
    "tem_dispensa" BOOLEAN NOT NULL DEFAULT true,
    "nota_dispensa" INTEGER NOT NULL DEFAULT 14,

    CONSTRAINT "Disciplina_pkey" PRIMARY KEY ("id_disciplina")
);

-- CreateTable
CREATE TABLE "ProfessorDisciplina" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_disciplina" INTEGER NOT NULL,
    "ano_lectivo" VARCHAR(9) NOT NULL,

    CONSTRAINT "ProfessorDisciplina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estudante" (
    "id_estudante" SERIAL NOT NULL,
    "nome_completo" VARCHAR(80) NOT NULL,
    "numero_estudante" VARCHAR(20),
    "numero_telemovel" VARCHAR(15),
    "id_curso" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "ano_current" INTEGER,
    "ano_electivo" VARCHAR(9),
    "estado" "EstadoEstudante" NOT NULL DEFAULT 'EmCurso',
    "pagamento" TEXT NOT NULL DEFAULT 'Pendente',
    "data_cadastro" DATE,

    CONSTRAINT "Estudante_pkey" PRIMARY KEY ("id_estudante")
);

-- CreateTable
CREATE TABLE "Orientador" (
    "id_orientador" SERIAL NOT NULL,
    "nome_completo" VARCHAR(80) NOT NULL,
    "especialidade" VARCHAR(100) NOT NULL,
    "numero_telemovel" VARCHAR(15),
    "e_gestor" BOOLEAN NOT NULL DEFAULT false,
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Orientador_pkey" PRIMARY KEY ("id_orientador")
);

-- CreateTable
CREATE TABLE "Recepcionista" (
    "id_recepcionista" SERIAL NOT NULL,
    "nome_completo" VARCHAR(80) NOT NULL,
    "turno" "TurnoRecepcionista" NOT NULL DEFAULT 'Manha',
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Recepcionista_pkey" PRIMARY KEY ("id_recepcionista")
);

-- CreateTable
CREATE TABLE "Nota" (
    "id_nota" SERIAL NOT NULL,
    "id_estudante" INTEGER NOT NULL,
    "id_disciplina" INTEGER NOT NULL,
    "ano_lectivo" VARCHAR(9) NOT NULL,
    "semestre" "Semestre" NOT NULL DEFAULT 'S1',
    "ac1" DECIMAL(4,2),
    "ac2" DECIMAL(4,2),
    "ac3" DECIMAL(4,2),
    "ttp" DECIMAL(4,2),
    "pp1" DECIMAL(4,2),
    "pp2" DECIMAL(4,2),
    "exame" DECIMAL(4,2),
    "recurso" DECIMAL(4,2),
    "exame_especial" DECIMAL(4,2),
    "nota_final" DECIMAL(4,2),
    "dispensada" BOOLEAN NOT NULL DEFAULT false,
    "tipo_avaliacao" "TipoAvaliacao" NOT NULL DEFAULT 'Normal',

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id_nota")
);

-- CreateTable
CREATE TABLE "Monografia" (
    "id_monografia" SERIAL NOT NULL,
    "id_estudante" INTEGER NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "resumo" TEXT,
    "descricao" TEXT,
    "caminho_arquivo" TEXT,
    "nome_arquivo" TEXT,
    "data_submissao" DATE NOT NULL,
    "data_envio_gestor" TIMESTAMP(3),
    "data_correcao_gestor" TIMESTAMP(3),
    "data_defesa" DATE,
    "estado" "EstadoMonografia" NOT NULL DEFAULT 'Submetida',
    "nota_final" DECIMAL(4,2),
    "nota_gestor" DECIMAL(4,2),
    "feedback" TEXT,
    "feedback_gestor" TEXT,
    "id_co_orientador" INTEGER,
    "id_orientador" INTEGER,
    "nome_co_autor" VARCHAR(100),
    "nome_co_orientador" VARCHAR(100),

    CONSTRAINT "Monografia_pkey" PRIMARY KEY ("id_monografia")
);

-- CreateTable
CREATE TABLE "MonografiasParaCorrecao" (
    "id_monografia_correcao" SERIAL NOT NULL,
    "id_monografia" INTEGER NOT NULL,
    "id_orientador" INTEGER NOT NULL,
    "data_correcao" DATE,
    "observacoes" TEXT,

    CONSTRAINT "MonografiasParaCorrecao_pkey" PRIMARY KEY ("id_monografia_correcao")
);

-- CreateTable
CREATE TABLE "Premonografia" (
    "id_premonografia" SERIAL NOT NULL,
    "id_estudante" INTEGER NOT NULL,
    "tema" VARCHAR(200) NOT NULL,
    "data_proposta" DATE NOT NULL,
    "estado" "EstadoPremonografia" NOT NULL DEFAULT 'Proposto',
    "caminho_arquivo" TEXT,
    "nome_arquivo" TEXT,
    "feedback" TEXT,

    CONSTRAINT "Premonografia_pkey" PRIMARY KEY ("id_premonografia")
);

-- CreateTable
CREATE TABLE "SolicitacaoOrientacao" (
    "id_solicitacao" SERIAL NOT NULL,
    "id_estudante" INTEGER NOT NULL,
    "id_orientador" INTEGER NOT NULL,
    "data_solicitacao" DATE NOT NULL,
    "estado" "EstadoSolicitacao" NOT NULL DEFAULT 'Pendente',
    "observacoes" TEXT,

    CONSTRAINT "SolicitacaoOrientacao_pkey" PRIMARY KEY ("id_solicitacao")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id_factura" SERIAL NOT NULL,
    "id_estudante" INTEGER NOT NULL,
    "numero_factura" VARCHAR(20),
    "descricao_servico" VARCHAR(100),
    "valor_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "valor_final" DECIMAL(10,2),
    "data_emissao" DATE NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'Pendente',
    "periodo" TEXT,
    "ano_lectivo" VARCHAR(9),
    "metodo_pagamento" TEXT,
    "data_pagamento" TIMESTAMP(3),
    "id_recepcionista" INTEGER,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id_factura")
);

-- CreateTable
CREATE TABLE "PagamentoPropina" (
    "id_pagamento" SERIAL NOT NULL,
    "id_estudante" INTEGER NOT NULL,
    "referencia" VARCHAR(40) NOT NULL,
    "codigo_confirmacao" VARCHAR(3) NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "valor_base" DECIMAL(10,2) NOT NULL,
    "valor_multa" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "data_pagamento" TIMESTAMP(3),
    "forma_pagamento" "FormaPagemento" NOT NULL DEFAULT 'Multicaixa',
    "estado" TEXT NOT NULL DEFAULT 'Pendente',

    CONSTRAINT "PagamentoPropina_pkey" PRIMARY KEY ("id_pagamento")
);

-- CreateTable
CREATE TABLE "NotaCobranca" (
    "id_nota_cobranca" SERIAL NOT NULL,
    "id_estudante" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "estado" "EstadoNotaCobranca" NOT NULL DEFAULT 'Pendente',

    CONSTRAINT "NotaCobranca_pkey" PRIMARY KEY ("id_nota_cobranca")
);

-- CreateTable
CREATE TABLE "Precos" (
    "id_preco" SERIAL NOT NULL,
    "id_curso" INTEGER NOT NULL,
    "valor_anual" DECIMAL(10,2) NOT NULL,
    "valor_semestral" DECIMAL(10,2),
    "data_validade" DATE NOT NULL,

    CONSTRAINT "Precos_pkey" PRIMARY KEY ("id_preco")
);

-- CreateTable
CREATE TABLE "PrecosPropina" (
    "id_preco_propina" SERIAL NOT NULL,
    "descricao" VARCHAR(100) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "ano_lectivo" VARCHAR(9) NOT NULL,
    "id_curso" INTEGER,

    CONSTRAINT "PrecosPropina_pkey" PRIMARY KEY ("id_preco_propina")
);

-- CreateTable
CREATE TABLE "Certificado" (
    "id_certificado" SERIAL NOT NULL,
    "id_estudante" INTEGER NOT NULL,
    "data_emissao" DATE NOT NULL,
    "tipo_certificado" "TipoCertificado" NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Certificado_pkey" PRIMARY KEY ("id_certificado")
);

-- CreateTable
CREATE TABLE "CertificadoDisciplinas" (
    "id_certificado_disciplina" SERIAL NOT NULL,
    "id_certificado" INTEGER NOT NULL,
    "id_disciplina" INTEGER NOT NULL,

    CONSTRAINT "CertificadoDisciplinas_pkey" PRIMARY KEY ("id_certificado_disciplina")
);

-- CreateTable
CREATE TABLE "CurriculoAcademico" (
    "id_curriculo" SERIAL NOT NULL,
    "id_estudante" INTEGER NOT NULL,
    "ano_lectivo" VARCHAR(9) NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "CurriculoAcademico_pkey" PRIMARY KEY ("id_curriculo")
);

-- CreateTable
CREATE TABLE "EstatisticasMonografiasDepartamento" (
    "id_estatistica" SERIAL NOT NULL,
    "id_departamento" INTEGER NOT NULL,
    "total_monografias" INTEGER NOT NULL DEFAULT 0,
    "monografias_aprovadas" INTEGER NOT NULL DEFAULT 0,
    "monografias_reprovadas" INTEGER NOT NULL DEFAULT 0,
    "data_atualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstatisticasMonografiasDepartamento_pkey" PRIMARY KEY ("id_estatistica")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "acao" VARCHAR(100) NOT NULL,
    "tabela" VARCHAR(50) NOT NULL,
    "id_registro" INTEGER NOT NULL,
    "valor_antes" TEXT,
    "valor_depois" TEXT,
    "ip_address" VARCHAR(45) NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_nome_usuario_key" ON "Usuario"("nome_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_numero_telemovel_key" ON "Admin"("numero_telemovel");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_id_usuario_key" ON "Admin"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Disciplina_codigo_disciplina_key" ON "Disciplina"("codigo_disciplina");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessorDisciplina_id_usuario_id_disciplina_ano_lectivo_key" ON "ProfessorDisciplina"("id_usuario", "id_disciplina", "ano_lectivo");

-- CreateIndex
CREATE UNIQUE INDEX "Estudante_numero_estudante_key" ON "Estudante"("numero_estudante");

-- CreateIndex
CREATE UNIQUE INDEX "Estudante_numero_telemovel_key" ON "Estudante"("numero_telemovel");

-- CreateIndex
CREATE UNIQUE INDEX "Estudante_id_usuario_key" ON "Estudante"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Orientador_id_usuario_key" ON "Orientador"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Recepcionista_id_usuario_key" ON "Recepcionista"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_numero_factura_key" ON "Factura"("numero_factura");

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoPropina_referencia_key" ON "PagamentoPropina"("referencia");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_id_departamento_fkey" FOREIGN KEY ("id_departamento") REFERENCES "Departamento"("id_departamento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disciplina" ADD CONSTRAINT "Disciplina_id_departamento_fkey" FOREIGN KEY ("id_departamento") REFERENCES "Departamento"("id_departamento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessorDisciplina" ADD CONSTRAINT "ProfessorDisciplina_id_disciplina_fkey" FOREIGN KEY ("id_disciplina") REFERENCES "Disciplina"("id_disciplina") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessorDisciplina" ADD CONSTRAINT "ProfessorDisciplina_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estudante" ADD CONSTRAINT "Estudante_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estudante" ADD CONSTRAINT "Estudante_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orientador" ADD CONSTRAINT "Orientador_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recepcionista" ADD CONSTRAINT "Recepcionista_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_id_disciplina_fkey" FOREIGN KEY ("id_disciplina") REFERENCES "Disciplina"("id_disciplina") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_id_estudante_fkey" FOREIGN KEY ("id_estudante") REFERENCES "Estudante"("id_estudante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monografia" ADD CONSTRAINT "Monografia_id_co_orientador_fkey" FOREIGN KEY ("id_co_orientador") REFERENCES "Orientador"("id_orientador") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monografia" ADD CONSTRAINT "Monografia_id_estudante_fkey" FOREIGN KEY ("id_estudante") REFERENCES "Estudante"("id_estudante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monografia" ADD CONSTRAINT "Monografia_id_orientador_fkey" FOREIGN KEY ("id_orientador") REFERENCES "Orientador"("id_orientador") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonografiasParaCorrecao" ADD CONSTRAINT "MonografiasParaCorrecao_id_monografia_fkey" FOREIGN KEY ("id_monografia") REFERENCES "Monografia"("id_monografia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonografiasParaCorrecao" ADD CONSTRAINT "MonografiasParaCorrecao_id_orientador_fkey" FOREIGN KEY ("id_orientador") REFERENCES "Orientador"("id_orientador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Premonografia" ADD CONSTRAINT "Premonografia_id_estudante_fkey" FOREIGN KEY ("id_estudante") REFERENCES "Estudante"("id_estudante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoOrientacao" ADD CONSTRAINT "SolicitacaoOrientacao_id_estudante_fkey" FOREIGN KEY ("id_estudante") REFERENCES "Estudante"("id_estudante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoOrientacao" ADD CONSTRAINT "SolicitacaoOrientacao_id_orientador_fkey" FOREIGN KEY ("id_orientador") REFERENCES "Orientador"("id_orientador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_id_estudante_fkey" FOREIGN KEY ("id_estudante") REFERENCES "Estudante"("id_estudante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoPropina" ADD CONSTRAINT "PagamentoPropina_id_estudante_fkey" FOREIGN KEY ("id_estudante") REFERENCES "Estudante"("id_estudante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaCobranca" ADD CONSTRAINT "NotaCobranca_id_estudante_fkey" FOREIGN KEY ("id_estudante") REFERENCES "Estudante"("id_estudante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Precos" ADD CONSTRAINT "Precos_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecosPropina" ADD CONSTRAINT "PrecosPropina_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "Curso"("id_curso") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_id_estudante_fkey" FOREIGN KEY ("id_estudante") REFERENCES "Estudante"("id_estudante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificadoDisciplinas" ADD CONSTRAINT "CertificadoDisciplinas_id_certificado_fkey" FOREIGN KEY ("id_certificado") REFERENCES "Certificado"("id_certificado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificadoDisciplinas" ADD CONSTRAINT "CertificadoDisciplinas_id_disciplina_fkey" FOREIGN KEY ("id_disciplina") REFERENCES "Disciplina"("id_disciplina") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculoAcademico" ADD CONSTRAINT "CurriculoAcademico_id_estudante_fkey" FOREIGN KEY ("id_estudante") REFERENCES "Estudante"("id_estudante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstatisticasMonografiasDepartamento" ADD CONSTRAINT "EstatisticasMonografiasDepartamento_id_departamento_fkey" FOREIGN KEY ("id_departamento") REFERENCES "Departamento"("id_departamento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
