import React, { useState, useEffect } from 'react';
import FullScreenModal from '../../common/FullScreenModal';
import dynamic from 'next/dynamic';

// Importação dinâmica do editor para evitar problemas de SSR
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

// Importação dos estilos
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  onSave: (content: string) => void;
  title?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  isOpen,
  onClose,
  initialContent,
  onSave,
  title = 'Editor de Conteúdo'
}) => {
  const [content, setContent] = useState('');
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setUnsavedChanges(false);
    }
  }, [isOpen, initialContent]);

  const handleContentChange = (value: string) => {
    setContent(value);
    setUnsavedChanges(true);
  };

  const handleSave = () => {
    onSave(content);
    setUnsavedChanges(false);
    onClose();
  };

  const handleClose = () => {
    if (unsavedChanges) {
      if (confirm('Existem alterações não salvas. Deseja sair sem salvar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Configurações do editor (simplificadas para evitar erros)
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  return (
    <FullScreenModal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="flex flex-col h-full">
        <div className="flex-1 p-6">
          {isOpen && typeof window !== 'undefined' && (
            <ReactQuill
              theme="snow"
              value={content}
              onChange={handleContentChange}
              modules={modules}
              formats={formats}
              className="h-[calc(100vh-180px)]"
              placeholder="Digite o conteúdo da aula aqui..."
              style={{ fontSize: '16px', lineHeight: '1.6' }}
            />
          )}
        </div>
        
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {unsavedChanges ? 'Alterações não salvas' : 'Todas alterações salvas'}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
};

export default RichTextEditor;
