import React, { useState, useMemo } from 'react';
import { 
    Folder, FolderOpen, Music, Mic2, Clock, Calendar, 
    Search, Download, MoreHorizontal, FileText, ArrowLeftRight, DownloadCloud, Trash2
} from 'lucide-react';
import { GenerationTask, TaskStatus, ReferenceClip } from '../types.ts';
import * as musicService from '../services/musicService.ts';
import Tooltip from './ui/Tooltip.tsx';
import Waveform from './ui/Waveform.tsx';

interface RightPanelProps {
  tasks: GenerationTask[];
  onSelectReference: (clip: ReferenceClip) => void;
  activeReferenceClip: ReferenceClip | null;
  onUpdateReferenceTime: (time: number) => void;
}

// Helper to format duration for display
const parseDuration = (durStr?: string) => {
    if (!durStr) return 0;
    const [m, s] = durStr.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
};

interface FolderItemProps {
    icon: React.ReactNode;
    label: string;
    count?: number;
    active: boolean;
    onClick: () => void;
}

// --- Sub-Component: Folder Item ---
const FolderItem: React.FC<FolderItemProps> = ({ icon, label, count, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full px-4 py-2 flex items-center justify-between group transition-colors ${active ? 'bg-indigo-500/10 border-r-2 border-indigo-500' : 'hover:bg-white/5 border-r-2 border-transparent'}`}
    >
        <div className="flex items-center gap-3">
            <span className={active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}>{icon}</span>
            <span className={`text-sm ${active ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-200'}`}>{label}</span>
        </div>
        {count !== undefined && (
            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-slate-500">{count}</span>
        )}
    </button>
);

// --- Sub-Component: Track Row ---
const TrackRow: React.FC<{ 
    task: GenerationTask; 
    isPlaying: boolean; 
    onPlay: () => void;
    onPause: () => void;
    onSelectReference: (c: ReferenceClip) => void;
    isActiveReference: boolean;
    onSeek: (time: number) => void;
}> = ({ task, isPlaying, onPlay, onPause, onSelectReference, isActiveReference, onSeek }) => {
    const isSuccess = task.status === TaskStatus.SUCCESS;
    const hasAudio = isSuccess && !!task.resultAudioUrl;
    const [showLyrics, setShowLyrics] = useState(false);
    const [isLoadingWav, setIsLoadingWav] = useState(false);

    const handleGetWav = async () => {
        setIsLoadingWav(true);
        const url = await musicService.getWavUrl(task.clipId || task.id);
        setIsLoadingWav(false);
        if (url) window.open(url, '_blank');
        else alert("WAV 不可用");
    };

    const handleReference = () => {
        onSelectReference({
            id: task.clipId || task.id,
            title: task.title || "Unknown",
            duration: parseDuration(task.duration)
        });
    };

    return (
        <div className={`group relative bg-surface border rounded-lg p-2 flex flex-col gap-2 transition-all hover:bg-slate-800/50 ${isActiveReference ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-indigo-500/5' : 'border-white/5 hover:border-indigo-500/20'}`}>
            {/* Top Row: Info & Controls */}
            <div className="flex items-center gap-3">
                {/* Artwork */}
                <div className="w-10 h-10 rounded bg-black/50 flex-shrink-0 overflow-hidden relative">
                    <img src={task.coverImageUrl || "https://picsum.photos/100"} className="w-full h-full object-cover opacity-80" alt="" />
                    {task.status === TaskStatus.PROCESSING && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>

                {/* Metadata */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-200 truncate select-text">{task.title || "Untitled"}</h4>
                        <span className={`text-[10px] px-1.5 rounded-sm uppercase ${task.type === 'UPLOAD' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {task.type === 'UPLOAD' ? 'Audio' : 'Gen'}
                        </span>
                        {isActiveReference && (
                            <span className="text-[9px] bg-indigo-500 text-white px-1.5 rounded-full font-bold">ACTIVE REF</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                        <span className="truncate max-w-[200px]">{task.tags || "No tags"}</span>
                        <span>•</span>
                        <span className="font-mono">{task.duration || "--:--"}</span>
                        {task.status === TaskStatus.FAILED && <span className="text-red-400">• 失败: {task.failReason}</span>}
                    </div>
                </div>

                {/* Actions (Hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {hasAudio && (
                        <>
                            <Tooltip content="用作参考 (扩展/翻唱)">
                                <button onClick={handleReference} className={`p-1.5 rounded ${isActiveReference ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-indigo-400 hover:bg-white/10'}`}>
                                    <ArrowLeftRight className="w-3.5 h-3.5" />
                                </button>
                            </Tooltip>
                            <Tooltip content="下载 MP3">
                                <a href={task.resultAudioUrl} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white">
                                    <Download className="w-3.5 h-3.5" />
                                </a>
                            </Tooltip>
                            <Tooltip content="下载 WAV">
                                <button onClick={handleGetWav} disabled={isLoadingWav} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white">
                                    {isLoadingWav ? <div className="w-3.5 h-3.5 border border-current border-t-transparent animate-spin rounded-full"/> : <DownloadCloud className="w-3.5 h-3.5" />}
                                </button>
                            </Tooltip>
                            <Tooltip content="查看歌词">
                                <button onClick={() => setShowLyrics(!showLyrics)} className={`p-1.5 hover:bg-white/10 rounded ${showLyrics ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}>
                                    <FileText className="w-3.5 h-3.5" />
                                </button>
                            </Tooltip>
                        </>
                    )}
                </div>
            </div>

            {/* Middle Row: Waveform */}
            {hasAudio && (
                <div className="h-10 w-full bg-black/20 rounded border border-white/5 relative overflow-hidden">
                    <Waveform 
                        url={task.resultAudioUrl!} 
                        height={40}
                        waveColor="#3f3f46"
                        progressColor="#6366f1"
                        isPlayingProp={isPlaying}
                        onPlay={onPlay}
                        onPause={onPause}
                        onSeek={(time) => {
                            // Only trigger sync if this is the active reference
                            if (isActiveReference) {
                                onSeek(time);
                            }
                        }}
                    />
                </div>
            )}

            {/* Lyrics Drawer */}
            {showLyrics && task.lyrics && (
                <div className="mt-2 p-3 bg-black/40 rounded text-xs text-slate-300 font-mono whitespace-pre-wrap border border-white/5 max-h-40 overflow-y-auto custom-scrollbar">
                    {task.lyrics}
                </div>
            )}
        </div>
    );
};

const RightPanel: React.FC<RightPanelProps> = ({ 
    tasks, onSelectReference, activeReferenceClip, onUpdateReferenceTime 
}) => {
  // --- File Browser State ---
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- Playback State (Single Source of Truth) ---
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // --- Data Filtering ---
  const filteredTasks = useMemo(() => {
      let filtered = tasks;

      // 1. Folder Filter
      if (selectedFolder === 'uploads') {
          filtered = tasks.filter(t => t.type === 'UPLOAD');
      } else if (selectedFolder === 'generated') {
          filtered = tasks.filter(t => t.type !== 'UPLOAD');
      } else if (selectedFolder === 'today') {
          const startOfDay = new Date();
          startOfDay.setHours(0,0,0,0);
          filtered = tasks.filter(t => t.createdAt >= startOfDay.getTime());
      }

      // 2. Search Filter
      if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(t => 
              (t.title || '').toLowerCase().includes(q) || 
              (t.prompt || '').toLowerCase().includes(q) ||
              (t.tags || '').toLowerCase().includes(q)
          );
      }

      return filtered;
  }, [tasks, selectedFolder, searchQuery]);

  // Counts
  const counts = useMemo(() => ({
      all: tasks.length,
      uploads: tasks.filter(t => t.type === 'UPLOAD').length,
      generated: tasks.filter(t => t.type !== 'UPLOAD').length
  }), [tasks]);

  return (
    <div className="flex-1 h-full bg-[#09090b] flex overflow-hidden font-sans">
      
      {/* --- LEFT SIDEBAR: FILE BROWSER --- */}
      <div className="w-64 bg-surface border-r border-white/5 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-white/5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">资源管理器</h2>
            <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                    type="text" 
                    placeholder="搜索文件..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-md py-1.5 pl-9 pr-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50"
                />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
            <FolderItem 
                icon={<Folder className="w-4 h-4" />} 
                label="全部文件" 
                count={counts.all} 
                active={selectedFolder === 'all'} 
                onClick={() => setSelectedFolder('all')} 
            />
            
            <div className="mt-4 mb-2 px-4 text-[10px] font-bold text-slate-600 uppercase">类型</div>
            <FolderItem 
                icon={<Mic2 className="w-4 h-4" />} 
                label="上传音频" 
                count={counts.uploads} 
                active={selectedFolder === 'uploads'} 
                onClick={() => setSelectedFolder('uploads')} 
            />
            <FolderItem 
                icon={<Music className="w-4 h-4" />} 
                label="AI 生成" 
                count={counts.generated} 
                active={selectedFolder === 'generated'} 
                onClick={() => setSelectedFolder('generated')} 
            />

            <div className="mt-4 mb-2 px-4 text-[10px] font-bold text-slate-600 uppercase">时间</div>
            <FolderItem 
                icon={<Calendar className="w-4 h-4" />} 
                label="今日" 
                active={selectedFolder === 'today'} 
                onClick={() => setSelectedFolder('today')} 
            />
        </div>
      </div>

      {/* --- RIGHT MAIN: TRACK LIST / ARRANGEMENT VIEW --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0c0e]">
         {/* Top Bar */}
         <div className="h-12 border-b border-white/5 flex items-center px-4 justify-between bg-surface/50">
             <div className="text-xs text-slate-400 flex items-center gap-2">
                 <FolderOpen className="w-4 h-4 text-indigo-500" />
                 <span>/ Library / <span className="text-slate-200 capitalize">{selectedFolder}</span></span>
             </div>
             <div className="text-[10px] text-slate-500 font-mono">
                 {filteredTasks.length} ITEMS
             </div>
         </div>

         {/* Tracks Area */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
             {filteredTasks.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-600">
                     <Music className="w-12 h-12 mb-3 opacity-20" />
                     <p className="text-sm">该文件夹为空</p>
                 </div>
             ) : (
                 filteredTasks.map(task => (
                     <TrackRow 
                        key={task.id} 
                        task={task} 
                        isPlaying={activePlayingId === task.id}
                        onPlay={() => setActivePlayingId(task.id)}
                        onPause={() => setActivePlayingId(null)}
                        onSelectReference={onSelectReference}
                        isActiveReference={activeReferenceClip?.id === (task.clipId || task.id)}
                        onSeek={(time) => onUpdateReferenceTime(time)}
                     />
                 ))
             )}
         </div>
      </div>
    </div>
  );
};

export default RightPanel;