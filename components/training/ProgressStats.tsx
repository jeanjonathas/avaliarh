import { FiBook, FiBarChart2, FiClock, FiAward, FiCheckCircle, FiActivity } from 'react-icons/fi';

interface ProgressStatsProps {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  averageScore: number;
  totalLessonsCompleted: number;
  totalTimeSpent: number; // em minutos
}

export default function ProgressStats({
  totalCourses,
  completedCourses,
  inProgressCourses,
  averageScore,
  totalLessonsCompleted,
  totalTimeSpent,
}: ProgressStatsProps) {
  // Formatar tempo total (converter minutos para horas e minutos)
  const formatTimeSpent = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} minutos`;
    } else if (mins === 0) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} e ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
    }
  };

  // Calcular porcentagem de conclusão
  const completionPercentage = totalCourses > 0 
    ? Math.round((completedCourses / totalCourses) * 100) 
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-secondary-900 mb-4">Meu Progresso</h2>
      
      {/* Barra de progresso geral */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-secondary-700">Progresso Geral</span>
          <span className="text-sm font-medium text-secondary-700">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-secondary-200 rounded-full h-3">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Cursos */}
        <div className="bg-primary-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-full">
              <FiBook className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="ml-3 text-sm font-medium text-primary-800">Cursos</h3>
          </div>
          <div className="mt-2">
            <div className="flex justify-between">
              <span className="text-xs text-secondary-500">Total</span>
              <span className="text-xs font-medium text-secondary-900">{totalCourses}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-secondary-500">Concluídos</span>
              <span className="text-xs font-medium text-green-600">{completedCourses}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-secondary-500">Em andamento</span>
              <span className="text-xs font-medium text-yellow-600">{inProgressCourses}</span>
            </div>
          </div>
        </div>
        
        {/* Pontuação */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-full">
              <FiBarChart2 className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="ml-3 text-sm font-medium text-green-800">Pontuação</h3>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <div className="relative">
              <svg className="w-24 h-24">
                <circle
                  className="text-secondary-200"
                  strokeWidth="6"
                  stroke="currentColor"
                  fill="transparent"
                  r="36"
                  cx="48"
                  cy="48"
                />
                <circle
                  className="text-green-500"
                  strokeWidth="6"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="36"
                  cx="48"
                  cy="48"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - averageScore / 100)}`}
                  transform="rotate(-90 48 48)"
                />
              </svg>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <span className="text-xl font-bold text-secondary-900">{averageScore}%</span>
                <span className="block text-xs text-secondary-500">Média</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Atividades */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-full">
              <FiActivity className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="ml-3 text-sm font-medium text-blue-800">Atividades</h3>
          </div>
          <div className="mt-2">
            <div className="flex justify-between">
              <span className="text-xs text-secondary-500">Aulas concluídas</span>
              <span className="text-xs font-medium text-secondary-900">{totalLessonsCompleted}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-secondary-500">Tempo de estudo</span>
              <span className="text-xs font-medium text-secondary-900">{formatTimeSpent(totalTimeSpent)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
