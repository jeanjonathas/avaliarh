--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Debian 14.17-1.pgdg120+1)
-- Dumped by pg_dump version 14.17 (Debian 14.17-1.pgdg120+1)

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
    "resumeUrl" text,
    "testId" text,
    "timeSpent" integer DEFAULT 0,
    "photoUrl" text,
    score integer DEFAULT 0,
    "requestPhoto" boolean DEFAULT true NOT NULL,
    "showResults" boolean DEFAULT true NOT NULL,
    instagram text
);


ALTER TABLE public."Candidate" OWNER TO postgres;

--
-- Name: CandidateTest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CandidateTest" (
    id text NOT NULL,
    "candidateId" text NOT NULL,
    "testId" text NOT NULL,
    "inviteCode" text NOT NULL,
    "inviteExpires" timestamp(3) without time zone,
    "inviteSent" boolean DEFAULT false NOT NULL,
    "inviteAttempts" integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CandidateTest" OWNER TO postgres;

--
-- Name: Category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Category" OWNER TO postgres;

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
    "categoryId" text
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stageId" text,
    "questionText" text NOT NULL,
    "optionText" text NOT NULL,
    "isCorrectOption" boolean NOT NULL,
    "allOptionsSnapshot" jsonb,
    "questionSnapshot" jsonb,
    "categoryName" text,
    "stageName" text,
    "timeSpent" integer DEFAULT 0
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "testId" text
);


ALTER TABLE public."Stage" OWNER TO postgres;

--
-- Name: StageQuestion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StageQuestion" (
    id text NOT NULL,
    "stageId" text NOT NULL,
    "questionId" text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StageQuestion" OWNER TO postgres;

--
-- Name: TestQuestion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TestQuestion" (
    id text NOT NULL,
    "testId" text NOT NULL,
    "questionId" text NOT NULL,
    "stageId" text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TestQuestion" OWNER TO postgres;

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
-- Name: tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tests (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "timeLimit" integer,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tests OWNER TO postgres;

--
-- Data for Name: Admin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Admin" (id, name, email, password, company, "position", phone, "createdAt", "updatedAt") FROM stdin;
5d3a9ee3-dca9-41f0-8c7a-1e9d7052b138	Administrador	admin@empresa.com	$2a$10$abRi85Dywz0QMjbt8DQDaeJyjNwlL3D7g2t0gqe9tFNwEXaSSxYLq	AvaliaRH	Gerente de RH	(11) 99999-9999	2025-03-16 18:16:53.56	2025-03-16 18:16:53.56
\.


--
-- Data for Name: Candidate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Candidate" (id, name, email, phone, "position", "testDate", completed, "createdAt", "updatedAt", "infoJobsLink", "interviewDate", observations, rating, "resumeFile", "socialMediaUrl", status, "inviteCode", "inviteSent", "inviteAttempts", "inviteExpires", "resumeUrl", "testId", "timeSpent", "photoUrl", score, "requestPhoto", "showResults", instagram) FROM stdin;
\.


--
-- Data for Name: CandidateTest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CandidateTest" (id, "candidateId", "testId", "inviteCode", "inviteExpires", "inviteSent", "inviteAttempts", completed, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Category" (id, name, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Option; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Option" (id, text, "isCorrect", "questionId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Question; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Question" (id, text, "stageId", "createdAt", "updatedAt", "categoryId") FROM stdin;
\.


--
-- Data for Name: Response; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Response" (id, "candidateId", "questionId", "optionId", "createdAt", "updatedAt", "stageId", "questionText", "optionText", "isCorrectOption", "allOptionsSnapshot", "questionSnapshot", "categoryName", "stageName", "timeSpent") FROM stdin;
\.


--
-- Data for Name: Stage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Stage" (id, title, description, "order", "createdAt", "updatedAt", "testId") FROM stdin;
stage-1	Raciocínio Lógico	Testes de padrões, sequências e dedução lógica	1	2025-03-16 18:17:16.196	2025-03-16 18:17:16.195	\N
stage-2	Matemática Básica e Resolução de Problemas	Cálculo mental, proporções e análise de dados	2	2025-03-16 18:17:16.208	2025-03-16 18:17:16.195	\N
stage-3	Compreensão Verbal	Interpretação de texto, sinônimos, analogias	3	2025-03-16 18:17:16.211	2025-03-16 18:17:16.195	\N
stage-4	Aptidão Espacial	Questões envolvendo rotação mental e padrões visuais	4	2025-03-16 18:17:16.214	2025-03-16 18:17:16.195	\N
stage-5	Raciocínio Abstrato	Questões que exigem encontrar relações não óbvias	5	2025-03-16 18:17:16.216	2025-03-16 18:17:16.195	\N
stage-6	Tomada de Decisão e Solução de Problemas	Situações hipotéticas e a melhor resposta	6	2025-03-16 18:17:16.219	2025-03-16 18:17:16.195	\N
\.


--
-- Data for Name: StageQuestion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StageQuestion" (id, "stageId", "questionId", "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TestQuestion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TestQuestion" (id, "testId", "questionId", "stageId", "order", "createdAt", "updatedAt") FROM stdin;
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
dc585cb4-7e01-4630-98fe-3fa4db8f72d2	Administrador	admin@empresa.com	$2a$10$QWikbB2bj3h.hM4loIg8eeCC2o.wpmoAIn62HxGC/uIEXstqdeMPy	ADMIN	2025-03-16 18:16:53.501	2025-03-16 18:16:53.501
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
cd2975cb-d8e7-4b6c-83d5-0df4c2f4c97b	1311290e8653a02fa87c432b13d1c40b1fbd8e0630f98e26ba6431ff2e078413	2025-03-16 18:16:40.204128+00	20250306050901_init	\N	\N	2025-03-16 18:16:40.101378+00	1
18b9346c-9e06-4c00-8969-9289e6035945	ef65f5a85952215e6bbb37b480802eb25218f0138ea57f62ec52a7bd9fee0919	2025-03-16 18:16:40.541947+00	20250311194823_add_stage_id_to_response	\N	\N	2025-03-16 18:16:40.491358+00	1
f7be161d-0973-4727-a5ee-7069bc92205f	ca5d10f0ebabfd733bbc7f5b03260cfdd388a64f86207bb0041bcf18c5509adf	2025-03-16 18:16:40.213269+00	20250306053920_add_candidate_evaluation_fields	\N	\N	2025-03-16 18:16:40.206236+00	1
b611b0b1-9cd1-436a-9279-34e4de4a59f4	58b29ec718e4cd5874f26f1d9a238ea4c82eabef0f810169bf49a54477c1e198	2025-03-16 18:16:40.242867+00	20250306072243_add_admin_model	\N	\N	2025-03-16 18:16:40.215409+00	1
0854d3b3-f806-4fe8-8814-6e00303e9fd9	4af2aa2e54ab3eacdd7b14f2942b5c19e5fbc6d66525d55f0121c1f178e3e515	2025-03-16 18:16:40.625544+00	20250312190146_add_instagram_remove_social_fields	\N	\N	2025-03-16 18:16:40.61711+00	1
c37a3cc7-90dc-4076-874b-c2e3d10c20a6	d8d87ff03eacfec20601c31f19c1dfbaa707d2cfbe2d709e6ea30844745020c5	2025-03-16 18:16:40.258741+00	20250306235551_add_invite_code	\N	\N	2025-03-16 18:16:40.245007+00	1
d43a2925-8d98-4b23-b2ec-60863cf30d77	763403601fa1e093d09dc90e2dcdc982edcd89cf7bd16984e21d6101bf00335e	2025-03-16 18:16:40.553281+00	20250311201952_remove_question_relation_from_response	\N	\N	2025-03-16 18:16:40.544317+00	1
89448d36-a7c9-4ca4-8c4c-ceecf56bdb17	56c11a9553684cac7c9fce1617fb7c1092485578b76acf30d5ee8e8ca0ed3a26	2025-03-16 18:16:40.268015+00	20250307000450_add_invite_expiration_and_attempts	\N	\N	2025-03-16 18:16:40.260957+00	1
3104379f-ed26-4e02-8431-6d7d26db2b15	12fc7dc70d3e919f71239afd2b85ef625a51286e2deafd64c1e05fc2f20f9eb8	2025-03-16 18:16:40.277365+00	20250307002542_add_candidate_social_fields	\N	\N	2025-03-16 18:16:40.270086+00	1
2efada86-3abe-42fa-a740-f1e2f93ed0c3	7037660b92f2932ec1d05c98f1190e1c09985d8690914eb0ab1e60198bc9d1bd	2025-03-16 18:16:40.30842+00	20250309003724_add_used_invite_codes_table	\N	\N	2025-03-16 18:16:40.279533+00	1
5079864f-5afd-4d33-aa82-bd0099c61bfb	b069b3dab49e1a4fc404d8ee99cfc29b88e1e0d8dcb9b6f272ccd9a0f39a5e1e	2025-03-16 18:16:40.563307+00	20250311202214_remove_option_relation_from_response	\N	\N	2025-03-16 18:16:40.555711+00	1
fb5735bb-bed0-4af6-bfda-4719ea984cd7	cb9d9ef773ea76f764f6d7c71e1978e682b44c55d01b80c7516c716782a11986	2025-03-16 18:16:40.331219+00	20250309035427_add_tests_table	\N	\N	2025-03-16 18:16:40.3107+00	1
5f13e5b3-121d-48ce-aee3-a2165a645705	4affe0a9c5749c6a53d532ec280f9bff9d9f150384b22799a623d9ebe10e9850	2025-03-16 18:16:40.355517+00	20250309084440_add_test_relation_to_candidate	\N	\N	2025-03-16 18:16:40.333434+00	1
fc423350-4533-4c48-a817-77182950df99	01766290c70ddebb6b0a5cfd607b98cd9735467b16ebad994cf807edbf788720	2025-03-16 18:16:40.365443+00	20250309090515_add_test_stage_relation	\N	\N	2025-03-16 18:16:40.357953+00	1
a4945b49-3d46-4450-baf7-f5d332162470	0ffa6e081e81211a4343a5126b83605f07964baa72f215369a5490fc084fa9a1	2025-03-16 18:16:40.574761+00	20250311_add_response_fields	\N	\N	2025-03-16 18:16:40.565762+00	1
675eb1eb-f4d1-4e4b-90ca-6346ef45940f	cb18dcc1caa60d2afe03e90cdc8da4fb1be6cf52ff97968f9f61a390854f6242	2025-03-16 18:16:40.394807+00	20250309185449_add_test_stage_table	\N	\N	2025-03-16 18:16:40.367597+00	1
39d17994-9474-4166-861b-98a71cddd3a3	1f7e87dc350d03037b2f297a523688cff334e9443bdf5663ef1030c05dff69a4	2025-03-16 18:16:40.43789+00	20250309202920_add_stage_question_relation	\N	\N	2025-03-16 18:16:40.397003+00	1
818c2382-5793-4b0a-b8a2-32b832bb8ac2	3cd738389bb7a9341ef266b241547574a498301ab8194d86b6fa7c49fb54b115	2025-03-16 18:16:40.48834+00	20250309224107_add_test_question_model	\N	\N	2025-03-16 18:16:40.440027+00	1
d0d5dab4-7292-4ada-b5ce-4a965eeff319	d958ef5c8daf67c8cc3d9238e2dcd24c7a1d82bc5e0acc17ab8d786f655459d3	2025-03-16 18:16:40.586032+00	20250312021449_add_time_spent_fields	\N	\N	2025-03-16 18:16:40.577523+00	1
2ed55821-b56b-42c0-a2b8-a7afcaef2587	316d3e211625833bf68636060352036f4813e23c267f5c02914159c5d4cce825	2025-03-16 18:16:40.5961+00	20250312174036_add_candidate_photo	\N	\N	2025-03-16 18:16:40.588443+00	1
68ed6632-1a77-4e63-8532-ec2664546ba7	f8c76d17bed547454739ec7e1e231589916b3af731fba01fb78a65e10707cbfa	2025-03-16 18:16:40.605214+00	20250312175119_add_candidate_score	\N	\N	2025-03-16 18:16:40.598261+00	1
ee916fb2-d55a-4a93-92e0-c4cffe0342b8	0412bace8337a2521636c2c78e76d94ac7ea863d8d7c6621cfe1455c1b7fb058	2025-03-16 18:16:40.614663+00	20250312175229_add_candidate_preferences	\N	\N	2025-03-16 18:16:40.60746+00	1
\.


--
-- Data for Name: tests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tests (id, title, description, "timeLimit", active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: Admin Admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_pkey" PRIMARY KEY (id);


--
-- Name: CandidateTest CandidateTest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CandidateTest"
    ADD CONSTRAINT "CandidateTest_pkey" PRIMARY KEY (id);


--
-- Name: Candidate Candidate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Candidate"
    ADD CONSTRAINT "Candidate_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


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
-- Name: StageQuestion StageQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StageQuestion"
    ADD CONSTRAINT "StageQuestion_pkey" PRIMARY KEY (id);


--
-- Name: Stage Stage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Stage"
    ADD CONSTRAINT "Stage_pkey" PRIMARY KEY (id);


--
-- Name: TestQuestion TestQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestQuestion"
    ADD CONSTRAINT "TestQuestion_pkey" PRIMARY KEY (id);


--
-- Name: TestStage TestStage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestStage"
    ADD CONSTRAINT "TestStage_pkey" PRIMARY KEY (id);


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
-- Name: tests tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_pkey PRIMARY KEY (id);


--
-- Name: Admin_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Admin_email_key" ON public."Admin" USING btree (email);


--
-- Name: CandidateTest_candidateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "CandidateTest_candidateId_idx" ON public."CandidateTest" USING btree ("candidateId");


--
-- Name: CandidateTest_candidateId_testId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CandidateTest_candidateId_testId_key" ON public."CandidateTest" USING btree ("candidateId", "testId");


--
-- Name: CandidateTest_inviteCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CandidateTest_inviteCode_key" ON public."CandidateTest" USING btree ("inviteCode");


--
-- Name: CandidateTest_testId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "CandidateTest_testId_idx" ON public."CandidateTest" USING btree ("testId");


--
-- Name: Candidate_inviteCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Candidate_inviteCode_key" ON public."Candidate" USING btree ("inviteCode");


--
-- Name: Response_candidateId_questionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Response_candidateId_questionId_key" ON public."Response" USING btree ("candidateId", "questionId");


--
-- Name: StageQuestion_questionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StageQuestion_questionId_idx" ON public."StageQuestion" USING btree ("questionId");


--
-- Name: StageQuestion_stageId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StageQuestion_stageId_idx" ON public."StageQuestion" USING btree ("stageId");


--
-- Name: StageQuestion_stageId_questionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "StageQuestion_stageId_questionId_key" ON public."StageQuestion" USING btree ("stageId", "questionId");


--
-- Name: TestQuestion_questionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TestQuestion_questionId_idx" ON public."TestQuestion" USING btree ("questionId");


--
-- Name: TestQuestion_stageId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TestQuestion_stageId_idx" ON public."TestQuestion" USING btree ("stageId");


--
-- Name: TestQuestion_testId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TestQuestion_testId_idx" ON public."TestQuestion" USING btree ("testId");


--
-- Name: TestQuestion_testId_stageId_questionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TestQuestion_testId_stageId_questionId_key" ON public."TestQuestion" USING btree ("testId", "stageId", "questionId");


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
-- Name: CandidateTest CandidateTest_candidateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CandidateTest"
    ADD CONSTRAINT "CandidateTest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES public."Candidate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CandidateTest CandidateTest_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CandidateTest"
    ADD CONSTRAINT "CandidateTest_testId_fkey" FOREIGN KEY ("testId") REFERENCES public.tests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Candidate Candidate_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Candidate"
    ADD CONSTRAINT "Candidate_testId_fkey" FOREIGN KEY ("testId") REFERENCES public.tests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Option Option_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Option"
    ADD CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."Question"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Question Question_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


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
-- Name: StageQuestion StageQuestion_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StageQuestion"
    ADD CONSTRAINT "StageQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."Question"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StageQuestion StageQuestion_stageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StageQuestion"
    ADD CONSTRAINT "StageQuestion_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES public."Stage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Stage Stage_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Stage"
    ADD CONSTRAINT "Stage_testId_fkey" FOREIGN KEY ("testId") REFERENCES public.tests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TestQuestion TestQuestion_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestQuestion"
    ADD CONSTRAINT "TestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."Question"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TestQuestion TestQuestion_stageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestQuestion"
    ADD CONSTRAINT "TestQuestion_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES public."Stage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TestQuestion TestQuestion_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestQuestion"
    ADD CONSTRAINT "TestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES public.tests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TestStage TestStage_stageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestStage"
    ADD CONSTRAINT "TestStage_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES public."Stage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TestStage TestStage_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestStage"
    ADD CONSTRAINT "TestStage_testId_fkey" FOREIGN KEY ("testId") REFERENCES public.tests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

