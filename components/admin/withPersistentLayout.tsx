import React from 'react';
import PersistentLayout from './PersistentLayout';

// Componente de ordem superior (HOC) para aplicar o layout persistente
export default function withPersistentLayout(Component: React.ComponentType<any>) {
  function WithPersistentLayout(props: any) {
    return (
      <PersistentLayout>
        <Component {...props} />
      </PersistentLayout>
    );
  }

  // Copiar displayName para facilitar debugging
  const displayName = Component.displayName || Component.name || 'Component';
  WithPersistentLayout.displayName = `withPersistentLayout(${displayName})`;

  return WithPersistentLayout;
}
