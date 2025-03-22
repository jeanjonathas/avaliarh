import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from 'axios';

interface Module {
  id: string;
  name: string;
  order: number;
}

interface ModuleReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  modules: Module[];
  onSuccess: () => void;
}

const ModuleReorderModal: React.FC<ModuleReorderModalProps> = ({
  isOpen,
  onClose,
  courseId,
  modules,
  onSuccess
}) => {
  const [orderedModules, setOrderedModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar os módulos ordenados quando o modal é aberto
  useEffect(() => {
    if (isOpen && modules.length > 0) {
      // Ordenar os módulos pela ordem atual
      const sorted = [...modules].sort((a, b) => a.order - b.order);
      setOrderedModules(sorted);
    }
  }, [isOpen, modules]);

  // Função para lidar com o arrastar e soltar
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(orderedModules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Atualizar a ordem dos itens
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    
    setOrderedModules(updatedItems);
  };

  // Função para salvar a nova ordem
  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Criar um array com os IDs e as novas ordens
      const updates = orderedModules.map(module => ({
        id: module.id,
        order: module.order
      }));

      // Enviar para a API
      await axios.post(`/api/admin/training/modules/reorder`, {
        courseId,
        modules: updates
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao reordenar módulos:', err);
      setError(err.response?.data?.message || 'Ocorreu um erro ao reordenar os módulos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Reordenar Módulos
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-500 mb-4">
                  Arraste e solte os módulos para reordená-los. A ordem será salva quando você clicar em Salvar.
                </p>

                {orderedModules.length === 0 ? (
                  <div className="py-4 text-center text-gray-500">
                    Não há módulos para reordenar.
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="modules">
                      {(provided) => (
                        <ul
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2 max-h-80 overflow-y-auto"
                        >
                          {orderedModules.map((module, index) => (
                            <Draggable key={module.id} draggableId={module.id} index={index}>
                              {(provided) => (
                                <li
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="bg-gray-50 p-3 rounded-md border border-gray-200 flex items-center"
                                >
                                  <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3">
                                    {module.order}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {module.name}
                                    </p>
                                  </div>
                                  <div className="flex-shrink-0 ml-2">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                    </svg>
                                  </div>
                                </li>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </ul>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading || orderedModules.length === 0}
                    className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ModuleReorderModal;
