import React from 'react';
import { 
  FiClock, 
  FiBook, 
  FiAward, 
  FiCalendar,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';

interface TimelineItem {
  id: string;
  type: 'access' | 'lesson' | 'test';
  description: string;
  date: string;
  courseId?: string;
  courseName?: string;
  lessonId?: string;
  lessonName?: string;
  moduleId?: string;
  moduleName?: string;
  timeSpent?: number;
  score?: number;
  passed?: boolean;
  icon: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

const Timeline: React.FC<TimelineProps> = ({ items }) => {
  // Renderizar ícone com base no tipo
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'FiClock':
        return <FiClock className="text-primary-500" size={20} />;
      case 'FiBook':
        return <FiBook className="text-blue-500" size={20} />;
      case 'FiAward':
        return <FiAward className="text-yellow-500" size={20} />;
      default:
        return <FiClock className="text-primary-500" size={20} />;
    }
  };

  // Formatar duração em horas, minutos e segundos
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 min';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else {
      return `${minutes} min`;
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Agrupar itens por data (dia)
  const groupItemsByDate = () => {
    const groups: { [key: string]: TimelineItem[] } = {};
    
    items.forEach(item => {
      const date = new Date(item.date);
      const dateKey = date.toLocaleDateString('pt-BR');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(item);
    });
    
    // Converter para array e ordenar por data (mais recente primeiro)
    return Object.entries(groups)
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => {
        const dateA = new Date(a.items[0].date);
        const dateB = new Date(b.items[0].date);
        return dateB.getTime() - dateA.getTime();
      });
  };

  const groupedItems = groupItemsByDate();

  return (
    <div className="w-full">
      {groupedItems.map((group, groupIndex) => (
        <div key={group.date} className="mb-8">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
              <FiCalendar className="text-primary-500" />
            </div>
            <h3 className="text-lg font-medium text-secondary-900">{group.date}</h3>
          </div>
          
          <div className="ml-5 pl-8 border-l-2 border-secondary-200">
            {group.items.map((item, itemIndex) => (
              <div 
                key={item.id} 
                className={`relative mb-6 ${itemIndex === group.items.length - 1 ? 'pb-0' : 'pb-2'}`}
              >
                {/* Marcador na linha do tempo */}
                <div className="absolute -left-10 mt-1.5 h-5 w-5 rounded-full bg-white border-2 border-primary-500 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary-500"></div>
                </div>
                
                {/* Conteúdo do item */}
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-primary-500">
                  <div className="flex items-start">
                    <div className="bg-secondary-100 p-2 rounded-full mr-4">
                      {renderIcon(item.icon)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
                        <h4 className="text-secondary-900 font-medium">{item.description}</h4>
                        <span className="text-secondary-500 text-sm flex items-center mt-1 sm:mt-0">
                          <FiClock className="mr-1" size={14} />
                          {formatDate(item.date).split(' ')[1]}
                        </span>
                      </div>
                      
                      {item.courseName && (
                        <div className="text-sm text-secondary-600 mb-2">
                          <span className="text-primary-600">{item.courseName}</span>
                          
                          {item.moduleName && (
                            <span> &gt; {item.moduleName}</span>
                          )}
                          
                          {item.lessonName && (
                            <span> &gt; {item.lessonName}</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap mt-2 text-sm">
                        {item.timeSpent !== undefined && (
                          <span className="mr-4 flex items-center text-secondary-600">
                            <FiClock className="mr-1" size={14} />
                            {formatDuration(item.timeSpent)}
                          </span>
                        )}
                        
                        {item.score !== undefined && (
                          <span className="mr-4 flex items-center text-blue-600">
                            <FiAward className="mr-1" size={14} />
                            Nota: {item.score}%
                          </span>
                        )}
                        
                        {item.passed !== undefined && (
                          <span className={`flex items-center ${item.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {item.passed ? (
                              <>
                                <FiCheckCircle className="mr-1" size={14} />
                                Aprovado
                              </>
                            ) : (
                              <>
                                <FiXCircle className="mr-1" size={14} />
                                Reprovado
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {items.length === 0 && (
        <div className="text-center py-8 text-secondary-500">
          Nenhum registro encontrado.
        </div>
      )}
    </div>
  );
};

export default Timeline;
