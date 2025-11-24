import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause } from 'lucide-react';

interface WaveformProps {
  url: string;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onReady?: () => void;
  onSeek?: (time: number) => void;
  isPlayingProp?: boolean; // Controlled state
}

const Waveform: React.FC<WaveformProps> = ({ 
  url, 
  height = 48, 
  waveColor = '#4b5563', 
  progressColor = '#6366f1',
  onPlay,
  onPause,
  onReady,
  onSeek,
  isPlayingProp = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Local playing state to avoid dependency cycles with parent
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    // cleanup previous instance if url changed quickly
    if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: waveColor,
      progressColor: progressColor,
      cursorColor: '#a5b4fc',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: height,
      normalize: true,
      minPxPerSec: 50,
      url: url,
      dragToSeek: true,
    });

    ws.on('ready', () => {
      setIsReady(true);
      if (onReady) onReady();
    });

    ws.on('play', () => {
      setLocalIsPlaying(true);
      if (onPlay) onPlay();
    });

    ws.on('pause', () => {
      setLocalIsPlaying(false);
      if (onPause) onPause();
    });

    ws.on('finish', () => {
      setLocalIsPlaying(false);
    });

    ws.on('interaction', (newTime) => {
        if (onSeek) onSeek(newTime);
    });

    wavesurferRef.current = ws;

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [url]);

  // Sync prop -> instance
  // We use a timeout to debounce slightly and prevent race conditions if parent re-renders fast
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady) return;

    const currentStatus = ws.isPlaying();
    if (isPlayingProp && !currentStatus) {
        ws.play();
    } else if (!isPlayingProp && currentStatus) {
        ws.pause();
    }
  }, [isPlayingProp, isReady]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  return (
    <div className="flex items-center gap-3 w-full group">
      <button 
        onClick={togglePlay}
        disabled={!isReady}
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${
          isReady 
            ? 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20' 
            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
        }`}
      >
        {localIsPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 relative h-full cursor-text">
        {/* Loading Overlay */}
        {!isReady && (
            <div className="absolute inset-0 flex items-center w-full z-10">
                <div className="h-1 w-full bg-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-slate-600 animate-pulse w-1/3"></div>
                </div>
            </div>
        )}
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
};

export default React.memo(Waveform);