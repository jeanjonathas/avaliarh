import { Toaster } from 'react-hot-toast';

export const GlobalToaster = () => {
  return (
    <Toaster
      position="bottom-center"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Define o estilo padrão
        className: '',
        duration: 3000,
        style: {
          background: '#fff',
          color: '#333',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
          fontSize: '16px',
          maxWidth: '500px',
          textAlign: 'center',
        },
        // Estilos específicos para cada tipo de toast
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10B981',
            secondary: '#fff',
          },
          style: {
            background: '#ECFDF5',
            border: '1px solid #10B981',
            color: '#065F46',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#EF4444',
            secondary: '#fff',
          },
          style: {
            background: '#FEF2F2',
            border: '1px solid #EF4444',
            color: '#991B1B',
          },
        },
      }}
    />
  );
};

export default GlobalToaster;
