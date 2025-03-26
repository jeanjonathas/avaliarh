import { Fragment, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Link from 'next/link';

interface LoginOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginOptionsModal({ isOpen, onClose }: LoginOptionsModalProps) {
  const cancelButtonRef = useRef(null);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed z-50 inset-0 overflow-y-auto"
        initialFocus={cancelButtonRef}
        onClose={onClose}
      >
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* Centralizar o modal */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;
          </span>
          
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900 text-center mb-6">
                      Escolha como deseja acessar
                    </Dialog.Title>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      {/* Opção Área do Administrador */}
                      <Link
                        href="/admin"
                        className="flex flex-col items-center p-6 border border-gray-200 rounded-lg hover:border-sky-500 hover:shadow-md transition-all duration-300"
                        onClick={onClose}
                      >
                        <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Área do Administrador</h4>
                        <p className="text-sm text-gray-500 text-center">
                          Acesse o painel administrativo para gerenciar processos, candidatos e testes.
                        </p>
                      </Link>

                      {/* Opção Área do Aluno */}
                      <Link
                        href="/treinamento"
                        className="flex flex-col items-center p-6 border border-gray-200 rounded-lg hover:border-sky-500 hover:shadow-md transition-all duration-300"
                        onClick={onClose}
                      >
                        <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Área do Aluno</h4>
                        <p className="text-sm text-gray-500 text-center">
                          Acesse seus cursos, aulas e certificados na plataforma de treinamento.
                        </p>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={onClose}
                  ref={cancelButtonRef}
                >
                  Fechar
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
