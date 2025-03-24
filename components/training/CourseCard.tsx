import Link from 'next/link';
import Image from 'next/image';
import { FiBookOpen, FiLayers, FiClock, FiCheckCircle } from 'react-icons/fi';

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  sectorName: string;
  moduleCount: number;
  lessonCount: number;
  progress: number;
  completed: boolean;
  imageUrl?: string;
}

export default function CourseCard({
  id,
  title,
  description,
  sectorName,
  moduleCount,
  lessonCount,
  progress,
  completed,
  imageUrl,
}: CourseCardProps) {
  // Função para truncar texto
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Determinar cor da barra de progresso
  const getProgressColor = () => {
    if (completed) return 'bg-green-500';
    if (progress >= 75) return 'bg-green-400';
    if (progress >= 50) return 'bg-yellow-400';
    if (progress >= 25) return 'bg-orange-400';
    return 'bg-primary-400';
  };

  // Determinar status do curso
  const getStatusText = () => {
    if (completed) return 'Concluído';
    if (progress > 0) return 'Em andamento';
    return 'Não iniciado';
  };

  // Determinar cor do status
  const getStatusColor = () => {
    if (completed) return 'bg-green-100 text-green-800';
    if (progress > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-secondary-100 text-secondary-800';
  };

  return (
    <Link href={`/treinamento/cursos/${id}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
        {/* Imagem do curso */}
        <div className="h-40 bg-primary-100 relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 384px"
              style={{ objectFit: 'cover' }}
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary-500 to-primary-600">
              <FiBookOpen className="text-white w-16 h-16" />
            </div>
          )}
          
          {/* Badge de status */}
          <div className="absolute top-4 right-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>
        
        {/* Conteúdo do card */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">{title}</h3>
            <p className="text-sm text-secondary-600 mb-4">
              {truncateText(description, 120)}
            </p>
            
            {/* Setor */}
            <div className="mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary-50 text-primary-700">
                {sectorName}
              </span>
            </div>
            
            {/* Estatísticas do curso */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-secondary-500">
              <div className="flex items-center">
                <FiLayers className="mr-1" />
                <span>{moduleCount} módulos</span>
              </div>
              <div className="flex items-center">
                <FiBookOpen className="mr-1" />
                <span>{lessonCount} aulas</span>
              </div>
            </div>
          </div>
          
          {/* Barra de progresso */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-secondary-700">Progresso</span>
              <span className="text-xs font-medium text-secondary-700">{progress}%</span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2">
              <div
                className={`${getProgressColor()} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          {/* Botão de ação */}
          <div className="mt-4">
            <button className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition duration-200 flex items-center justify-center">
              {completed ? (
                <>
                  <FiCheckCircle className="mr-2" />
                  Ver certificado
                </>
              ) : progress > 0 ? (
                <>
                  <FiClock className="mr-2" />
                  Continuar
                </>
              ) : (
                <>
                  <FiBookOpen className="mr-2" />
                  Iniciar curso
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
