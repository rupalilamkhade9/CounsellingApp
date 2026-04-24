
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
