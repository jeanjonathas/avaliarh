# AvaliaRH - Training Management System Implementation Checklist

## Overview
This checklist outlines the implementation plan for the training management system within AvaliaRH. The system will allow companies to create and manage training courses for their employees, with modules, lessons, and tests to track progress and knowledge acquisition.

## Database Schema Implementation

### 1. Course Model
- [x] Add `Course` model to Prisma schema
  - [x] Basic fields: id, name, description, sectorId, companyId, createdAt, updatedAt
  - [x] Configuration fields: showResults, finalTestRequired
  - [x] Relations: modules, sector, company, enrollments

### 2. Module Model
- [x] Add `Module` model to Prisma schema
  - [x] Basic fields: id, name, description, order, courseId, createdAt, updatedAt
  - [x] Configuration fields: finalTestId (optional)
  - [x] Relations: course, lessons, finalTest

### 3. Lesson Model
- [x] Add `Lesson` model to Prisma schema
  - [x] Basic fields: id, name, description, order, moduleId, createdAt, updatedAt
  - [x] Content fields: type (VIDEO, AUDIO, SLIDES, TEXT), content, duration
  - [x] Configuration fields: finalTestId (optional)
  - [x] Relations: module, finalTest, progress records

### 4. Sector Model
- [x] Add `Sector` model to Prisma schema
  - [x] Basic fields: id, name, description, companyId, createdAt, updatedAt
  - [x] Relations: company, courses

### 5. CourseEnrollment Model
- [x] Add `CourseEnrollment` model to Prisma schema
  - [x] Basic fields: id, studentId, courseId, enrollmentDate, completionDate, progress
  - [x] Relations: student, course

### 6. LessonProgress Model
- [x] Add `LessonProgress` model to Prisma schema
  - [x] Basic fields: id, studentId, lessonId, timeSpent, completed, completedAt
  - [x] Relations: student, lesson

### 7. TrainingTest Model
- [x] Add `TrainingTest` model to Prisma schema
  - [x] Basic fields: id, name, description, timeLimit, passingScore
  - [x] Relations: questions, attempts, course/module/lesson

### 8. TrainingQuestion Model
- [x] Add `TrainingQuestion` model to Prisma schema
  - [x] Basic fields: id, text, type, testId, createdAt, updatedAt
  - [x] Relations: test, options, attempts

### 9. TrainingOption Model
- [x] Add `TrainingOption` model to Prisma schema
  - [x] Basic fields: id, text, isCorrect, questionId, createdAt, updatedAt
  - [x] Relations: question, answers

### 10. TestAttempt Model
- [x] Add `TestAttempt` model to Prisma schema
  - [x] Basic fields: id, studentId, testId, startTime, endTime, score, passed
  - [x] Relations: student, test, answers

### 11. QuestionAnswer Model
- [x] Add `QuestionAnswer` model to Prisma schema
  - [x] Basic fields: id, attemptId, questionId, optionId, isCorrect
  - [x] Relations: attempt, question, option

### 12. AccessLog Model
- [x] Add `AccessLog` model to Prisma schema
  - [x] Basic fields: id, studentId, courseId, accessDate, timeSpent
  - [x] Relations: student, course

### 13. Schema Integration
- [x] Integrate training schema with main Prisma schema
- [x] Generate Prisma Client with new models
- [x] Sync database with updated schema

## API Implementation

### Admin API Endpoints
- [x] Create `/api/admin/training/courses` endpoint (GET, POST)
- [x] Create `/api/admin/training/courses/[id]` endpoint (GET, PUT, DELETE)
- [x] Create `/api/admin/training/modules` endpoint (GET, POST)
- [x] Create `/api/admin/training/modules/[id]` endpoint (GET, PUT, DELETE)
- [x] Create `/api/admin/training/lessons` endpoint (GET, POST)
- [x] Create `/api/admin/training/lessons/[id]` endpoint (GET, PUT, DELETE)
- [x] Create `/api/admin/training/sectors` endpoint (GET, POST)
- [x] Create `/api/admin/training/sectors/[id]` endpoint (GET, PUT, DELETE)
- [x] Create `/api/admin/training/students` endpoint (GET) 
- [x] Create `/api/admin/training/students/[id]` endpoint (GET)
- [x] Create `/api/admin/training/students/[id]/enroll` endpoint (POST)
- [x] Create `/api/admin/training/statistics` endpoint (GET)
- [x] Create `/api/admin/training/upload` endpoint for lesson content files (POST)
- [x] Create `/api/admin/training/tests` endpoint (GET, POST)
- [x] Create `/api/admin/training/tests/[id]` endpoint (GET, PUT, DELETE)
- [x] Create `/api/admin/training/questions` endpoint (GET, POST)
- [x] Create `/api/admin/training/questions/[id]` endpoint (GET, PUT, DELETE)
- [ ] Fix TypeScript errors in API implementations
  - [ ] Fix errors in `/api/admin/training/students/[id]` endpoint
  - [ ] Fix errors in `/api/admin/training/students/[id]/enroll` endpoint
  - [ ] Fix errors in `/api/admin/training/statistics` endpoint
  - [ ] Fix errors in remaining API endpoints

### Student API Endpoints
- [x] Create `/api/training/courses` endpoint (GET)
- [x] Create `/api/training/courses/[id]` endpoint (GET)
- [x] Create `/api/training/courses/[id]/enroll` endpoint (POST)
- [x] Create `/api/training/modules/[id]` endpoint (GET)
- [x] Create `/api/training/lessons/[id]` endpoint (GET)
- [x] Create `/api/training/lessons/[id]/progress` endpoint (POST)
- [x] Create `/api/training/tests/[id]` endpoint (GET)
- [x] Create `/api/training/tests/[id]/submit` endpoint (POST)
- [x] Create `/api/training/statistics` endpoint (GET)

## Admin UI Implementation

### 1. Course Management
- [x] Create `/admin/training` page with course listing
- [x] Create `/admin/training/courses/new` page for course creation
- [x] Create `/admin/training/courses/[id]` page for course details/editing
- [x] Implement course deletion functionality

### 2. Module Management
- [x] Create module listing component within course details page
- [x] Create module creation modal/form
- [x] Create module editing functionality
- [x] Implement module deletion functionality
- [x] Implement module reordering functionality

### 3. Lesson Management
- [x] Create lesson listing component within module details
- [x] Create lesson creation modal/form
- [x] Create lesson editing functionality
- [x] Implement lesson deletion functionality
- [x] Implement lesson reordering functionality
- [x] Create content upload/embedding functionality for different content types

### 4. Test Management
- [x] Create test creation interface for courses, modules, and lessons
- [x] Create question management interface
- [x] Create option management interface for questions
- [x] Implement test configuration (passing score, time limits, etc.)

### 5. Student Management
- [x] Create student enrollment interface
- [x] Create student progress tracking dashboard
- [x] Create reporting functionality for course completion

### 6. Navigation and Menu Structure
- [x] Implementar estrutura de menu lateral para a seção de treinamento
- [x] Criar componentes de submenu para melhor organização
- [x] Implementar indicadores visuais para itens ativos no menu
- [x] Organizar menu em categorias lógicas (Cursos, Conteúdo, Avaliações, Alunos, etc.)
- [x] Adicionar breadcrumbs nas páginas para facilitar a navegação
- [x] Implementar navegação contextual entre páginas relacionadas
- [x] Adicionar atalhos para ações frequentes no dashboard

### 7. Páginas do Sistema de Treinamento
- [x] Criar página `/admin/training/dashboard` (Dashboard principal)
- [x] Criar página `/admin/training/courses` (Listagem de cursos)
- [x] Criar página `/admin/training/courses/new` (Formulário de novo curso)
- [x] Criar página `/admin/training/courses/[id]` (Detalhes do curso)
- [x] Criar página `/admin/training/courses/[id]/edit` (Edição de curso)
- [x] Criar página `/admin/training/sectors` (Gerenciamento de setores)
- [x] Criar página `/admin/training/modules` (Listagem de módulos)
- [x] Criar página `/admin/training/lessons` (Listagem de aulas)
- [x] Criar página `/admin/training/tests` (Listagem de testes)
- [x] Criar página `/admin/training/questions` (Banco de questões)
- [x] Criar página `/admin/training/students` (Listagem de alunos)
- [x] Criar página `/admin/training/enrollments` (Matrículas)
- [x] Criar página `/admin/training/certificates` (Certificados)
- [x] Criar página `/admin/training/reports` (Relatórios)

## Student UI Implementation

### 1. Course Listing
- [x] Create `/treinamento` page with available courses
- [x] Implement course filtering and search functionality
- [x] Create StudentLayout component for consistent navigation
- [x] Implement CourseCard component for displaying course information
- [x] Create ProgressStats component for tracking overall progress

### 2. Course Details
- [x] Create `/treinamento/cursos/[id]` page with course overview
- [x] Display modules and progress information
- [x] Show completion status and certificates (if applicable)
- [x] Implement module expansion/collapse functionality
- [x] Add navigation between course modules and lessons
- [x] Display lesson status (completed, locked, in progress)

### 3. Lesson Viewing
- [x] Create `/treinamento/aulas/[id]` page for consuming lesson content
- [x] Implement video player for video content
- [x] Implement audio player for audio content
- [x] Implement PDF viewer for slide content
- [x] Implement text viewer for text content
- [x] Create progress tracking functionality (time spent, completion)
- [x] Add "Mark as completed" button with appropriate timing
- [x] Implement navigation between lessons
- [x] Add test prompts after lesson completion when applicable

### 4. Test Taking
- [x] Create test interface for students
- [x] Implement timer functionality
- [x] Create question navigation
- [x] Implement test submission and scoring
- [x] Display results based on course configuration
- [x] Create TestQuestion component for displaying and answering questions
- [x] Create TestTimer component for tracking time limits
- [x] Create TestProgress component for navigating between questions
- [x] Create TestResults component for displaying test outcomes
- [x] Add support for different question types (multiple choice, single choice)
- [x] Create LessonContent component for displaying different content types

### 5. Certificados e Conclusão
- [ ] Criar página `/treinamento/certificados/[id]` para exibir certificados
- [ ] Implementar geração de PDF para certificados
- [ ] Adicionar opção para compartilhar certificados
- [ ] Criar página de histórico de cursos concluídos
- [ ] Implementar sistema de badges/conquistas

### 6. Perfil do Aluno
- [ ] Criar página `/treinamento/perfil` para gerenciar informações do aluno
- [ ] Implementar visualização de estatísticas pessoais
- [ ] Adicionar histórico de atividades
- [ ] Permitir personalização de preferências de notificação
- [ ] Implementar sistema de favoritos para cursos

### 7. Notificações e Lembretes
- [ ] Implementar sistema de notificações para novos cursos disponíveis
- [ ] Criar lembretes para cursos em andamento
- [ ] Adicionar alertas para testes pendentes
- [ ] Implementar notificações de prazos de conclusão
- [ ] Criar sistema de e-mails para lembretes importantes

## Additional Features

### 1. Reporting
- [ ] Create reports for course completion rates
- [ ] Create reports for test performance
- [ ] Create reports for time spent on training

### 2. Notifications
- [ ] Implement email notifications for course enrollment
- [ ] Implement notifications for test results
- [ ] Implement reminders for incomplete courses

### 3. Certificates
- [ ] Create certificate generation for completed courses
- [ ] Implement certificate download functionality

## Testing

### 1. Unit Tests
- [ ] Write tests for API endpoints
- [ ] Write tests for business logic

### 2. Integration Tests
- [ ] Test course creation and management workflow
- [ ] Test student enrollment and progress tracking

### 3. UI Tests
- [ ] Test responsive design
- [ ] Test content display for different types

## Deployment

- [ ] Update database schema in production
- [ ] Deploy API changes
- [ ] Deploy UI changes
- [ ] Monitor for any issues

## Documentation

- [ ] Create admin documentation for course management
- [ ] Create student documentation for using the training platform
- [ ] Document API endpoints for potential integrations
