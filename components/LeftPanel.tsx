import React, { useState, useRef, useEffect } from 'react';
import { Upload, Music, Wand2, RefreshCw, Key, Info, Layers, X, ChevronDown, Plus, Trash2, Save, FileText, Mic2, ArrowRight } from 'lucide-react';
import Button from './ui/Button.tsx';
import Tooltip from './ui/Tooltip.tsx';
import * as musicService from '../services/musicService.ts';
import { CreateTaskPayload } from '../services/musicService.ts';
import { ReferenceClip, Mv } from '../types.ts';

interface LeftPanelProps {
  onGenerate: (payload: CreateTaskPayload) => void;
  isGenerating: boolean;
  apiKey: string;
  setApiKey: (key: string) => void;
  activeReferenceClip: ReferenceClip | null;
  onClearReference: () => void;
  onUploadSuccess: (id: string, title: string, audioUrl?: string, lyrics?: string) => void;
}

interface SavedStyle {
  title: string;
  prompt: string;
}

type ModeTab = 'create' | 'extend' | 'cover';

const LeftPanel: React.FC<LeftPanelProps> = ({ 
    onGenerate, isGenerating, apiKey, setApiKey, activeReferenceClip, onClearReference, onUploadSuccess
}) => {
  // Tabs
  const [activeTab, setActiveTab] = useState<ModeTab>('create');

  // Create Mode Sub-state
  const [creationMode, setCreationMode] = useState<'simple' | 'custom'>('custom');

  // Inputs
  const [gptDescription, setGptDescription] = useState(''); 
  const [lyrics, setLyrics] = useState(''); 
  const [styleOfMusic, setStyleOfMusic] = useState(''); 
  const [title, setTitle] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  
  // Reference Inputs
  const [targetClipId, setTargetClipId] = useState('');
  const [continueAt, setContinueAt] = useState<string>("00:00"); 
  
  // Model Selection
  const [selectedModel, setSelectedModel] = useState<Mv>(Mv.ChirpCrow);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Saved Styles State
  const [savedStyles, setSavedStyles] = useState<SavedStyle[]>([]);
  const [newStyleTitle, setNewStyleTitle] = useState('');
  const [newStylePrompt, setNewStylePrompt] = useState('');
  const [showSaveStyleInput, setShowSaveStyleInput] = useState(false);

  // Load Saved Styles
  useEffect(() => {
    const saved = localStorage.getItem('suno_saved_styles_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            setSavedStyles(parsed);
        }
      } catch (e) {}
    }
  }, []);

  const updateSavedStyles = (newStyles: SavedStyle[]) => {
    setSavedStyles(newStyles);
    localStorage.setItem('suno_saved_styles_v2', JSON.stringify(newStyles));
  };

  const handleAddStyle = () => {
    if (!newStyleTitle.trim() || !newStylePrompt.trim()) return;
    updateSavedStyles([...savedStyles, { title: newStyleTitle.trim(), prompt: newStylePrompt.trim() }]);
    setNewStyleTitle('');
    setNewStylePrompt('');
    setShowSaveStyleInput(false);
  };

  const handleDeleteStyle = (idx: number) => {
    updateSavedStyles(savedStyles.filter((_, i) => i !== idx));
  };

  const handleApplyStyle = (prompt: string) => {
    if (styleOfMusic.trim() && !styleOfMusic.includes(prompt)) {
      setStyleOfMusic(`${styleOfMusic.trim()}, ${prompt}`);
    } else {
      setStyleOfMusic(prompt);
    }
  };

  // Sync activeReferenceClip to Inputs
  useEffect(() => {
    if (activeReferenceClip) {
        setTargetClipId(activeReferenceClip.id);
        
        // Priority: user manual interaction via waveform (activeReferenceClip.continueAt) -> existing duration -> 0
        const timeToUse = activeReferenceClip.continueAt !== undefined 
            ? activeReferenceClip.continueAt 
            : (activeReferenceClip.duration || 0);

        const min = Math.floor(timeToUse / 60);
        const sec = Math.floor(timeToUse % 60);
        setContinueAt(`${min}:${sec.toString().padStart(2, '0')}`);

        // Default switch to extend if reference is selected, unless already in cover
        if (activeTab === 'create') {
            setActiveTab('extend');
        }
    } else {
        setTargetClipId('');
        setContinueAt("00:00");
    }
  }, [activeReferenceClip, activeTab]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setIsUploading(true);
        const { id, text, title: extractedTitle, audioUrl } = await musicService.uploadAudio(file);
        if (text) setLyrics(text);
        if (extractedTitle) setTitle(extractedTitle);
        
        // Notify parent to add to task list immediately with lyrics
        onUploadSuccess(id, extractedTitle || file.name, audioUrl, text);
        
        setTargetClipId(id);
        setActiveTab('extend');
      } catch (err) {
        alert('上传失败: ' + (err as Error).message);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = () => {
      if (!apiKey) return alert("请输入 API Key");

      const basePayload = {
          mv: selectedModel,
          title: title,
          tags: styleOfMusic,
          instrumental
      };

      if (activeTab === 'create') {
          if (creationMode === 'custom') {
              if (!lyrics && !instrumental) return alert("请输入歌词或开启纯音乐");
              if (!styleOfMusic) return alert("请输入风格");
              onGenerate({ ...basePayload, mode: 'custom', prompt: lyrics });
          } else {
              if (!gptDescription) return alert("请输入歌曲描述");
              onGenerate({ ...basePayload, mode: 'simple', gptDescription });
          }
      } else if (activeTab === 'extend') {
          if (!targetClipId) return alert("请先选择或上传参考音频");
          const parts = continueAt.split(':');
          const seconds = (parseInt(parts[0] || '0') * 60) + (parseInt(parts[1] || '0'));
          
          onGenerate({
              ...basePayload,
              mode: 'extend',
              referenceClipId: targetClipId,
              continueAt: seconds,
              prompt: lyrics,
          });
      } else if (activeTab === 'cover') {
          if (!targetClipId) return alert("请先选择或上传参考音频");
          onGenerate({
              ...basePayload,
              mode: 'cover',
              referenceClipId: targetClipId,
              prompt: lyrics,
          });
      }
  };

  const modelOptions = [
      { label: 'v5 (Chirp-Crow)', value: Mv.ChirpCrow },
      { label: 'v4 (Chirp-v4)', value: Mv.ChirpV4 },
      { label: 'v3.5 (Chirp-v3.5)', value: Mv.ChirpV3_5_Tau },
  ];

  return (
    <div className="w-full md:w-[380px] flex flex-col h-full bg-surface border-r border-white/5 flex-shrink-0 z-20 shadow-2xl relative font-sans">
      {/* Header */}
      <div className="p-5 border-b border-white/5">
        <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
           <Music className="w-5 h-5 text-indigo-500" />
           SUNO <span className="opacity-50 font-normal">Studio</span>
        </h1>
        {/* API Key */}
        <div className="mt-3 relative">
            <Key className="w-3 h-3 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="在此输入 API Key..."
                className="w-full bg-black/20 border border-white/10 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600 custom-scrollbar"
            />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-black/10">
          {[
              { id: 'create', label: '创作', icon: Wand2 },
              { id: 'extend', label: '扩展', icon: ArrowRight },
              { id: 'cover', label: '翻唱', icon: RefreshCw }
          ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ModeTab)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border-b-2 ${activeTab === tab.id ? 'border-indigo-500 text-white bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          
          {/* Create Mode Toggle */}
          {activeTab === 'create' && (
              <div className="flex bg-black/20 p-1 rounded-lg border border-white/5 mb-4">
                  <button onClick={() => setCreationMode('simple')} className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${creationMode === 'simple' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400'}`}>简单模式</button>
                  <button onClick={() => setCreationMode('custom')} className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${creationMode === 'custom' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400'}`}>自定义模式</button>
              </div>
          )}

          {/* Reference Info (Extend/Cover Only) */}
          {(activeTab === 'extend' || activeTab === 'cover') && (
               <div className="space-y-3">
                   {activeReferenceClip ? (
                       <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 relative group">
                           <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                    <div className="text-[10px] text-indigo-300 font-bold uppercase flex items-center gap-1">
                                        <Layers className="w-3 h-3" /> 引用音频
                                    </div>
                                    <div className="text-sm text-white font-medium truncate mt-1 pr-4">{activeReferenceClip.title}</div>
                                </div>
                                <button onClick={onClearReference} className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                           </div>
                           
                           {activeTab === 'extend' && (
                                <div className="mt-3 pt-2 border-t border-indigo-500/20 flex items-center justify-between">
                                     <span className="text-[10px] text-slate-400 uppercase font-bold">扩展开始时间</span>
                                     <div className="text-right">
                                         <input 
                                             value={continueAt}
                                             onChange={e => setContinueAt(e.target.value)}
                                             className="w-16 bg-black/30 text-center text-xs font-mono text-indigo-300 focus:outline-none border-b border-indigo-500/50 focus:border-indigo-500 rounded-t"
                                             placeholder="00:00"
                                         />
                                         <div className="text-[9px] text-indigo-400/70 mt-0.5">点击右侧波形选择</div>
                                     </div>
                                </div>
                           )}
                       </div>
                   ) : (
                       <div className="border border-dashed border-white/10 rounded-lg p-6 text-center space-y-3 bg-white/5 hover:bg-white/10 transition-colors">
                           <div className="w-10 h-10 bg-black/30 rounded-full flex items-center justify-center mx-auto text-slate-500">
                               <Music className="w-5 h-5" />
                           </div>
                           <div>
                               <p className="text-sm font-medium text-slate-300">未选择参考音频</p>
                               <p className="text-xs text-slate-500 mt-1">请从右侧库中选择一首歌曲<br/>或点击下方上传</p>
                           </div>
                           <Button 
                                variant="secondary" 
                                onClick={() => fileInputRef.current?.click()} 
                                isLoading={isUploading}
                                className="w-full text-xs"
                           >
                                <Upload className="w-3 h-3 mr-2" />
                                上传音频
                           </Button>
                           <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileChange} />
                       </div>
                   )}
               </div>
          )}

          {/* Simple Mode Input */}
          {activeTab === 'create' && creationMode === 'simple' && (
             <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase">歌曲描述</label>
                 <textarea 
                    value={gptDescription}
                    onChange={e => setGptDescription(e.target.value)}
                    placeholder="一首关于..."
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:border-indigo-500 outline-none resize-none h-32 custom-scrollbar"
                 />
             </div>
          )}

          {/* Custom / Extend / Cover Inputs */}
          {(activeTab !== 'create' || creationMode === 'custom') && (
            <>
               {/* Lyrics */}
               <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                        <span>歌词</span>
                        {instrumental && <span className="text-indigo-400 text-[10px]">纯音乐模式已开启</span>}
                    </label>
                    <textarea 
                        value={lyrics}
                        onChange={e => setLyrics(e.target.value)}
                        disabled={instrumental}
                        placeholder={instrumental ? "纯音乐模式下不需要歌词" : "[Verse 1]\n..."}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:border-indigo-500 outline-none resize-none h-40 font-mono custom-scrollbar disabled:opacity-50"
                    />
               </div>

               {/* Style */}
               <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">音乐风格</label>
                    <textarea 
                        value={styleOfMusic}
                        onChange={e => setStyleOfMusic(e.target.value)}
                        placeholder="Electronic, fast..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:border-indigo-500 outline-none resize-none h-20 custom-scrollbar"
                    />
                    
                    {/* Saved Styles */}
                    <div className="bg-black/20 border border-white/5 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">预设</span>
                            <button onClick={() => setShowSaveStyleInput(!showSaveStyleInput)} className="text-indigo-400 hover:text-white"><Plus className="w-3 h-3" /></button>
                        </div>
                        {showSaveStyleInput && (
                            <div className="bg-black/40 p-2 rounded mb-2 space-y-2 border border-white/5">
                                <input value={newStyleTitle} onChange={e => setNewStyleTitle(e.target.value)} placeholder="标题" className="w-full bg-transparent border-b border-white/10 text-xs text-white pb-1 outline-none" />
                                <input value={newStylePrompt} onChange={e => setNewStylePrompt(e.target.value)} placeholder="风格内容" className="w-full bg-transparent border-b border-white/10 text-xs text-white pb-1 outline-none" />
                                <Button onClick={handleAddStyle} variant="primary" className="w-full h-6 text-[10px] py-0">保存</Button>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                            {savedStyles.map((s, i) => (
                                <div key={i} onClick={() => handleApplyStyle(s.prompt)} className="flex items-center bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded px-2 py-1 cursor-pointer group">
                                    <span className="text-[10px] text-indigo-200 truncate max-w-[100px]">{typeof s.title === 'string' ? s.title : 'Untitled'}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteStyle(i); }} className="ml-1 text-slate-500 hover:text-red-400 hidden group-hover:block"><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
               </div>

               {/* Title */}
               <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">标题</label>
                    <input 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="歌曲标题..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 outline-none custom-scrollbar"
                    />
               </div>
            </>
          )}

          {/* Model & Settings */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-500 uppercase">模型版本</label>
                     <div className="relative">
                         <select 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value as Mv)}
                            className="w-full appearance-none bg-black/20 border border-white/10 rounded-lg py-2 pl-3 pr-8 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                         >
                             {modelOptions.map(opt => (
                                 <option key={opt.value} value={opt.value}>{opt.label}</option>
                             ))}
                         </select>
                         <ChevronDown className="w-3 h-3 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                     </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">人声设置</label>
                    <div 
                        onClick={() => setInstrumental(!instrumental)}
                        className={`w-full py-1.5 px-3 rounded-lg border border-white/5 cursor-pointer flex items-center justify-between transition-colors ${instrumental ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-black/20'}`}
                    >
                        <span className="text-xs text-slate-300">纯音乐</span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${instrumental ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform duration-200 ${instrumental ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </div>
          </div>
      </div>

      <div className="p-5 border-t border-white/5 bg-surface z-10">
          <Button 
            onClick={handleSubmit}
            isLoading={isGenerating}
            disabled={!apiKey}
            className="w-full py-3.5 text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 border-none shadow-lg shadow-indigo-500/20"
          >
              <Wand2 className="w-4 h-4 mr-2" /> 
              {activeTab === 'create' ? '立即创作' : (activeTab === 'extend' ? '生成扩展 (EXTEND)' : '生成翻唱 (COVER)')}
          </Button>
      </div>
    </div>
  );
};

export default LeftPanel;