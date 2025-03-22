import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import axios from 'axios';

interface DeleteLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  lesson: {
    id: string;
    name: string;
  };
}

const DeleteLessonModal: React.FC<DeleteLessonModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  lesson
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      await axios.delete(`/api/admin/training/lessons/${lesson.id}`);
      setLoading(false);
      onDelete();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || 'Ocorreu um erro ao excluir a lição');
    }
  };

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
              <Dialog.Title
                as="h3"
                className="text-lg font-medium leading-6 text-gray-900"
              >
                Excluir Lição
              </Dialog.Title>
              
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja excluir a lição <span className="font-semibold">{lesson.name}</span>? 
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              
              {error && (
                <div className="mt-2 p-2 bg-red-50 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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

export default DeleteLessonModal;
