import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import axios from 'axios';
import { DocumentTextIcon, VideoCameraIcon, MusicalNoteIcon, DocumentIcon } from '@heroicons/react/24/outline';

interface LessonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  moduleId: string;
  lesson?: {
    id: string;
    name: string;
    description: string;
    type: 'VIDEO' | 'AUDIO' | 'SLIDES' | 'TEXT';
    content: string;
    duration: number;
    order: number;
  };
}

const LessonFormModal: React.FC<LessonFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  moduleId,
  lesson
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'VIDEO' | 'AUDIO' | 'SLIDES' | 'TEXT'>('TEXT');
  const [content, setContent] = useState('');
  const [duration, setDuration] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lesson) {
      setName(lesson.name);
      setDescription(lesson.description);
      setType(lesson.type);
      setContent(lesson.content);
      setDuration(lesson.duration);
    } else {
      // Reset form for new lesson
      setName('');
      setDescription('');
      setType('TEXT');
      setContent('');
      setDuration(0);
    }
    setFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setError('');
  }, [lesson, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      
      // Auto-set duration for video and audio files if browser supports it
      if (type === 'VIDEO' || type === 'AUDIO') {
        const url = URL.createObjectURL(e.target.files[0]);
        const media = type === 'VIDEO' ? new Audio(url) : new Audio(url);
        media.onloadedmetadata = () => {
          setDuration(Math.round(media.duration));
          URL.revokeObjectURL(url);
        };
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    try {
      const response = await axios.post('/api/admin/training/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        }
      });
      
      // Set the content to the URL or path returned from the server
      setContent(response.data.url);
      setIsUploading(false);
    } catch (err: any) {
      setIsUploading(false);
      setError(err.response?.data?.error || 'Erro ao fazer upload do arquivo');
    }
  };

  const handleEmbedContent = () => {
    if (!content.trim()) {
      setError('Por favor, insira um URL válido para incorporar');
      return;
    }
    
    // Validate URL based on content type
    let isValid = false;
    
    if (type === 'VIDEO') {
      // Check for YouTube, Vimeo, or other video platforms
      isValid = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/.test(content);
    } else if (type === 'AUDIO') {
      // Check for SoundCloud, Spotify, or direct audio links
      isValid = /^(https?:\/\/)?(www\.)?(soundcloud\.com|spotify\.com|.+\.(mp3|wav|ogg))/.test(content);
    } else if (type === 'SLIDES') {
      // Check for Google Slides, SlideShare, or PDF links
      isValid = /^(https?:\/\/)?(www\.)?(docs\.google\.com|slideshare\.net|.+\.pdf)/.test(content);
    }
    
    if (!isValid && type !== 'TEXT') {
      setError(`URL inválido para o tipo de conteúdo ${type}`);
    } else {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name.trim()) {
      setError('O nome da Aula é obrigatório');
      setLoading(false);
      return;
    }

    // If there's a file waiting to be uploaded, upload it first
    if (file && !isUploading && !content) {
      await handleUpload();
    }

    try {
      if (lesson) {
        // Update existing lesson
        await axios.put(`/api/admin/training/lessons/${lesson.id}`, {
          name,
          description,
          type,
          content,
          duration
        });
      } else {
        // Create new lesson
        await axios.post('/api/admin/training/lessons', {
          name,
          description,
          type,
          content,
          duration,
          moduleId
        });
      }
      
      setLoading(false);
      onSave();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || 'Ocorreu um erro ao salvar a Aula');
    }
  };

  const renderContentInput = () => {
    switch (type) {
      case 'VIDEO':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="videoEmbed"
                name="videoSource"
                checked={!file}
                onChange={() => setFile(null)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="videoEmbed" className="text-sm text-gray-700">Incorporar vídeo (YouTube, Vimeo)</label>
            </div>
            
            {!file && (
              <div className="pl-6">
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={handleEmbedContent}
                  className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Validar URL
                </button>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="videoUpload"
                name="videoSource"
                checked={!!file}
                onChange={() => {}}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="videoUpload" className="text-sm text-gray-700">Fazer upload de vídeo</label>
            </div>
            
            {file ? (
              <div className="pl-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <VideoCameraIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                </div>
                
                {isUploading ? (
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                    <span className="text-xs text-gray-500 mt-1">{uploadProgress}% concluído</span>
                  </div>
                ) : content ? (
                  <div className="text-sm text-green-600">Upload concluído</div>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Fazer upload
                  </button>
                )}
              </div>
            ) : (
              <div className="pl-6">
                <label className="block">
                  <span className="sr-only">Escolher arquivo</span>
                  <input 
                    type="file" 
                    accept="video/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-primary-50 file:text-primary-700
                      hover:file:bg-primary-100"
                  />
                </label>
              </div>
            )}
          </div>
        );
        
      case 'AUDIO':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="audioEmbed"
                name="audioSource"
                checked={!file}
                onChange={() => setFile(null)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="audioEmbed" className="text-sm text-gray-700">Incorporar áudio (SoundCloud, Spotify)</label>
            </div>
            
            {!file && (
              <div className="pl-6">
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="https://soundcloud.com/..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={handleEmbedContent}
                  className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Validar URL
                </button>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="audioUpload"
                name="audioSource"
                checked={!!file}
                onChange={() => {}}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="audioUpload" className="text-sm text-gray-700">Fazer upload de áudio</label>
            </div>
            
            {file ? (
              <div className="pl-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <MusicalNoteIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                </div>
                
                {isUploading ? (
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                    <span className="text-xs text-gray-500 mt-1">{uploadProgress}% concluído</span>
                  </div>
                ) : content ? (
                  <div className="text-sm text-green-600">Upload concluído</div>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Fazer upload
                  </button>
                )}
              </div>
            ) : (
              <div className="pl-6">
                <label className="block">
                  <span className="sr-only">Escolher arquivo</span>
                  <input 
                    type="file" 
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-primary-50 file:text-primary-700
                      hover:file:bg-primary-100"
                  />
                </label>
              </div>
            )}
          </div>
        );
        
      case 'SLIDES':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="slidesEmbed"
                name="slidesSource"
                checked={!file}
                onChange={() => setFile(null)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="slidesEmbed" className="text-sm text-gray-700">Incorporar slides (Google Slides, SlideShare)</label>
            </div>
            
            {!file && (
              <div className="pl-6">
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="https://docs.google.com/presentation/..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={handleEmbedContent}
                  className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Validar URL
                </button>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="slidesUpload"
                name="slidesSource"
                checked={!!file}
                onChange={() => {}}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="slidesUpload" className="text-sm text-gray-700">Fazer upload de slides (PDF)</label>
            </div>
            
            {file ? (
              <div className="pl-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <DocumentIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                </div>
                
                {isUploading ? (
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                    <span className="text-xs text-gray-500 mt-1">{uploadProgress}% concluído</span>
                  </div>
                ) : content ? (
                  <div className="text-sm text-green-600">Upload concluído</div>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Fazer upload
                  </button>
                )}
              </div>
            ) : (
              <div className="pl-6">
                <label className="block">
                  <span className="sr-only">Escolher arquivo</span>
                  <input 
                    type="file" 
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-primary-50 file:text-primary-700
                      hover:file:bg-primary-100"
                  />
                </label>
              </div>
            )}
          </div>
        );
        
      case 'TEXT':
      default:
        return (
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Digite ou cole o conteúdo da Aula aqui..."
          />
        );
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
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <Dialog.Title
                as="h3"
                className="text-lg font-medium leading-6 text-gray-900"
              >
                {lesson ? 'Editar Aula' : 'Nova Aula'}
              </Dialog.Title>
              
              {error && (
                <div className="mt-2 p-2 bg-red-50 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="mt-4">
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nome da Aula *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Tipo de Conteúdo
                  </label>
                  <div className="mt-1 grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('TEXT')}
                      className={`flex flex-col items-center justify-center p-3 border rounded-md ${
                        type === 'TEXT' 
                          ? 'bg-primary-50 border-primary-500 text-primary-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <DocumentTextIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Texto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('VIDEO')}
                      className={`flex flex-col items-center justify-center p-3 border rounded-md ${
                        type === 'VIDEO' 
                          ? 'bg-primary-50 border-primary-500 text-primary-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <VideoCameraIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Vídeo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('AUDIO')}
                      className={`flex flex-col items-center justify-center p-3 border rounded-md ${
                        type === 'AUDIO' 
                          ? 'bg-primary-50 border-primary-500 text-primary-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <MusicalNoteIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Áudio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('SLIDES')}
                      className={`flex flex-col items-center justify-center p-3 border rounded-md ${
                        type === 'SLIDES' 
                          ? 'bg-primary-50 border-primary-500 text-primary-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <DocumentIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Slides</span>
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                    Conteúdo
                  </label>
                  {renderContentInput()}
                </div>
                
                {(type === 'VIDEO' || type === 'AUDIO') && (
                  <div className="mb-4">
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                      Duração (segundos)
                    </label>
                    <input
                      type="number"
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                      min="0"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || isUploading}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading || isUploading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default LessonFormModal;
