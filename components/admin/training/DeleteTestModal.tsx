import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import axios from 'axios';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DeleteTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  test: {
    id: string;
    name: string;
  };
}

const DeleteTestModal: React.FC<DeleteTestModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  test
}) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setError('');
    setLoading(true);

    try {
      await axios.delete(`/api/admin/training/tests/${test.id}`);
      setLoading(false);
      onDelete();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || 'Ocorreu um erro ao excluir o teste');
    }
  };

  useEffect(() => {
    if (isOpen) {
      // fetchTestData(); // This function is not defined in the provided code
    }
  }, [isOpen]);

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
        onClose={onClose}
      >
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

          <span
            className="inline-block h-screen align-middle"
            aria-hidden="true"
          >
            &#8203;
          </span>
          
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <Dialog.Title
                  as="h3"
                  className="ml-4 text-lg font-medium leading-6 text-gray-900"
                >
                  Excluir Teste
                </Dialog.Title>
              </div>
              
              {error && (
                <div className="mt-2 p-2 bg-red-50 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja excluir o teste <span className="font-medium text-gray-700">&quot;{test.name}&quot;</span>? 
                  Esta ação não pode ser desfeita e todas as questões associadas a este teste também serão excluídas.
                </p>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DeleteTestModal;
