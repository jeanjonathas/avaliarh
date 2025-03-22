import React from 'react';
import Link from 'next/link';
import { 
  PlusCircleIcon, 
  UserPlusIcon, 
  DocumentTextIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline';

interface QuickActionsProps {
  onCreateCourse?: () => void;
  onEnrollStudents?: () => void;
  onGenerateReport?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ 
  onCreateCourse, 
  onEnrollStudents, 
  onGenerateReport 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-700">Ações Rápidas</h3>
      </div>
      
      <div className="p-6 grid grid-cols-2 gap-4">
        {/* Criar Curso */}
        <button
          onClick={onCreateCourse}
          className="flex flex-col items-center justify-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <PlusCircleIcon className="h-8 w-8 text-primary-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Criar Curso</span>
        </button>
        
        {/* Matricular Alunos */}
        <button
          onClick={onEnrollStudents}
          className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <UserPlusIcon className="h-8 w-8 text-blue-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Matricular Alunos</span>
        </button>
        
        {/* Gerenciar Testes */}
        <Link 
          href="/admin/training/tests"
          className="flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
        >
          <DocumentTextIcon className="h-8 w-8 text-yellow-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Gerenciar Testes</span>
        </Link>
        
        {/* Gerar Relatório */}
        <button
          onClick={onGenerateReport}
          className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
        >
          <ChartBarIcon className="h-8 w-8 text-green-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Gerar Relatório</span>
        </button>
      </div>
    </div>
  );
};

export default QuickActions;
