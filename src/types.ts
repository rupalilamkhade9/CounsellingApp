
export interface CutoffData {
  id: string;
  collegeName: string;
  course: string;
  category: string;
  closingRank: number;
  quota: 'AIQ' | 'State';
  state: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'student' | 'counselor' | 'admin';
  rank?: number;
  exam?: 'NEET' | 'JEE' | 'PCM' | 'PCB';
  category?: string;
  domicile?: string;
  pcm?: string; // Stored as CSV or similar
  pcb?: string;
}

export interface DocumentStatus {
  name: string;
  status: 'Pending' | 'Uploaded' | 'Verified';
  id: string;
}

export interface ShortlistedCollege extends CutoffData {
  userId: string;
  savedAt: number;
}

export interface PredictionHistory {
  id?: string;
  userId: string;
  timestamp: number;
  searchParams: {
    rank: number;
    category: string;
    exam: string;
    track: string;
    pcm?: string;
    pcb?: string;
  };
  colleges: CutoffData[];
}

export interface ConsultationRequest {
  id?: string;
  userId?: string;
  name: string;
  mobile: string;
  timestamp: number;
}
