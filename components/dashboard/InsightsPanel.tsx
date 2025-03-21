import React from 'react';

interface Insight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'tip';
  title: string;
  description: string;
}

interface InsightsPanelProps {
  insights: Insight[];
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights }) => {
  const getInsightStyles = (type: 'info' | 'warning' | 'success' | 'tip') => {
    switch (type) {
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          title: 'text-blue-700',
          text: 'text-blue-600',
          icon: (
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          title: 'text-yellow-700',
          text: 'text-yellow-600',
          icon: (
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          title: 'text-green-700',
          text: 'text-green-600',
          icon: (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      case 'tip':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          title: 'text-purple-700',
          text: 'text-purple-600',
          icon: (
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )
        };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-700">Insights e Recomendações</h3>
      </div>
      <div className="p-6 space-y-4">
        {insights.length === 0 ? (
          <div className="text-center text-secondary-500">
            Nenhum insight disponível no momento
          </div>
        ) : (
          insights.map((insight) => {
            const styles = getInsightStyles(insight.type);
            return (
              <div 
                key={insight.id} 
                className={`p-4 rounded-lg border ${styles.bg} ${styles.border}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    {styles.icon}
                  </div>
                  <div className="ml-3">
                    <h4 className={`text-sm font-medium ${styles.title}`}>{insight.title}</h4>
                    <p className={`mt-1 text-sm ${styles.text}`}>{insight.description}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InsightsPanel;
