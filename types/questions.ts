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
  id?: string;
  text: string;
  stageId?: string;
  stageName?: string;
  categoryUuid?: string;
  categoryName?: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  showResults?: boolean;
  initialExplanation?: string;
  options: QuestionOption[];
}
