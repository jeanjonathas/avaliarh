import React from 'react';
import Link from 'next/link';
import { 
  PlusCircleIcon, 
  UserPlusIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  AcademicCapIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon
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
      
      <div className="p-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Criar Curso */}
        <Link
          href="/admin/training/courses/new"
          className="flex flex-col items-center justify-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <PlusCircleIcon className="h-8 w-8 text-primary-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Criar Curso</span>
        </Link>
        
        {/* Matricular Alunos */}
        <Link
          href="/admin/training/enrollments"
          className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <UserPlusIcon className="h-8 w-8 text-blue-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Matricular Alunos</span>
        </Link>
        
        {/* Gerenciar Testes */}
        <Link 
          href="/admin/training/tests"
          className="flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
        >
          <DocumentTextIcon className="h-8 w-8 text-yellow-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Gerenciar Testes</span>
        </Link>
        
        {/* Gerar Relatório */}
        <Link
          href="/admin/training/reports"
          className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
        >
          <ChartBarIcon className="h-8 w-8 text-green-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Relatórios</span>
        </Link>

        {/* Ver Progresso */}
        <Link
          href="/admin/training/student-progress"
          className="flex flex-col items-center justify-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <AcademicCapIcon className="h-8 w-8 text-indigo-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Progresso</span>
        </Link>

        {/* Gerenciar Conteúdo */}
        <Link
          href="/admin/training/modules"
          className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <BookOpenIcon className="h-8 w-8 text-purple-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Conteúdo</span>
        </Link>

        {/* Certificados */}
        <Link
          href="/admin/training/certificates"
          className="flex flex-col items-center justify-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <ClipboardDocumentListIcon className="h-8 w-8 text-amber-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Certificados</span>
        </Link>

        {/* Configurações */}
        <Link
          href="/admin/training/settings"
          className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Cog6ToothIcon className="h-8 w-8 text-gray-600 mb-2" />
          <span className="text-sm font-medium text-secondary-700">Configurações</span>
        </Link>
      </div>
    </div>
  );
};

export default QuickActions;
