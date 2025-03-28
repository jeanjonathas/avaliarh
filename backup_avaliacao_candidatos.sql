--
-- PostgreSQL database dump
--

-- Dumped from database version 14.15 (Debian 14.15-1.pgdg120+1)
-- Dumped by pg_dump version 14.15 (Debian 14.15-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'USER'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: Status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Status" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."Status" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Admin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Admin" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    company text,
    "position" text,
    phone text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Admin" OWNER TO postgres;

--
-- Name: Candidate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Candidate" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    "position" text,
    "testDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "infoJobsLink" text,
    "interviewDate" timestamp(3) without time zone,
    observations text,
    rating double precision,
    "resumeFile" text,
    "socialMediaUrl" text,
    status public."Status" DEFAULT 'PENDING'::public."Status" NOT NULL,
    "inviteCode" text,
    "inviteSent" boolean DEFAULT false NOT NULL,
    "inviteAttempts" integer DEFAULT 0 NOT NULL,
    "inviteExpires" timestamp(3) without time zone,
    github text,
    linkedin text,
    portfolio text,
    "resumeUrl" text,
    "testId" text
);


ALTER TABLE public."Candidate" OWNER TO postgres;

--
-- Name: Option; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Option" (
    id text NOT NULL,
    text text NOT NULL,
    "isCorrect" boolean DEFAULT false NOT NULL,
    "questionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Option" OWNER TO postgres;

--
-- Name: Question; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Question" (
    id text NOT NULL,
    text text NOT NULL,
    "stageId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    category text NOT NULL
);


ALTER TABLE public."Question" OWNER TO postgres;

--
-- Name: Response; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Response" (
    id text NOT NULL,
    "candidateId" text NOT NULL,
    "questionId" text NOT NULL,
    "optionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Response" OWNER TO postgres;

--
-- Name: Stage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Stage" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Stage" OWNER TO postgres;

--
-- Name: Test; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Test" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Test" OWNER TO postgres;

--
-- Name: TestStage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TestStage" (
    id text NOT NULL,
    "testId" text NOT NULL,
    "stageId" text NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TestStage" OWNER TO postgres;

--
-- Name: UsedInviteCode; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UsedInviteCode" (
    id text NOT NULL,
    code text NOT NULL,
    "usedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UsedInviteCode" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."Role" DEFAULT 'ADMIN'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: Admin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Admin" (id, name, email, password, company, "position", phone, "createdAt", "updatedAt") FROM stdin;
83c5b162-248c-47e7-b401-3cfba63673c9	Administrador	admin@empresa.com	$2a$10$L0fHIDw43Sd/nCiRZcPc8OWKuSZfi8b/eHF.rppKzqJI3x04McrUS	AvaliaRH	Gerente de RH	(11) 99999-9999	2025-03-09 01:37:12.14	2025-03-09 01:37:12.14
\.


--
-- Data for Name: Candidate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Candidate" (id, name, email, phone, "position", "testDate", completed, "createdAt", "updatedAt", "infoJobsLink", "interviewDate", observations, rating, "resumeFile", "socialMediaUrl", status, "inviteCode", "inviteSent", "inviteAttempts", "inviteExpires", github, linkedin, portfolio, "resumeUrl", "testId") FROM stdin;
\.


--
-- Data for Name: Option; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Option" (id, text, "isCorrect", "questionId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Question; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Question" (id, text, "stageId", "createdAt", "updatedAt", category) FROM stdin;
\.


--
-- Data for Name: Response; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Response" (id, "candidateId", "questionId", "optionId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Stage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Stage" (id, title, description, "order", "createdAt", "updatedAt") FROM stdin;
1510d9c2-47d8-44cd-9bec-a2af725482f1	Racioc├¡nio L├│gico	Testes de padr├Áes, sequ├¬ncias e dedu├º├úo l├│gica	1	2025-03-09 01:37:12.145	2025-03-09 01:37:12.145
7834ef39-422f-4236-b536-3304fff15a2c	Matem├ítica B├ísica e Resolu├º├úo de Problemas	C├ílculo mental, propor├º├Áes e an├ílise de dados	2	2025-03-09 01:37:12.147	2025-03-09 01:37:12.147
fab6b9d5-b998-4540-8626-acbd96ed6260	Compreens├úo Verbal	Interpreta├º├úo de texto, sin├┤nimos, analogias	3	2025-03-09 01:37:12.149	2025-03-09 01:37:12.149
f3d761e0-bd07-47f6-abc8-9d5839d772a0	Aptid├úo Espacial	Quest├Áes envolvendo rota├º├úo mental e padr├Áes visuais	4	2025-03-09 01:37:12.15	2025-03-09 01:37:12.15
80f79235-e57b-4895-8714-386c40d25dce	Racioc├¡nio Abstrato	Quest├Áes que exigem encontrar rela├º├Áes n├úo ├│bvias	5	2025-03-09 01:37:12.151	2025-03-09 01:37:12.151
525316c9-9882-4553-a2c8-d7526d6ce33d	Tomada de Decis├úo e Solu├º├úo de Problemas	Situa├º├Áes hipot├®ticas e a melhor resposta	6	2025-03-09 01:37:12.153	2025-03-09 01:37:12.153
\.


--
-- Data for Name: Test; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Test" (id, title, description, "createdAt", "updatedAt", "isActive") FROM stdin;
gia-test-id	Teste de Intelig├¬ncia Geral (GIA)	Avalia├º├úo abrangente de habilidades cognitivas e racioc├¡nio l├│gico	2025-03-09 01:36:56.277	2025-03-09 01:36:56.277	t
\.


--
-- Data for Name: TestStage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TestStage" (id, "testId", "stageId", "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: UsedInviteCode; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UsedInviteCode" (id, code, "usedAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, name, email, password, role, "createdAt", "updatedAt") FROM stdin;
519eaad5-b8b2-4840-94b7-c99af9c39854	Administrador	admin@empresa.com	$2a$10$WYVJT1FxqeBluFjl.keEnetoYezxA9daeQYfczn7r8MDhFlixnQiC	ADMIN	2025-03-09 01:37:12.069	2025-03-09 01:37:12.069
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
fd447963-6c4c-446a-88c7-a0c2e36c5a28	1311290e8653a02fa87c432b13d1c40b1fbd8e0630f98e26ba6431ff2e078413	2025-03-09 01:36:56.180844+00	20250306050901_init	\N	\N	2025-03-09 01:36:56.155868+00	1
2a0784d2-666e-423e-aa91-8518cd81935b	ca5d10f0ebabfd733bbc7f5b03260cfdd388a64f86207bb0041bcf18c5509adf	2025-03-09 01:36:56.186825+00	20250306053920_add_candidate_evaluation_fields	\N	\N	2025-03-09 01:36:56.182454+00	1
d6205b1e-7b46-4d44-ad66-e75e7d50776b	58b29ec718e4cd5874f26f1d9a238ea4c82eabef0f810169bf49a54477c1e198	2025-03-09 01:36:56.198584+00	20250306072243_add_admin_model	\N	\N	2025-03-09 01:36:56.188076+00	1
9b2ec7e9-2026-4567-a5fe-6b1b21ec4127	d8d87ff03eacfec20601c31f19c1dfbaa707d2cfbe2d709e6ea30844745020c5	2025-03-09 01:36:56.206902+00	20250306235551_add_invite_code	\N	\N	2025-03-09 01:36:56.20007+00	1
4a306a63-3123-4e5e-bda1-649b15a3c29b	56c11a9553684cac7c9fce1617fb7c1092485578b76acf30d5ee8e8ca0ed3a26	2025-03-09 01:36:56.212919+00	20250307000450_add_invite_expiration_and_attempts	\N	\N	2025-03-09 01:36:56.208602+00	1
cc512491-87f3-4394-95ea-c26537ee7f65	12fc7dc70d3e919f71239afd2b85ef625a51286e2deafd64c1e05fc2f20f9eb8	2025-03-09 01:36:56.219395+00	20250307002542_add_candidate_social_fields	\N	\N	2025-03-09 01:36:56.214835+00	1
b8780d29-07a2-4b17-a11d-cdadf55c0ea5	7037660b92f2932ec1d05c98f1190e1c09985d8690914eb0ab1e60198bc9d1bd	2025-03-09 01:36:56.251329+00	20250309003724_add_used_invite_codes_table	\N	\N	2025-03-09 01:36:56.240131+00	1
9f18b42e-68e7-467e-be70-759536819461	442c9013b06dadaf30323c19628bf9d87b72c044e76ca42ab4f1fdc628b4b4ab	2025-03-09 01:36:56.267663+00	20250309013456_add_tests_and_categories	\N	\N	2025-03-09 01:36:56.253155+00	1
14c1b7af-35d7-41f3-8084-7db8bf65c0f6	ee2813932f061a99d8db3ed6ef700a7de51538f5f5ace385022987b8a3890d47	2025-03-09 01:37:11.604791+00	20250309013711_novo	\N	\N	2025-03-09 01:37:11.598174+00	1
\.


--
-- Name: Admin Admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_pkey" PRIMARY KEY (id);


--
-- Name: Candidate Candidate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Candidate"
    ADD CONSTRAINT "Candidate_pkey" PRIMARY KEY (id);


--
-- Name: Option Option_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Option"
    ADD CONSTRAINT "Option_pkey" PRIMARY KEY (id);


--
-- Name: Question Question_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT "Question_pkey" PRIMARY KEY (id);


--
-- Name: Response Response_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Response"
    ADD CONSTRAINT "Response_pkey" PRIMARY KEY (id);


--
-- Name: Stage Stage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Stage"
    ADD CONSTRAINT "Stage_pkey" PRIMARY KEY (id);


--
-- Name: TestStage TestStage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestStage"
    ADD CONSTRAINT "TestStage_pkey" PRIMARY KEY (id);


--
-- Name: Test Test_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Test"
    ADD CONSTRAINT "Test_pkey" PRIMARY KEY (id);


--
-- Name: UsedInviteCode UsedInviteCode_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UsedInviteCode"
    ADD CONSTRAINT "UsedInviteCode_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Admin_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Admin_email_key" ON public."Admin" USING btree (email);


--
-- Name: Candidate_inviteCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Candidate_inviteCode_key" ON public."Candidate" USING btree ("inviteCode");


--
-- Name: Response_candidateId_questionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Response_candidateId_questionId_key" ON public."Response" USING btree ("candidateId", "questionId");


--
-- Name: TestStage_testId_order_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TestStage_testId_order_key" ON public."TestStage" USING btree ("testId", "order");


--
-- Name: TestStage_testId_stageId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TestStage_testId_stageId_key" ON public."TestStage" USING btree ("testId", "stageId");


--
-- Name: UsedInviteCode_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UsedInviteCode_code_key" ON public."UsedInviteCode" USING btree (code);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Candidate Candidate_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Candidate"
    ADD CONSTRAINT "Candidate_testId_fkey" FOREIGN KEY ("testId") REFERENCES public."Test"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Option Option_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Option"
    ADD CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."Question"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Question Question_stageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT "Question_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES public."Stage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Response Response_candidateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Response"
    ADD CONSTRAINT "Response_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES public."Candidate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Response Response_optionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Response"
    ADD CONSTRAINT "Response_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES public."Option"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Response Response_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Response"
    ADD CONSTRAINT "Response_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."Question"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TestStage TestStage_stageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestStage"
    ADD CONSTRAINT "TestStage_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES public."Stage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TestStage TestStage_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestStage"
    ADD CONSTRAINT "TestStage_testId_fkey" FOREIGN KEY ("testId") REFERENCES public."Test"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

