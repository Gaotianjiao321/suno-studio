
export enum TaskStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export interface Stem {
  name: string;
  url: string;
}

// Internal app representation of a task
export interface GenerationTask {
  id: string; // API Task ID
  clipId?: string; // The actual Audio Clip ID
  createdAt: number;
  status: TaskStatus;
  type: 'MUSIC' | 'LYRICS' | 'STEMS' | 'UPLOAD';
  
  // Inputs
  prompt: string;
  
  // Logic tracking
  isExtend?: boolean;
  isCover?: boolean;
  referenceClipId?: string;
  
  // Outputs
  resultAudioUrl?: string;
  resultVideoUrl?: string;
  coverImageUrl?: string;
  title?: string;
  duration?: string;
  lyrics?: string;
  tags?: string;
  
  // Logic
  failReason?: string;
}

export interface ReferenceClip {
  id: string;
  title: string;
  url?: string;
  duration?: number; // seconds
  continueAt?: number; // timestamp selected by user
}

// API Response Types based on provided JSON
export interface SunoResponse<T> {
  code: string;
  data: T;
  message: string;
}

export interface SunoTaskData {
  action: string;
  data: SunoClipDatum[];
  fail_reason: string;
  finish_time: number;
  progress: string;
  status: string; 
  task_id: string;
}

export interface SunoClipDatum {
  id: string;
  audio_url: string;
  image_url: string;
  image_large_url: string;
  video_url: string;
  title: string;
  model_name: string;
  status: string;
  metadata: {
    duration: number;
    prompt: string;
    tags: string;
    gpt_description_prompt: string;
    type?: string; 
    audio_prompt_id?: string;
  };
}

export interface UploadInitResponse {
  id: string;
  url: string;
  signed_url?: string;
}

export interface UploadStatusResponse {
  id: string;
  status: string;
}

export enum GenerationType {
    Text = "TEXT",
}

export enum Mv {
    ChirpAuk = "chirp-auk",
    ChirpV3 = "chirp-v3-0",
    ChirpV3_5_Tau = "chirp-v3-5-tau",
    ChirpV4 = "chirp-v4",
    ChirpCrow = "chirp-crow"
}

export enum StemTask {
    Two = "two",
}

export enum StemTypeGroupName {
    Two = "Two",
}

export enum TaskType {
    GenStem = "gen_stem",
    CustomGenerate = "custom_generate",
    UploadExtend = "upload_extend",
    Cover = "cover",
    DescriptionMode = "description_mode" // Added internal tracking
}
