import Modal from '../../common/Modal';

interface Test {
  id: string;
  name: string;
  description?: string;
}

export interface TestSelectorTarget {
  type: 'course' | 'module' | 'lesson';
  index?: number;
  lessonIndex?: number;
}

interface TestSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tests: Test[];
  onSelectTest: (testId: string) => void;
  target: TestSelectorTarget;
}

const TestSelectorModal = ({ isOpen, onClose, tests, onSelectTest, target }: TestSelectorModalProps) => {
  const getTitle = () => {
    if (target.type === 'course') {
      return 'Selecionar Teste Final do Curso';
    } else if (target.type === 'module') {
      return 'Selecionar Teste Final do Módulo';
    } else {
      return 'Selecionar Teste da Aula';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
      <div className="mt-2 max-h-96 overflow-y-auto">
        {tests.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum teste disponível. Crie um teste primeiro.</p>
        ) : (
          <div className="space-y-2">
            {tests.map(test => (
              <div 
                key={test.id} 
                className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  onSelectTest(test.id);
                  onClose();
                }}
              >
                <h4 className="text-sm font-medium text-gray-900">{test.name}</h4>
                {test.description && (
                  <p className="text-xs text-gray-500 mt-1">{test.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
};

export default TestSelectorModal;
