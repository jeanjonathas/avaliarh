import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import axios from 'axios';

interface Lesson {
  id: string;
  name: string;
  description: string;
  order: number;
}

interface LessonReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  moduleId: string;
  lessons: Lesson[];
}

const LessonReorderModal: React.FC<LessonReorderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  moduleId,
  lessons
}) => {
  const [orderedLessons, setOrderedLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize ordered lessons when modal opens
  React.useEffect(() => {
    if (isOpen && lessons) {
      // Sort lessons by order and create a copy to avoid modifying the original
      const sorted = [...lessons].sort((a, b) => a.order - b.order);
      setOrderedLessons(sorted);
    }
  }, [isOpen, lessons]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    // If dropped outside the list or at the same position
    if (!destination || destination.index === source.index) {
      return;
    }

    // Reorder the lessons
    const reordered = [...orderedLessons];
    const [removed] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, removed);

    // Update order property for each lesson
    const withUpdatedOrder = reordered.map((lesson, index) => ({
      ...lesson,
      order: index + 1
    }));

    setOrderedLessons(withUpdatedOrder);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      // Prepare data for API - only send id and order
      const lessonsToUpdate = orderedLessons.map(lesson => ({
        id: lesson.id,
        order: lesson.order
      }));

      // Send to API
      await axios.post('/api/admin/training/lessons/reorder', {
        moduleId,
        lessons: lessonsToUpdate
      });

      setLoading(false);
      onSave();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || 'Ocorreu um erro ao reordenar as lições');
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
                Reordenar Lições
              </Dialog.Title>
              
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-4">
                  Arraste e solte as lições para alterar a ordem em que elas aparecem no módulo.
                </p>
                
                {error && (
                  <div className="mb-4 p-2 bg-red-50 text-red-700 rounded">
                    {error}
                  </div>
                )}
                
                {orderedLessons.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    Nenhuma Aula encontrada para reordenar.
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="lessons">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="bg-gray-50 rounded-md"
                        >
                          {orderedLessons.map((lesson, index) => (
                            <Draggable
                              key={lesson.id}
                              draggableId={lesson.id}
                              index={index}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="p-3 mb-2 bg-white border border-gray-200 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200"
                                >
                                  <div className="flex items-center">
                                    <div className="mr-3 text-gray-400">
                                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                      </svg>
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium">{lesson.name}</div>
                                      <div className="text-sm text-gray-500 truncate">{lesson.description}</div>
                                    </div>
                                    <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                      {index + 1}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </div>
              
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
                  onClick={handleSave}
                  disabled={loading || orderedLessons.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default LessonReorderModal;
