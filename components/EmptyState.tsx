import React, { ReactNode } from 'react';
import { FiInbox } from 'react-icons/fi';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4">
        {icon || <FiInbox className="w-12 h-12 text-secondary-400" />}
      </div>
      <h3 className="text-lg font-medium text-secondary-900 mb-2">{title}</h3>
      <p className="text-secondary-500 mb-6 max-w-md">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
