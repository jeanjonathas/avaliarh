// Enums para tipos de pergunta e níveis de dificuldade
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',  // Questão com resposta correta
  OPINION_MULTIPLE = 'OPINION_MULTIPLE' // Questão opinativa categorizada
}

export enum QuestionDifficulty {
  EASY = 'EASY',      // Questão simples
  MEDIUM = 'MEDIUM',  // Questão moderada
  HARD = 'HARD'       // Questão complexa
}

// Interface para opções de perguntas
export interface QuestionOption {
  id?: string;
  text: string;
  isCorrect?: boolean;
  weight?: number;
  category?: string;
}

// Interface para perguntas
export interface Question {
  id: string;
  text: string;
  stageId?: string;
  stageName?: string;
  categoryId?: string;
  categoryUuid?: string;
  categoryName?: string;
  categories?: { id: string; name: string }[];
  type: QuestionType;
  difficulty: QuestionDifficulty;
  showResults?: boolean;
  initialExplanation?: string;
  options: QuestionOption[];
}

// Interface para estágios de teste
export interface TestStage {
  id: string;
  testId: string;
  stageId: string;
  order: number;
  stage: Stage;
}

// Interface para QuestionStage (relação entre Stage e Question)
export interface QuestionStage {
  id: string;
  questionId: string;
  stageId: string;
  order: number;
  question: Question;
}

// Interface para Stage
export interface Stage {
  id: string;
  title: string;
  description: string | null;
  order: number;
  testId?: string;
  questionType?: string;
  questions: Question[];
  questionStages?: QuestionStage[];
  requestPhoto?: boolean;
}
