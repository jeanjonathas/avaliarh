import { Prisma, Question, Category } from '@prisma/client';

// Estendendo os tipos do Prisma para incluir os campos adicionais
declare global {
  namespace PrismaJson {
    // Estendendo o tipo Question para incluir questionType
    interface QuestionGetPayload extends Prisma.QuestionGetPayload<{}> {
      questionType: 'selection' | 'training';
    }

    // Estendendo o tipo Category para incluir categoryType
    interface CategoryGetPayload extends Prisma.CategoryGetPayload<{}> {
      categoryType: 'selection' | 'training';
    }
  }
}

// Estendendo o tipo Question
declare module '@prisma/client' {
  interface Question {
    questionType: 'selection' | 'training';
    categories?: Category[];
    stage?: Stage;
    options?: Option[];
  }

  interface Category {
    categoryType: 'selection' | 'training';
    questions?: Question[];
    _count?: {
      questions: number;
    };
  }

  interface Stage {
    id: string;
    title: string;
    description?: string;
    order: number;
  }

  interface Option {
    id: string;
    text: string;
    isCorrect: boolean;
    questionId: string;
    categoryId?: string;
    weight?: number;
    position?: number;
    category?: Category;
  }

  // Estendendo os tipos de entrada do Prisma
  namespace Prisma {
    interface QuestionWhereInput {
      questionType?: string | Prisma.StringFilter<"Question"> | null;
    }

    interface CategoryWhereInput {
      categoryType?: string | Prisma.StringFilter<"Category"> | null;
    }

    interface QuestionCreateInput {
      questionType?: string;
    }

    interface CategoryCreateInput {
      categoryType?: string;
    }
  }
}

export {};
