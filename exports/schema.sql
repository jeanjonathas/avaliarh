-- Create tables for AvaliaRH Database

CREATE TABLE IF NOT EXISTS "User" (
    "id" UUID PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Admin" (
    "id" UUID PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "company" VARCHAR(255),
    "position" VARCHAR(255),
    "phone" VARCHAR(50),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS "tests" (
    "id" UUID PRIMARY KEY,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "timeLimit" INTEGER,
    "active" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Stage" (
    "id" UUID PRIMARY KEY,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "testId" UUID REFERENCES "tests"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS "TestStage" (
    "id" UUID PRIMARY KEY,
    "testId" UUID REFERENCES "tests"("id"),
    "stageId" UUID REFERENCES "Stage"("id"),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Category" (
    "id" UUID PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Question" (
    "id" UUID PRIMARY KEY,
    "text" TEXT NOT NULL,
    "stageId" UUID REFERENCES "Stage"("id"),
    "categoryId" UUID REFERENCES "Category"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Option" (
    "id" UUID PRIMARY KEY,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT FALSE,
    "questionId" UUID REFERENCES "Question"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Candidate" (
    "id" UUID PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "position" VARCHAR(255),
    "testDate" TIMESTAMP WITH TIME ZONE,
    "completed" BOOLEAN DEFAULT FALSE,
    "infoJobsLink" TEXT,
    "interviewDate" TIMESTAMP WITH TIME ZONE,
    "observations" TEXT,
    "rating" INTEGER,
    "resumeFile" TEXT,
    "socialMediaUrl" TEXT,
    "status" VARCHAR(50) DEFAULT 'PENDING',
    "inviteCode" VARCHAR(10),
    "inviteSent" BOOLEAN DEFAULT FALSE,
    "inviteAttempts" INTEGER DEFAULT 0,
    "inviteExpires" TIMESTAMP WITH TIME ZONE,
    "github" TEXT,
    "linkedin" TEXT,
    "portfolio" TEXT,
    "resumeUrl" TEXT,
    "testId" UUID REFERENCES "tests"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS "UsedInviteCode" (
    "id" UUID PRIMARY KEY,
    "code" VARCHAR(10) NOT NULL,
    "usedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Response" (
    "id" UUID PRIMARY KEY,
    "candidateId" UUID REFERENCES "Candidate"("id"),
    "questionId" UUID REFERENCES "Question"("id"),
    "optionId" UUID REFERENCES "Option"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);
