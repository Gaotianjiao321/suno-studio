import React, { useState, useEffect, useRef } from 'react';
import LeftPanel from './components/LeftPanel.tsx';
import RightPanel from './components/RightPanel.tsx';
import { GenerationTask, TaskStatus, ReferenceClip } from './types.ts';
import * as musicService from './services/musicService.ts';
import { CreateTaskPayload } from './services/musicService.ts';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKeyState] = useState('');
  
  // State to handle "Extend" or "Cover" from the library
  const [activeReferenceClip, setActiveReferenceClip] = useState<ReferenceClip | null>(null);

  const tasksRef = useRef<GenerationTask[]>([]); 

  useEffect(() => {
    const storedKey = localStorage.getItem('suno_api_key');
    if (storedKey) {
        setApiKeyState(storedKey);
        musicService.setApiKey(storedKey);
    }
  }, []);

  const handleSetApiKey = (key: string) => {
      setApiKeyState(key);
      localStorage.setItem('suno_api_key', key);
      musicService.setApiKey(key);
  };

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      const pendingTasks = tasksRef.current.filter(
        t => t.status === TaskStatus.PENDING || t.status === TaskStatus.PROCESSING
      );
      if (pendingTasks.length === 0) return;

      pendingTasks.forEach(async (task) => {
          try {
              const sunoData = await musicService.getTaskDetails(task.id);
              if (sunoData && sunoData.task_id === task.id) {
                  setTasks(prevTasks => prevTasks.map(t => 
                      t.id === task.id ? musicService.mapSunoResponseToTask(sunoData, t) : t
                  ));
              }
          } catch (e) {
              console.warn(`Polling failed for task ${task.id}`, e);
          }
      });
    }, 4000); 
    return () => clearInterval(intervalId);
  }, []);

  const handleGenerate = async (payload: CreateTaskPayload) => {
    setIsGenerating(true);
    try {
      const taskId = await musicService.createGenerationTask(payload);
      
      const newTask: GenerationTask = {
        id: taskId,
        createdAt: Date.now(),
        status: TaskStatus.PENDING,
        prompt: payload.prompt || payload.gptDescription || "",
        type: payload.mode === 'extend' || payload.mode === 'cover' ? 'UPLOAD' : 'MUSIC', 
        title: payload.title || (payload.mode === 'simple' ? "新歌曲" : "自定义歌曲"),
        isExtend: payload.mode === 'extend',
        isCover: payload.mode === 'cover',
        referenceClipId: payload.referenceClipId
      };

      setTasks(prev => [newTask, ...prev]);
      
    } catch (error) {
      console.error("Generation request failed", error);
      alert("创建任务失败: " + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Add the uploaded file to the task list immediately
  const handleUploadSuccess = (id: string, title: string, audioUrl?: string, lyrics?: string) => {
      const newTask: GenerationTask = {
          id: id,
          createdAt: Date.now(),
          status: TaskStatus.SUCCESS, // Uploads are considered ready
          type: 'UPLOAD',
          prompt: '', // Uploads don't have a generation prompt usually, but we have lyrics
          lyrics: lyrics || '',
          title: title,
          resultAudioUrl: audioUrl || "", 
      };
      setTasks(prev => [newTask, ...prev]);
      
      // Auto-select as reference
      setActiveReferenceClip({ id, title, duration: 0, url: audioUrl });
  };

  const handleUpdateReferenceTime = (time: number) => {
      if (activeReferenceClip) {
          setActiveReferenceClip({ ...activeReferenceClip, continueAt: time });
      }
  };

  return (
    <div className="flex h-screen w-full bg-background text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden">
      <LeftPanel 
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        apiKey={apiKey}
        setApiKey={handleSetApiKey}
        activeReferenceClip={activeReferenceClip}
        onClearReference={() => setActiveReferenceClip(null)}
        onUploadSuccess={handleUploadSuccess}
      />
      <RightPanel 
        tasks={tasks} 
        onSelectReference={(clip) => setActiveReferenceClip(clip)} 
        activeReferenceClip={activeReferenceClip}
        onUpdateReferenceTime={handleUpdateReferenceTime}
      />
    </div>
  );
};

export default App;