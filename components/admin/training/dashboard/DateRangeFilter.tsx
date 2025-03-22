import React, { useState } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onFilterChange: (startDate: string, endDate: string) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ 
  startDate, 
  endDate, 
  onFilterChange 
}) => {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  const handleApplyFilter = () => {
    onFilterChange(localStartDate, localEndDate);
  };

  const handleQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const formattedStart = start.toISOString().split('T')[0];
    const formattedEnd = end.toISOString().split('T')[0];
    
    setLocalStartDate(formattedStart);
    setLocalEndDate(formattedEnd);
    
    onFilterChange(formattedStart, formattedEnd);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <CalendarIcon className="h-5 w-5 text-primary-500 mr-2" />
          <h3 className="text-md font-medium text-secondary-700">Filtrar por período</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex items-center">
            <label htmlFor="start-date" className="text-sm text-secondary-500 mr-2">De:</label>
            <input
              id="start-date"
              type="date"
              className="border border-secondary-300 rounded-md px-3 py-1 text-sm text-secondary-700 focus:ring-primary-500 focus:border-primary-500"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
            />
          </div>
          
          <div className="flex items-center">
            <label htmlFor="end-date" className="text-sm text-secondary-500 mr-2">Até:</label>
            <input
              id="end-date"
              type="date"
              className="border border-secondary-300 rounded-md px-3 py-1 text-sm text-secondary-700 focus:ring-primary-500 focus:border-primary-500"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
            />
          </div>
          
          <button
            onClick={handleApplyFilter}
            className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
          >
            Aplicar
          </button>
        </div>
      </div>
      
      <div className="mt-3 flex flex-wrap gap-2 justify-end">
        <button
          onClick={() => handleQuickFilter(7)}
          className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors text-xs"
        >
          Últimos 7 dias
        </button>
        <button
          onClick={() => handleQuickFilter(30)}
          className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors text-xs"
        >
          Últimos 30 dias
        </button>
        <button
          onClick={() => handleQuickFilter(90)}
          className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors text-xs"
        >
          Últimos 3 meses
        </button>
        <button
          onClick={() => handleQuickFilter(365)}
          className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors text-xs"
        >
          Último ano
        </button>
      </div>
    </div>
  );
};

export default DateRangeFilter;
