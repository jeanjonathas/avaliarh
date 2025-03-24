import React, { useState, useRef } from 'react';
import { 
  FiMaximize, 
  FiMinimize, 
  FiPlayCircle, 
  FiPauseCircle, 
  FiVolume2, 
  FiVolumeX,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

interface LessonContentProps {
  type: 'VIDEO' | 'AUDIO' | 'SLIDES' | 'TEXT';
  content: string;
  onPlay?: () => void;
  onPause?: () => void;
}

const LessonContent: React.FC<LessonContentProps> = ({
  type,
  content,
  onPlay,
  onPause
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Função para alternar fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Erro ao entrar em tela cheia: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error(`Erro ao sair da tela cheia: ${err.message}`);
      });
    }
  };

  // Função para controlar reprodução de vídeo/áudio
  const togglePlayPause = () => {
    if (type === 'VIDEO' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        if (onPause) onPause();
      } else {
        videoRef.current.play();
        setIsPlaying(true);
        if (onPlay) onPlay();
      }
    } else if (type === 'AUDIO' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        if (onPause) onPause();
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        if (onPlay) onPlay();
      }
    }
  };

  // Função para controlar mudo
  const toggleMute = () => {
    if (type === 'VIDEO' && videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    } else if (type === 'AUDIO' && audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Função para navegar entre slides
  const navigateSlides = (direction: 'next' | 'prev') => {
    if (type !== 'SLIDES') return;
    
    try {
      const slides = JSON.parse(content);
      if (!Array.isArray(slides)) return;
      
      if (direction === 'next' && currentSlide < slides.length - 1) {
        setCurrentSlide(currentSlide + 1);
      } else if (direction === 'prev' && currentSlide > 0) {
        setCurrentSlide(currentSlide - 1);
      }
    } catch (error) {
      console.error('Erro ao processar slides:', error);
    }
  };

  // Renderizar conteúdo baseado no tipo
  const renderContent = () => {
    switch (type) {
      case 'VIDEO':
        return (
          <div className="relative w-full" ref={containerRef}>
            <video
              ref={videoRef}
              src={content}
              className="w-full rounded-lg"
              controls={false}
              onPlay={() => {
                setIsPlaying(true);
                if (onPlay) onPlay();
              }}
              onPause={() => {
                setIsPlaying(false);
                if (onPause) onPause();
              }}
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
              <button
                onClick={togglePlayPause}
                className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? <FiPauseCircle size={24} /> : <FiPlayCircle size={24} />}
              </button>
              <button
                onClick={toggleMute}
                className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
                aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
              >
                {isMuted ? <FiVolumeX size={24} /> : <FiVolume2 size={24} />}
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
                aria-label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
              >
                {isFullscreen ? <FiMinimize size={24} /> : <FiMaximize size={24} />}
              </button>
            </div>
          </div>
        );
      
      case 'AUDIO':
        return (
          <div className="w-full bg-secondary-100 rounded-lg p-4">
            <audio
              ref={audioRef}
              src={content}
              className="w-full"
              controls={false}
              onPlay={() => {
                setIsPlaying(true);
                if (onPlay) onPlay();
              }}
              onPause={() => {
                setIsPlaying(false);
                if (onPause) onPause();
              }}
            />
            <div className="flex justify-center space-x-4 mt-2">
              <button
                onClick={togglePlayPause}
                className="p-2 bg-primary-500 rounded-full text-white hover:bg-primary-600 transition-all"
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? <FiPauseCircle size={24} /> : <FiPlayCircle size={24} />}
              </button>
              <button
                onClick={toggleMute}
                className="p-2 bg-primary-500 rounded-full text-white hover:bg-primary-600 transition-all"
                aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
              >
                {isMuted ? <FiVolumeX size={24} /> : <FiVolume2 size={24} />}
              </button>
            </div>
          </div>
        );
      
      case 'SLIDES':
        try {
          const slides = JSON.parse(content);
          if (!Array.isArray(slides) || slides.length === 0) {
            return <div className="text-red-500">Formato de slides inválido</div>;
          }
          
          return (
            <div className="relative w-full bg-white rounded-lg shadow-md" ref={containerRef}>
              <div className="p-8">
                <div 
                  className="min-h-[300px] flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: slides[currentSlide] }}
                />
              </div>
              
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                <button
                  onClick={() => navigateSlides('prev')}
                  disabled={currentSlide === 0}
                  className={`p-2 rounded-full ${
                    currentSlide === 0 
                      ? 'bg-secondary-200 text-secondary-400 cursor-not-allowed' 
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  } transition-all`}
                  aria-label="Slide anterior"
                >
                  <FiChevronLeft size={24} />
                </button>
                <div className="p-2 bg-secondary-100 rounded-lg">
                  <span className="text-secondary-800 font-medium">
                    {currentSlide + 1} / {slides.length}
                  </span>
                </div>
                <button
                  onClick={() => navigateSlides('next')}
                  disabled={currentSlide === slides.length - 1}
                  className={`p-2 rounded-full ${
                    currentSlide === slides.length - 1 
                      ? 'bg-secondary-200 text-secondary-400 cursor-not-allowed' 
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  } transition-all`}
                  aria-label="Próximo slide"
                >
                  <FiChevronRight size={24} />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-secondary-800 rounded-full text-white hover:bg-secondary-900 transition-all"
                  aria-label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
                >
                  {isFullscreen ? <FiMinimize size={24} /> : <FiMaximize size={24} />}
                </button>
              </div>
            </div>
          );
        } catch (error) {
          console.error('Erro ao processar slides:', error);
          return <div className="text-red-500">Erro ao carregar slides</div>;
        }
      
      case 'TEXT':
      default:
        return (
          <div 
            className="prose prose-lg max-w-none bg-white rounded-lg p-6 shadow-sm"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
    }
  };

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  );
};

export default LessonContent;
