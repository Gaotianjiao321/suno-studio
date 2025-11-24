
export const API_BASE_URL = "https://ai.comfly.chat";

// Ideally, this should be an environment variable or input by the user. 
export const API_KEY = ""; 

export const MOCK_DELAY_MS = 2000;

export const ENDPOINTS = {
  // Upload
  UPLOAD_INIT: '/suno/uploads/audio',
  UPLOAD_STATUS: '/suno/uploads/audio', // Append /{id}
  
  // Generation & Actions
  SUBMIT_MUSIC: '/suno/submit/music', // Used for Cover
  SUBMIT_GENERATE: '/suno/generate', // Used for Custom Generate / Extend
  SUBMIT_DESCRIPTION: '/suno/generate/description-mode', // Used for Simple Mode
  SUBMIT_LYRICS: '/suno/submit/lyrics',
  
  // Retrieval & Actions on Clips
  FETCH_TASK: '/suno/fetch', // Append /{task_id}
  FEED: '/suno/feed', // Append /{id} or /{ids}
  GET_WAV: '/suno/act/wav', // Append /{clip_id}
  GET_TIMING: '/suno/act/timing', // Append /{clip_id}
};

export const PLACEHOLDER_COVER = "https://picsum.photos/400/400";