import { API_BASE_URL, ENDPOINTS } from '../constants.ts';
import { 
    TaskStatus, SunoResponse, SunoTaskData, UploadInitResponse, UploadStatusResponse,
    GenerationType, Mv, StemTask, StemTypeGroupName, TaskType, GenerationTask 
} from '../types.ts';

let currentApiKey = '';

export const setApiKey = (key: string) => {
  currentApiKey = key;
};

// --- Helper for Fetch ---
async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!currentApiKey) {
    throw new Error("请先设置 API Key");
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  const authHeaders = { 'Authorization': `Bearer ${currentApiKey}` };
  const contentHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };
  
  const res = await fetch(url, {
    ...options,
    headers: { 
        ...authHeaders, 
        ...contentHeaders, 
        ...options.headers 
    },
  });
  
  if (!res.ok) {
    let errorText = '';
    try {
        errorText = await res.text();
    } catch (e) {
        errorText = 'Unknown API Error';
    }
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }

  const text = await res.text();
  try {
      return text ? JSON.parse(text) : {} as T;
  } catch (e) {
      throw new Error(`Failed to parse JSON response`);
  }
}

// --- 1. Upload Audio ---

export const uploadAudio = async (file: File): Promise<{ id: string; text?: string; title?: string; audioUrl?: string }> => {
  console.log(`[Service] 1. Init Upload for ${file.name}...`);
  const extension = file.name.split('.').pop() || 'mp3';

  let initRes;
  try {
      initRes = await fetchJson<UploadInitResponse | any>(ENDPOINTS.UPLOAD_INIT, {
        method: 'POST',
        body: JSON.stringify({ extension })
      });
  } catch (e) {
      throw new Error(`Failed to initialize upload: ${(e as Error).message}`);
  }

  const data = (initRes as any).data || initRes;
  const { id, url, fields } = data;

  if (!id || !url) throw new Error("Upload Init failed: Missing URL or ID");

  console.log(`[Service] 2. Uploading to S3...`);
  if (fields) {
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, String(value));
      });
      formData.append('file', file);
      await fetch(url, { method: 'POST', body: formData });
  } else {
      await fetch(url, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'audio/mpeg' }
      });
  }

  await fetchJson(`${ENDPOINTS.UPLOAD_INIT}/${id}/upload-finish`, {
      method: 'POST',
      body: JSON.stringify({ upload_type: 'file_upload', upload_filename: file.name })
  });

  console.log(`[Service] 4. Polling upload status...`);
  await new Promise<void>((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      try {
        attempts++;
        if (attempts > 30) { 
            clearInterval(interval);
            reject(new Error("Upload processing timeout"));
            return;
        }
        const statusRes = await fetchJson<UploadStatusResponse | any>(`${ENDPOINTS.UPLOAD_STATUS}/${id}`, { method: 'GET' });
        const statusData = statusRes.data || statusRes;
        
        if (statusData.status === 'complete' || statusData.status === 'success') {
            clearInterval(interval);
            resolve();
        } else if (statusData.status === 'error' || statusData.status === 'failed') {
            clearInterval(interval);
            reject(new Error(`Upload failed: ${statusData.error_message || 'Unknown error'}`));
        }
      } catch (e) { console.warn("Polling upload error", e); }
    }, 2000);
  });

  console.log(`[Service] 5. Initializing clip for ${id}...`);
  const clipRes = await fetchJson<any>(`${ENDPOINTS.UPLOAD_INIT}/${id}/initialize-clip`, {
      method: 'POST',
      body: JSON.stringify({})
  });
  const clipData = clipRes.data || clipRes;
  const finalClipId = clipData.clip_id || clipData.id;
  
  if (!finalClipId) throw new Error("Failed to get Clip ID from initialization");

  let extractedText = '';
  let extractedTitle = '';
  let extractedAudioUrl = '';

  try {
     console.log(`[Service] 6. Fetching feed for metadata ${finalClipId}...`);
     await new Promise(r => setTimeout(r, 1000));
     const feedRes = await fetchJson<any>(`${ENDPOINTS.FEED}/${finalClipId}`);
     const clipInfo = Array.isArray(feedRes) ? feedRes[0] : feedRes;
     
     if (clipInfo) {
        extractedText = clipInfo.metadata?.prompt || clipInfo.prompt || '';
        extractedTitle = clipInfo.title || '';
        extractedAudioUrl = clipInfo.audio_url || '';
     }
  } catch (e) { console.warn("Failed to fetch feed for lyrics", e); }

  return { id: finalClipId, text: extractedText, title: extractedTitle, audioUrl: extractedAudioUrl };
};

// --- 3. Generate Music ---

export interface CreateTaskPayload {
  mode: 'simple' | 'custom' | 'extend' | 'cover';
  mv?: Mv;
  title?: string;
  tags?: string;
  instrumental?: boolean;
  gptDescription?: string;
  prompt?: string; 
  referenceClipId?: string;
  continueAt?: number;
}

export const createGenerationTask = async (payload: CreateTaskPayload): Promise<string> => {
  console.log(`[Service] Creating music task [${payload.mode}]...`, payload);
  const mvVersion = payload.mv || Mv.ChirpCrow;
  let endpoint = '';
  let body: any = {};

  if (payload.mode === 'simple') {
      endpoint = ENDPOINTS.SUBMIT_DESCRIPTION;
      body = {
          gpt_description_prompt: payload.gptDescription,
          make_instrumental: payload.instrumental || false,
          mv: mvVersion,
          prompt: "" 
      };
  } 
  else if (payload.mode === 'custom') {
      endpoint = ENDPOINTS.SUBMIT_GENERATE;
      body = {
          prompt: payload.prompt || "",
          tags: payload.tags || "",
          mv: mvVersion,
          title: payload.title || "",
          make_instrumental: payload.instrumental || false
      };
  } 
  else if (payload.mode === 'extend') {
      if (!payload.referenceClipId) throw new Error("Reference Clip ID required for Extend");
      endpoint = ENDPOINTS.SUBMIT_GENERATE;
      body = {
          task: TaskType.UploadExtend,
          continue_clip_id: payload.referenceClipId,
          continue_at: Math.floor(payload.continueAt || 0), 
          mv: mvVersion,
          prompt: payload.prompt || "",
          tags: payload.tags || "",
          title: payload.title || ""
      };
  } 
  else if (payload.mode === 'cover') {
      if (!payload.referenceClipId) throw new Error("Reference Clip ID required for Cover");
      endpoint = ENDPOINTS.SUBMIT_MUSIC;
      body = {
          task: TaskType.Cover,
          cover_clip_id: payload.referenceClipId,
          generation_type: GenerationType.Text,
          mv: mvVersion,
          prompt: payload.prompt || "",
          tags: payload.tags || "",
          title: payload.title || "",
          make_instrumental: payload.instrumental || false,
          continue_clip_id: null,
          continue_at: null
      };
  }

  const res = await fetchJson<any>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  });

  return res.data || res.task_id || res.id;
};

// --- 5. Fetch Task Details ---

export const getTaskDetails = async (taskId: string): Promise<SunoTaskData | null> => {
  try {
    const feedRes = await fetchJson<any>(`${ENDPOINTS.FEED}/${taskId}`);
    let clips: any[] = [];
    if (Array.isArray(feedRes)) {
        clips = feedRes;
    } else if (feedRes.clips) {
        clips = feedRes.clips;
    } else if (feedRes.data) {
        clips = Array.isArray(feedRes.data) ? feedRes.data : [feedRes.data];
    }

    if (clips.length > 0) {
        const allComplete = clips.every((c: any) => c.status === 'complete' || c.status === 'success');
        const anyFailed = clips.some((c: any) => c.status === 'error' || c.status === 'failed');
        return {
            task_id: taskId,
            status: allComplete ? 'success' : (anyFailed ? 'failed' : 'running'),
            data: clips,
            action: '', fail_reason: '', finish_time: 0, progress: ''
        } as SunoTaskData;
    }
  } catch (error) { console.warn(`[Service] Feed fetch failed for ${taskId}`); }

  try {
    const fetchRes = await fetchJson<SunoResponse<SunoTaskData>>(`${ENDPOINTS.FETCH_TASK}/${taskId}`);
    return fetchRes.data;
  } catch (error) { return null; }
};

export const getWavUrl = async (clipId: string): Promise<string | null> => {
    try {
        const res = await fetchJson<any>(`${ENDPOINTS.GET_WAV}/${clipId}`);
        return res.url || res.data || null;
    } catch (error) { return null; }
}

export const mapSunoResponseToTask = (sunoData: SunoTaskData, originalTask: GenerationTask): GenerationTask => {
  const updated = { ...originalTask };
  if (sunoData.status === 'success' || sunoData.status === 'complete') {
    updated.status = TaskStatus.SUCCESS;
  } else if (sunoData.status === 'failed' || sunoData.status === 'error') {
    updated.status = TaskStatus.FAILED;
    updated.failReason = sunoData.fail_reason;
  } else {
    updated.status = TaskStatus.PROCESSING;
  }

  if (sunoData.data && sunoData.data.length > 0) {
     const clip = sunoData.data[0]; 
     updated.clipId = clip.id; 
     updated.resultAudioUrl = clip.audio_url;
     updated.resultVideoUrl = clip.video_url;
     updated.coverImageUrl = clip.image_url || clip.image_large_url;
     if(clip.title) updated.title = clip.title;
     if (clip.metadata) {
         if (clip.metadata.duration) {
             const min = Math.floor(clip.metadata.duration / 60);
             const sec = Math.floor(clip.metadata.duration % 60);
             updated.duration = `${min}:${sec.toString().padStart(2, '0')}`;
         }
         if (updated.type === 'LYRICS' && !updated.lyrics) updated.lyrics = clip.metadata.prompt; 
     }
  }
  return updated;
};