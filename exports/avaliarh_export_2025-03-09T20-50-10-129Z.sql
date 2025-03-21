-- Admitto Database Export
-- Date: 2025-03-09T20:50:10.130Z

-- Configuração inicial
BEGIN;

-- Exportando 1 registros de User
INSERT INTO "User" ("id", "name", "email", "password", "role", "createdAt", "updatedAt") VALUES ('088a4dcb-e73f-48cd-80a9-6e85bf5992a0', 'Administrador', 'admin@empresa.com', '$2a$10$xZU/dreebv47bqRJzrD5MOICiNvWMDFhcd.KIgLzTjMvppNBCSbFm', 'ADMIN', '2025-03-09T08:44:40.859Z', '2025-03-09T08:44:40.859Z');

-- Exportando 1 registros de Admin
INSERT INTO "Admin" ("id", "name", "email", "password", "company", "position", "phone", "createdAt", "updatedAt") VALUES ('368c905c-ff49-490f-bd01-8c4c7be7dd84', 'Administrador', 'admin@empresa.com', '$2a$10$BVLGbuythDlesbnmG1/xPeVInN19Oo25E1i.FaJ06rZQcndG92InC', 'AvaliaRH', 'Gerente de RH', '(11) 99999-9999', '2025-03-09T08:44:40.935Z', '2025-03-09T08:44:40.935Z');

-- Exportando 1 registros de tests
INSERT INTO "tests" ("id", "title", "description", "timeLimit", "active", "createdAt", "updatedAt") VALUES ('e292c916-8dd0-4bac-847f-f21b9a2e9c11', 'Teste de Inteligência Geral - GIA', NULL, 60, TRUE, '2025-03-09T09:09:58.395Z', '2025-03-09T09:09:58.395Z');

-- Exportando 15 registros de Stage
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('cd18b0fc-fd29-4d8e-aa02-1d042a60cdcd', 'yu', NULL, 0, '2025-03-09T09:12:45.574Z', '2025-03-09T09:12:45.574Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('a8efed8c-adc9-4703-bd74-da932fa267ce', 'fghjfghj', NULL, 0, '2025-03-09T09:13:28.849Z', '2025-03-09T09:13:28.849Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('3785042b-bb95-4130-a5f9-554c19462a1d', 'dfgh', NULL, 0, '2025-03-09T09:15:18.863Z', '2025-03-09T09:57:43.983Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('5d2a4a55-64cd-40e5-a941-0c6b6ec8b9be', 'dfgh', NULL, 0, '2025-03-09T09:15:33.965Z', '2025-03-09T10:00:58.539Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('0d1f6218-42eb-43d7-a3ce-89ce364be8dc', 'teste', NULL, 2, '2025-03-09T19:41:05.154Z', '2025-03-09T19:41:05.154Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('a22b7f9a-708a-49b6-abb3-0995d80c4518', 'adaaaa', NULL, 2, '2025-03-09T19:44:45.609Z', '2025-03-09T19:44:45.609Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('216fa339-8f5c-4137-92ee-bf642502da80', 'aaaaaaaaaaaaaa', NULL, 2, '2025-03-09T19:45:10.388Z', '2025-03-09T19:45:10.388Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('def5730a-1aa1-47a8-afaf-7da6802d245f', 'aaaaaaaaaaaaaa', NULL, 2, '2025-03-09T19:45:24.793Z', '2025-03-09T19:45:24.793Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('96ed5f17-297f-4503-8b1c-e99c0d0302db', 'dfgs', NULL, 2, '2025-03-09T19:46:21.672Z', '2025-03-09T19:46:21.672Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('332a0dff-75ad-497a-bde4-213b8cf5f99a', 'sdfg', NULL, 2, '2025-03-09T19:46:28.570Z', '2025-03-09T19:46:28.570Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('b078b766-c136-416a-a2b1-43c13129074a', 'teseee', NULL, 2, '2025-03-09T19:47:40.933Z', '2025-03-09T19:47:40.933Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('35fb92ef-87d8-4639-9fb9-a4e855112831', '1', NULL, 0, '2025-03-09T09:58:02.907Z', '2025-03-09T10:07:56.974Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('bank-questions-stage', 'Banco de Questões', 'Repositório de questões não associadas a nenhuma etapa específica', 0, '2025-03-09T18:34:31.087Z', '2025-03-09T18:34:31.086Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('bfbbb067-39c4-4d8a-8d54-bc39e67f7500', 'etapa 1', NULL, 0, '2025-03-09T19:59:21.631Z', '2025-03-09T19:59:21.631Z', NULL);
INSERT INTO "Stage" ("id", "title", "description", "order", "createdAt", "updatedAt", "testId") VALUES ('306a193b-bc9c-4c8a-b6d4-fa5bc2fb9774', 'etapa 2', NULL, 1, '2025-03-09T19:59:26.972Z', '2025-03-09T19:59:37.045Z', NULL);

-- Exportando 2 registros de TestStage
INSERT INTO "TestStage" ("id", "testId", "stageId", "order", "createdAt", "updatedAt") VALUES ('fe01f4fd-ced3-4006-8778-dd0dc2fb3b8e', 'e292c916-8dd0-4bac-847f-f21b9a2e9c11', 'bfbbb067-39c4-4d8a-8d54-bc39e67f7500', 0, '2025-03-09T19:59:21.644Z', '2025-03-09T19:59:21.644Z');
INSERT INTO "TestStage" ("id", "testId", "stageId", "order", "createdAt", "updatedAt") VALUES ('6219b0b7-7e9e-41cf-ab63-f629ea56a0a6', 'e292c916-8dd0-4bac-847f-f21b9a2e9c11', '306a193b-bc9c-4c8a-b6d4-fa5bc2fb9774', 1, '2025-03-09T19:59:26.976Z', '2025-03-09T19:59:26.976Z');

-- Exportando 1 registros de Category
INSERT INTO "Category" ("id", "name", "description", "createdAt", "updatedAt") VALUES ('3e9b3ae1-936d-4a70-b812-759adc0e73cb', 'Conhecimentos Gerais', NULL, '2025-03-09T09:24:22.829Z', '2025-03-09T09:43:39.280Z');

-- Exportando 2 registros de Question
INSERT INTO "Question" ("id", "text", "stageId", "createdAt", "updatedAt", "categoryId") VALUES ('809cbea4-6c6e-466f-9a92-095835e8421f', 'Pergunta 2', 'bank-questions-stage', '2025-03-09T20:19:48.043Z', '2025-03-09T20:19:48.041Z', NULL);
INSERT INTO "Question" ("id", "text", "stageId", "createdAt", "updatedAt", "categoryId") VALUES ('f3fbf525-d153-4bbe-b627-c551af874e80', 'Pergunta 1', 'bank-questions-stage', '2025-03-09T20:19:50.661Z', '2025-03-09T20:19:50.660Z', NULL);

-- Exportando 4 registros de Option
INSERT INTO "Option" ("id", "text", "isCorrect", "questionId", "createdAt", "updatedAt") VALUES ('595786a2-bfaf-4ec1-8a97-b57195e5d8c9', '11', TRUE, '809cbea4-6c6e-466f-9a92-095835e8421f', '2025-03-09T20:19:48.056Z', '2025-03-09T20:19:48.054Z');
INSERT INTO "Option" ("id", "text", "isCorrect", "questionId", "createdAt", "updatedAt") VALUES ('dd81335b-8a7e-4fc6-9f57-b2d80de494c2', 'fghj', FALSE, '809cbea4-6c6e-466f-9a92-095835e8421f', '2025-03-09T20:19:48.058Z', '2025-03-09T20:19:48.057Z');
INSERT INTO "Option" ("id", "text", "isCorrect", "questionId", "createdAt", "updatedAt") VALUES ('8c6c17a3-658e-44c0-95ca-acf452923f71', 'alternativa a', TRUE, 'f3fbf525-d153-4bbe-b627-c551af874e80', '2025-03-09T20:19:50.665Z', '2025-03-09T20:19:50.663Z');
INSERT INTO "Option" ("id", "text", "isCorrect", "questionId", "createdAt", "updatedAt") VALUES ('1f8d6a98-b11d-420d-bc84-a1564fb24299', 'alternativa b', FALSE, 'f3fbf525-d153-4bbe-b627-c551af874e80', '2025-03-09T20:19:50.667Z', '2025-03-09T20:19:50.665Z');

-- Nenhum registro encontrado para StageQuestion

-- Exportando 1 registros de Candidate
INSERT INTO "Candidate" ("id", "name", "email", "phone", "position", "testDate", "completed", "createdAt", "updatedAt", "infoJobsLink", "interviewDate", "observations", "rating", "resumeFile", "socialMediaUrl", "status", "inviteCode", "inviteSent", "inviteAttempts", "inviteExpires", "github", "linkedin", "portfolio", "resumeUrl", "testId") VALUES ('ada3a898-bd44-4b5c-bb36-b462860a7916', 'Katherine', 'katherine.ximenes15@gmail.com', '51982606176', 'recepção', '2025-03-09T08:48:52.411Z', FALSE, '2025-03-09T08:48:52.411Z', '2025-03-09T08:48:52.411Z', NULL, NULL, NULL, NULL, NULL, NULL, 'PENDING', '1294', FALSE, 0, '2025-03-16T18:09:21.693Z', NULL, NULL, NULL, NULL, 'e292c916-8dd0-4bac-847f-f21b9a2e9c11');

-- Nenhum registro encontrado para Response

-- Exportando 2 registros de UsedInviteCode
INSERT INTO "UsedInviteCode" ("id", "code", "usedAt", "expiresAt") VALUES ('bf86188a-6c13-445a-8435-968770c4bc70', '9379', '2025-03-09T18:04:23.336Z', '2025-03-16T08:48:52.410Z');
INSERT INTO "UsedInviteCode" ("id", "code", "usedAt", "expiresAt") VALUES ('8ae1e8e0-f6ce-4add-8d3b-53b9927600b6', '7790', '2025-03-09T18:09:21.693Z', '2025-03-16T18:04:23.336Z');

COMMIT;
