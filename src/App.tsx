/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback, FormEvent } from 'react';
import { CheckCircle, MessageSquare, AlertCircle, FileText, Video, LogOut, Database, Lock, Star, Download, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, CutoffData, ShortlistedCollege } from './types';
import * as XLSX from 'xlsx';
import { StrategyPlanner } from './components/StrategyPlanner';
import { AdminPanel } from './components/AdminPanel';
import { auth, db } from './lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  getDocs,
  limit,
  doc,
  getDoc,
  setDoc,
  addDoc
} from 'firebase/firestore';
import { seedCutoffs } from './lib/seedDatabase';
import { handleFirestoreError } from './lib/firebaseUtils';
import { PredictionHistory } from './types';

export default function App() {
  const [track, setTrack] = useState<'AIQ' | 'State'>('AIQ');
  const [rank, setRank] = useState<string>('');
  const [category, setCategory] = useState<string>('General');
  const [exam, setExam] = useState<'NEET' | 'JEE' | 'PCM' | 'PCB'>('NEET');
  const [pcm, setPcm] = useState<string>('');
  const [pcb, setPcb] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [registeringData, setRegisteringData] = useState({ name: '', phone: '', category: 'General' });
  const [firestoreCutoffs, setFirestoreCutoffs] = useState<CutoffData[]>([]);
  const [shortlistedColleges, setShortlistedColleges] = useState<ShortlistedCollege[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [consultationName, setConsultationName] = useState('');
  const [consultationMobile, setConsultationMobile] = useState('');
  const [showConsultationSuccess, setShowConsultationSuccess] = useState(false);
  const [isSubmittingConsultation, setIsSubmittingConsultation] = useState(false);

  const fetchShortlist = async (uid: string) => {
    try {
      const q = query(collection(db, 'users', uid, 'shortlist'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShortlistedCollege));
      setShortlistedColleges(data);
    } catch (error) {
      console.error("Error fetching shortlist:", error);
    }
  };

  const fetchCutoffs = async () => {
    try {
      const q = query(collection(db, 'cutoffs'), limit(50));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CutoffData));
      if (data.length > 0) {
        setFirestoreCutoffs(data);
      }
    } catch (error) {
      console.error("Error fetching cutoffs:", error);
    }
  };

  const fetchUserProfile = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserProfile(userSnap.data() as UserProfile);
        setNeedsRegistration(false);
        setShowAuthModal(false);
      } else {
        setNeedsRegistration(true);
        setRegisteringData({
          name: auth.currentUser?.displayName || '',
          phone: '',
          category: 'General'
        });
        setShowAuthModal(true); // Ensure modal is open for registration
      }
    } catch (error) {
      handleFirestoreError(error, 'get', `/users/${uid}`);
    }
  };

  const handleRegistration = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const newProfile: UserProfile = {
        uid: user.uid,
        name: registeringData.name,
        email: user.email || '',
        phone: registeringData.phone,
        role: 'student'
      };

      // Special case for initial admin
      if (newProfile.email === 'rupali.lamkhade9@gmail.com') {
        newProfile.role = 'admin';
      }

      await setDoc(userRef, newProfile);
      setUserProfile(newProfile);
      setNeedsRegistration(false);
      setShowAuthModal(false);
    } catch (error) {
      handleFirestoreError(error, 'write', `/users/${user.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchUserProfile(u.uid);
        fetchShortlist(u.uid);
      } else {
        setUserProfile(null);
        setShortlistedColleges([]);
        setNeedsRegistration(false);
      }
    });

    const initData = async () => {
      await fetchCutoffs();
    };
    initData();

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = () => {
    signOut(auth);
    setUser(null);
    setUserProfile(null);
    setShowAuthModal(false);
  };

  const toggleShortlist = useCallback(async (cutoff: CutoffData) => {
    if (!user) {
      login();
      return;
    }

    const isShortlisted = shortlistedColleges.find(c => c.id === cutoff.id);
    const shortlistRef = doc(db, 'users', user.uid, 'shortlist', cutoff.id);

    try {
      if (isShortlisted) {
        // Remove
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(shortlistRef);
        setShortlistedColleges(prev => prev.filter(c => c.id !== cutoff.id));
      } else {
        // Add
        const now = Date.now();
        const newShortlist: ShortlistedCollege = {
          ...cutoff,
          userId: user.uid,
          savedAt: now
        };
        await setDoc(shortlistRef, newShortlist);
        setShortlistedColleges(prev => [...prev, newShortlist]);
      }
    } catch (error) {
      handleFirestoreError(error, 'write', `/users/${user.uid}/shortlist/${cutoff.id}`);
    }
  }, [user, shortlistedColleges]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedCutoffs();
      await fetchCutoffs();
      alert("Database seeded successfully!");
    } catch (error) {
      console.error("Seeding failed:", error);
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (!rank) return [];
    const numRank = parseFloat(rank);
    return firestoreCutoffs.filter(col => {
      const quotaMatch = col.quota === track;
      const categoryMatch = col.category === category;
      
      // Determine if it's a medical or engineering course
      const medicalKeywords = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'Nursing', 'Pharmacy', 'B.Pharm', 'Medical'];
      const isMedical = medicalKeywords.some(k => col.course.toUpperCase().includes(k.toUpperCase()));
      const isEngineering = !isMedical;
      
      const courseMatch = (() => {
        if (exam === 'NEET' || exam === 'PCB') return isMedical;
        if (exam === 'JEE' || exam === 'PCM') return isEngineering;
        return true;
      })();

      // Ranking logic: 
      // For Rank (NEET, JEE): Lower is better. Cutoff Rank >= User Rank
      // For Score/Percentile (PCM, PCB): Higher is better. User Score >= Cutoff Score
      const rankMatch = (exam === 'PCM' || exam === 'PCB') 
        ? numRank >= col.closingRank 
        : col.closingRank >= numRank;
      
      return quotaMatch && categoryMatch && courseMatch && rankMatch;
    }).sort((a, b) => {
      if (exam === 'PCM' || exam === 'PCB') {
        return b.closingRank - a.closingRank; // Higher score first
      }
      return a.closingRank - b.closingRank; // Lower rank first
    });
  }, [rank, track, category, exam, firestoreCutoffs]);

  const exportPredictedToExcel = useCallback(async () => {
    if (filteredResults.length === 0) return;
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsExporting(true);
    try {
      const dataToExport: Record<string, string | number>[] = filteredResults.map(col => ({
        'College Name': col.collegeName,
        'Course': col.course,
        'Category': col.category,
        'Closing Rank': col.closingRank,
        'Quota': col.quota,
        'State': col.state
      }));

      // Add Footer with User Details & Search Params
      dataToExport.push({}); // Space
      dataToExport.push({ 'College Name': 'SEARCH PARAMETERS' });
      dataToExport.push({ 'College Name': 'Exam Type', 'Course': exam });
      dataToExport.push({ 'College Name': 'Rank', 'Course': rank });
      dataToExport.push({ 'College Name': 'Category', 'Course': category });
      dataToExport.push({ 'College Name': 'Track', 'Course': track === 'AIQ' ? 'All India Quota' : 'State Quota' });
      
      if (exam === 'JEE' || exam === 'PCM') {
        const [p, c, m] = pcm.split(',');
        dataToExport.push({ 'College Name': 'Physics (%)', 'Course': p || 'N/A' });
        dataToExport.push({ 'College Name': 'Chemistry (%)', 'Course': c || 'N/A' });
        dataToExport.push({ 'College Name': 'Mathematics (%)', 'Course': m || 'N/A' });
      } else if (exam === 'NEET' || exam === 'PCB') {
        const [p, c, b] = pcb.split(',');
        dataToExport.push({ 'College Name': 'Physics (%)', 'Course': p || 'N/A' });
        dataToExport.push({ 'College Name': 'Chemistry (%)', 'Course': c || 'N/A' });
        dataToExport.push({ 'College Name': 'Biology (%)', 'Course': b || 'N/A' });
      }
      
      dataToExport.push({}); // Space
      dataToExport.push({ 'College Name': 'USER DETAILS' });
      dataToExport.push({ 'College Name': 'Name', 'Course': userProfile?.name || user?.displayName || '' });
      dataToExport.push({ 'College Name': 'Email', 'Course': userProfile?.email || user?.email || '' });
      dataToExport.push({ 'College Name': 'Mobile', 'Course': userProfile?.phone || '' });
      dataToExport.push({ 'College Name': 'Export Date', 'Course': new Date().toLocaleString() });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Predicted Colleges");
      
      const fileName = `Prediction_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // Save to Database History
      const nowAt = Date.now();
      const historyRef = collection(db, 'users', user.uid, 'prediction_history');
      const historyEntry: PredictionHistory = {
        userId: user.uid,
        timestamp: nowAt,
        searchParams: {
          rank: parseFloat(rank),
          category,
          exam,
          track,
          pcm: (exam === 'JEE' || exam === 'PCM') ? pcm : undefined,
          pcb: (exam === 'NEET' || exam === 'PCB') ? pcb : undefined
        },
        colleges: filteredResults
      };
      await addDoc(historyRef, historyEntry);

    } catch (error) {
      console.error("Prediction export failed:", error);
      handleFirestoreError(error, 'write', `/users/${user.uid}/prediction_history`);
    } finally {
      setIsExporting(false);
    }
  }, [user, filteredResults, exam, rank, category, track, userProfile, pcm, pcb]);

  const exportShortlistToExcel = useCallback(() => {
    if (shortlistedColleges.length === 0) return;
    setIsExporting(true);

    try {
      const dataToExport: Record<string, string | number>[] = shortlistedColleges.map(col => ({
        'College Name': col.collegeName,
        'Course': col.course,
        'Category': col.category,
        'Closing Rank': col.closingRank,
        'Quota': col.quota,
        'State': col.state,
        'Saved On': new Date(col.savedAt).toLocaleDateString()
      }));

      // Add user info if available
      if (userProfile) {
        dataToExport.push({}); // Blank row
        dataToExport.push({
          'College Name': 'USER DETAILS',
          'Course': '',
          'Category': '',
          'Closing Rank': '',
          'Quota': '',
          'State': '',
          'Saved On': ''
        });
        dataToExport.push({
          'College Name': 'Name',
          'Course': userProfile.name,
          'Category': '',
          'Closing Rank': '',
          'Quota': '',
          'State': '',
          'Saved On': ''
        });
        dataToExport.push({
          'College Name': 'Email',
          'Course': userProfile.email,
          'Category': '',
          'Closing Rank': '',
          'Quota': '',
          'State': '',
          'Saved On': ''
        });
        dataToExport.push({
          'College Name': 'Rank/Score',
          'Course': rank.toString(),
          'Category': category,
          'Closing Rank': '',
          'Quota': '',
          'State': '',
          'Saved On': ''
        });
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Shortlisted Colleges");
      
      const fileName = `${userProfile?.name || 'User'}_College_Shortlist_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Excel export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [shortlistedColleges, userProfile, rank, category]);

  const handleConsultationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consultationName || !consultationMobile) return;
    
    setIsSubmittingConsultation(true);
    try {
      const requestRef = collection(db, 'consultation_requests');
      await addDoc(requestRef, {
        name: consultationName,
        mobile: consultationMobile,
        userId: user?.uid || null,
        timestamp: Date.now()
      });
      setShowConsultationSuccess(true);
      setConsultationName('');
      setConsultationMobile('');
      setTimeout(() => setShowConsultationSuccess(false), 5000);
    } catch (error) {
      console.error("Consultation request failed:", error);
      handleFirestoreError(error, 'write', '/consultation_requests');
    } finally {
      setIsSubmittingConsultation(false);
    }
  };

  const notifications = [
    "NEET 2024 Registration Deadline Extended to June 15th!",
    "Maharashtra CAP Round 1 Allotment List is OUT. Check Now!",
    "Upcoming Webinar: Choice Filling Strategy for Top Medical Colleges.",
    "JEE Main Phase 2 Results expected next Wednesday."
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* PHASE 5: NOTIFICATION TICKER (Professional Polish Theme) */}
      <div className="bg-red-600 text-white py-2 px-4 flex items-center shadow-sm relative z-50 overflow-hidden">
        <span className="bg-white text-red-600 text-[10px] font-bold px-2 py-0.5 rounded mr-3 animate-pulse uppercase flex-shrink-0">Breaking</span>
        <div className="flex animate-marquee-slower whitespace-nowrap text-sm font-medium tracking-wide">
          {notifications.map((note, i) => (
            <span key={i} className="mx-12">{note}</span>
          ))}
          {notifications.map((note, i) => (
            <span key={`dup-${i}`} className="mx-12">{note}</span>
          ))}
        </div>
      </div>

      {/* NAVIGATION (Professional Polish Theme) */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-40">
        <nav className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="relative flex items-center justify-center">
              <div className="bg-blue-900 p-2.5 rounded-lg text-white shadow-lg relative z-10 group-hover:bg-blue-800 transition-all transform group-hover:scale-105">
                <div className="relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-amber-400 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m11.83 12-5.46 5.46L2 22l4.54-4.37L12 12.17V12Z"/><path d="M12 12.17 17.46 17.63 22 22l-4.37-4.54L12.17 12H12Z"/><path d="M18.8 6.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2Z"/><path d="M12 12V2"/><path d="M11 2h2"/></svg>
                </div>
              </div>
              <div className="absolute -bottom-1 w-8 h-1 bg-amber-400 rounded-full blur-[1px]"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-900 leading-none">Laxmi Counselling Acadamy</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Laxmi Educational Group</p>
            </div>
          </div>
          
          <div className="hidden lg:flex space-x-8 text-sm font-semibold text-slate-600 uppercase tracking-wider">
            <a href="#" className={`pb-1 transition-colors ${track === 'AIQ' ? 'text-blue-700 border-b-2 border-blue-700' : 'hover:text-blue-700'}`}>Predictor</a>
            <a href="#" className="hover:text-blue-700 transition-colors">Documents</a>
            <a href="#" className="hover:text-blue-700 transition-colors">Institutions</a>
            <a href="#" className="hover:text-blue-700 transition-colors">Schedule</a>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="text-right mr-2 hidden sm:block">
                  <p className="text-xs font-bold text-slate-800">Welcome, {user.displayName?.split(' ')[0] || 'Candidate'}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-medium">Power User: {userProfile?.role || 'student'}</p>
                </div>
                <button 
                  onClick={logout}
                  className="h-10 w-10 rounded-full border-2 border-white shadow-sm overflow-hidden group relative"
                  title="Logout"
                >
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <LogOut size={14} className="text-white" />
                  </div>
                </button>
              </>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-6 rounded shadow-md transition-all text-sm uppercase tracking-wider"
              >
                Login
              </button>
            )}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-8 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUMN 1: PREDICTOR (PHASE 2) */}
          <div className="lg:col-span-8 space-y-6 flex flex-col">
            
            <section id="predictor-form" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">College Predictor Engine</h2>
                {/* DUAL TRACK TOGGLE (Professional Polish Theme) */}
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button 
                    onClick={() => { 
                      setTrack('AIQ'); 
                      setShowResults(false); 
                      if (exam === 'PCM' || exam === 'PCB') setExam('NEET');
                    }}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${track === 'AIQ' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    All India Quota (AIQ)
                  </button>
                  <button 
                    onClick={() => { setTrack('State'); setShowResults(false); }}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${track === 'State' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    State Quota (85%)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Exam Type</label>
                  <select 
                    value={exam}
                    onChange={(e) => setExam(e.target.value as 'NEET' | 'JEE' | 'PCM' | 'PCB')}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="NEET">NEET-UG</option>
                    <option value="JEE">JEE-Main</option>
                    {track === 'State' && (
                      <>
                        <option value="PCM">MHT-CET (PCM)</option>
                        <option value="PCB">MHT-CET (PCB)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">{(exam === 'PCM' || exam === 'PCB') ? 'CET Score (%)' : 'All India Rank'}</label>
                  <input 
                    type="number" 
                    value={rank}
                    onChange={(e) => { setRank(e.target.value); setShowResults(false); }}
                    placeholder={(exam === 'PCM' || exam === 'PCB') ? "e.g. 98.5" : "e.g. 14250"} 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium outline-none focus:border-blue-500"
                  >
                    <option>General</option>
                    <option>OBC-NCL</option>
                    <option>SC/ST</option>
                    <option>EWS</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button 
                    onClick={() => setShowResults(true)}
                    disabled={!rank || firestoreCutoffs.length === 0}
                    className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 rounded shadow-md transition-all text-sm uppercase tracking-wide flex items-center justify-center gap-2"
                  >
                    {isSeeding ? '...' : (firestoreCutoffs.length === 0 ? 'No Data' : 'Analyze')}
                  </button>
                  {showResults && filteredResults.length > 0 && (
                    <button 
                      onClick={exportPredictedToExcel}
                      disabled={isExporting}
                      className="bg-green-600 hover:bg-green-700 text-white p-2 rounded shadow-md transition-all flex items-center justify-center"
                      title="Download Excel"
                    >
                      {isExporting ? <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span> : <Download size={18} />}
                    </button>
                  )}
                </div>
              </div>

              {/* PCM/PCB SECTION (Refined) */}
              <motion.div 
                initial={false}
                animate={{ height: ['NEET', 'JEE', 'PCM', 'PCB'].includes(exam) ? 'auto' : 0, opacity: 1 }}
                className="mt-6 pt-6 border-t border-slate-100 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={14} className="text-blue-600" />
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Prerequisites (Aggregate %)</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Physics (%)</label>
                    <input 
                      type="number" 
                      value={pcm.split(',')[0] || ''} 
                      onChange={(e) => setPcm(prev => {
                        const parts = prev.split(',');
                        parts[0] = e.target.value;
                        return parts.join(',');
                      })}
                      placeholder="e.g. 85"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium outline-none focus:border-blue-500 transition-colors" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Chemistry (%)</label>
                    <input 
                      type="number" 
                      value={pcm.split(',')[1] || ''} 
                      onChange={(e) => setPcm(prev => {
                        const parts = prev.split(',');
                        parts[1] = e.target.value;
                        return parts.join(',');
                      })}
                      placeholder="e.g. 88"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium outline-none focus:border-blue-500 transition-colors" 
                    />
                  </div>
                  {(exam === 'NEET' || exam === 'PCB') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Biology (%)</label>
                      <input 
                        type="number" 
                        value={pcb} 
                        onChange={(e) => setPcb(e.target.value)}
                        placeholder="e.g. 92"
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium outline-none focus:border-blue-500 transition-colors" 
                      />
                    </div>
                  )}
                  {(exam === 'JEE' || exam === 'PCM') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Mathematics (%)</label>
                      <input 
                        type="number" 
                        value={pcm.split(',')[2] || ''} 
                        onChange={(e) => setPcm(prev => {
                          const parts = prev.split(',');
                          parts[2] = e.target.value;
                          return parts.join(',');
                        })}
                        placeholder="e.g. 95"
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm font-medium outline-none focus:border-blue-500 transition-colors" 
                      />
                    </div>
                  )}
                </div>
              </motion.div>

              {user?.email === 'rupali.lamkhade9@gmail.com' && firestoreCutoffs.length === 0 && (
                <button 
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-700 transition-colors mx-auto block"
                >
                  <Database size={10} className="inline mr-1 mb-0.5" /> Initialize Data Source
                </button>
              )}
            </section>

            {/* RESULTS (PHASE 2) - Table Format */}
            <AnimatePresence>
              {showResults && (
                <motion.section 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col"
                >
                  <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-slate-700">Historical Analysis: Predicted Admissions</h3>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest flex items-center gap-2">
                         <CheckCircle size={10} className="text-green-500" /> Based on 2021-2023 Data
                      </span>
                    </div>
                    {filteredResults.length > 0 && (
                      <button 
                        onClick={exportPredictedToExcel}
                        disabled={isExporting}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all disabled:bg-slate-300"
                      >
                        {isExporting ? <span className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full"></span> : <Download size={14} />}
                        Download Results (Excel)
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3">Institution Name</th>
                          <th className="px-6 py-3">Course</th>
                          <th className="px-6 py-3">Closing Rank</th>
                          <th className="px-6 py-3">Probability</th>
                          <th className="px-6 py-3 text-right">Shortlist</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredResults.length > 0 ? (
                          filteredResults.map((col, idx) => {
                            const isShortlisted = shortlistedColleges.some(c => c.id === col.id);
                            return (
                              <tr key={col.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                                <td className="px-6 py-4">
                                  <p className="font-bold text-sm text-slate-700 group-hover:text-blue-700 transition-colors">{col.collegeName}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{col.state}</p>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 font-medium">{col.course}</td>
                                <td className="px-6 py-4 text-sm font-mono text-slate-600 font-bold">{col.closingRank.toLocaleString()}</td>
                                <td className="px-6 py-4">
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${idx < 3 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {idx < 3 ? '94% SAFE' : 'BORDERLINE'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); toggleShortlist(col); }}
                                    className={`p-2 rounded-full transition-all ${isShortlisted ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-blue-600 hover:bg-blue-50'}`}
                                    title={isShortlisted ? "Remove from Shortlist" : "Add to Shortlist"}
                                  >
                                    <Star size={18} fill={isShortlisted ? "currentColor" : "none"} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-20 text-center">
                              <AlertCircle className="mx-auto text-slate-200 mb-2" size={32} />
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No matching institutions found</p>
                              <p className="text-xs text-slate-400 mt-1">Try broadening your search parameters or rank.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {filteredResults.length > 0 && (
                    <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
                      <button className="text-[10px] font-bold text-blue-700 hover:underline uppercase tracking-widest">
                        View Complete Detailed Analysis &rarr;
                      </button>
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>

            {/* QUICK INQUIRY FORM (Refined for Polish Theme) */}
            <section className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
               <AnimatePresence>
                 {showConsultationSuccess && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6"
                   >
                     <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                       <CheckCircle size={32} />
                     </div>
                     <h3 className="text-xl font-bold text-slate-800 mb-2">Request Received!</h3>
                     <p className="text-sm text-slate-500 font-medium max-w-xs">Our team will reach out to you soon for your prioritized consultation.</p>
                     <button 
                       onClick={() => setShowConsultationSuccess(false)}
                       className="mt-6 text-xs font-bold text-blue-700 uppercase tracking-widest hover:underline"
                     >
                       Close
                     </button>
                   </motion.div>
                 )}
               </AnimatePresence>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                 <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Confused about CAP rounds?</h2>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">Book a prioritized consultation with our senior advisors. We specialize in seat optimization and preference list strategy.</p>
                 </div>
                 <form className="space-y-3" onSubmit={handleConsultationSubmit}>
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      required
                      value={consultationName}
                      onChange={(e) => setConsultationName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-sm font-medium outline-none focus:border-blue-500 transition-colors" 
                    />
                    <input 
                      type="tel" 
                      placeholder="Mobile Number" 
                      required
                      value={consultationMobile}
                      onChange={(e) => setConsultationMobile(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-sm font-medium outline-none focus:border-blue-500 transition-colors" 
                    />
                    <button 
                      type="submit"
                      disabled={isSubmittingConsultation}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded text-xs uppercase tracking-widest transition-all shadow-md disabled:bg-slate-400 flex items-center justify-center gap-2"
                    >
                      {isSubmittingConsultation ? (
                        <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
                      ) : 'Connect with Expert'}
                    </button>
                 </form>
               </div>
            </section>

            {/* ADMIN PANEL */}
            {userProfile?.role === 'admin' && <AdminPanel />}

            {/* SAVED SHORTLIST SECTION */}
            {user && shortlistedColleges.length > 0 && (
              <section className="bg-white rounded-xl shadow-md border border-amber-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                      <Star size={24} fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">My College Shortlist</h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        You have <span className="text-blue-700 font-bold">{shortlistedColleges.length} colleges</span> in your priority list.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={exportShortlistToExcel}
                      disabled={isExporting}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-green-200 transition-all text-xs uppercase tracking-widest flex items-center gap-3 disabled:bg-slate-300 disabled:shadow-none"
                    >
                      {isExporting ? <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span> : <Download size={16} />}
                      {isExporting ? 'Generating...' : 'Download Excel List'}
                    </button>
                    <button 
                      onClick={() => {
                        if(confirm("Clear shortlist?")) {
                          shortlistedColleges.forEach(toggleShortlist);
                        }
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-lg transition-colors border border-slate-200"
                      title="Clear All"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="bg-slate-50/50 px-8 py-4 border-t border-slate-100 flex flex-wrap gap-2">
                  {shortlistedColleges.map((col) => (
                    <div key={col.id} className="bg-white border border-slate-200 px-3 py-1.5 rounded-md flex items-center gap-3 shadow-sm group">
                      <span className="text-xs font-bold text-slate-700">{col.collegeName}</span>
                      <button 
                        onClick={() => toggleShortlist(col)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* COLUMN 2: SIDEBAR (PHASES 3 & 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* STRATEGY PLANNER (PHASE 4) - Automatically updated via props */}
            {rank && <StrategyPlanner rank={parseInt(rank)} category={category} />}
            
            {/* DOCUMENT VAULT (PHASE 3) (Professional Polish Theme) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <h3 className="text-base font-bold text-slate-800">Document Vault</h3>
              </div>
 
              {!user ? (
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 text-center">
                  <Lock size={24} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">Access Restricted<br/>Authentication Required</p>
                  <button onClick={login} className="mt-4 text-[10px] font-black text-blue-700 hover:underline uppercase">Login to Secure Vault</button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Verification Progress</span>
                      <span className="text-xs font-bold text-blue-700">75%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '75%' }}
                        className="h-full bg-blue-600 rounded-full"
                      ></motion.div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { name: 'NEET Admit Card', status: 'VERIFIED' },
                      { name: 'Class XII Marksheet', status: 'VERIFIED' },
                      { name: 'Caste Validity', status: 'PENDING' }
                    ].map((doc, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${doc.status === 'VERIFIED' ? 'border-slate-100 bg-slate-50' : 'border-blue-100 bg-blue-50'}`}>
                        <div className="flex items-center space-x-3">
                          <div className={doc.status === 'VERIFIED' ? 'text-green-500' : 'text-blue-400'}>
                            {doc.status === 'VERIFIED' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : (
                              <FileText size={16} />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{doc.name}</span>
                        </div>
                        {doc.status === 'VERIFIED' ? (
                          <span className="text-[10px] text-slate-400 font-bold tracking-tighter">VERIFIED</span>
                        ) : (
                          <button className="text-[10px] text-blue-700 font-bold underline uppercase tracking-tighter">Upload</button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* COUNSELOR ON CALL (PHASE 4) (Professional Polish Theme) */}
            <div className="bg-blue-900 rounded-xl shadow-lg p-6 text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12 blur-2xl"></div>
              
              <h3 className="text-lg font-bold mb-2 relative z-10">Chief Admission Advisor</h3>
              <p className="text-xs text-blue-200 mb-6 font-medium leading-relaxed relative z-10">Get expert guidance for your admission journey with over 10+ years of experience.</p>
              
              <div className="flex items-center space-x-4 mb-6 bg-blue-800/50 p-4 rounded-lg border border-blue-700 relative z-10">
                <div className="relative">
                  <div className="w-16 h-16 rounded-lg border-2 border-blue-400 overflow-hidden bg-slate-200 shadow-xl">
                    <img 
                      src="/counselor.jpg" 
                      alt="Mr. Vijay Bhosale" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=Vijay`;
                      }}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-blue-900 rounded-full animate-pulse shadow-sm"></div>
                </div>
                <div>
                  <p className="text-sm font-bold">Mr. Vijay Bhosale</p>
                  <p className="text-[10px] text-blue-300 font-bold tracking-widest uppercase">Senior Advisor & Founder</p>
                  <p className="text-[9px] text-blue-400 font-medium mt-1">Expert in Medical & Eng. CAP</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 relative z-10">
                <a 
                  href="https://wa.me/919420305114" 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-[#25D366] text-white text-[10px] font-bold py-3 rounded hover:brightness-110 transition-all flex items-center justify-center space-x-2 tracking-widest uppercase shadow-md"
                >
                  <MessageSquare size={14} />
                  <span>WhatsApp</span>
                </a>
                <a 
                  href="tel:9420305114"
                  className="bg-white text-blue-900 text-[10px] font-bold py-3 rounded flex items-center justify-center space-x-2 tracking-widest uppercase hover:bg-blue-50 transition-all shadow-md"
                >
                  <Video size={14} />
                  <span>Direct Call</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verified Data Source: MCC / NTA / State CET Cell</p>
          <span className="hidden sm:inline text-slate-200">|</span>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Online</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">© 2024 Laxmi Counselling Acadamy. All rights reserved.</p>
      </footer>

      {/* AUTH MODAL & REGISTRATION (Advanced Transition UI) */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !needsRegistration && setShowAuthModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
            >
              {!needsRegistration ? (
                /* LOGIN SECTION */
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700 mx-auto mb-4">
                      <Lock size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">Welcome Back</h3>
                    <p className="text-sm text-slate-500 mt-2 font-medium">Access your personalized college predictor</p>
                  </div>

                  <button 
                    onClick={login}
                    className="w-full bg-white border-2 border-slate-200 hover:border-blue-500 transition-all text-slate-700 font-bold py-4 rounded-xl flex items-center justify-center gap-3 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-blue-50 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <div className="relative flex items-center gap-3">
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                      <span>Continue with Google</span>
                    </div>
                  </button>

                  <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-loose">
                      By continuing, you agree to our<br/>
                      <span className="text-blue-700 hover:underline cursor-pointer">Terms for Service</span> & <span className="text-blue-700 hover:underline cursor-pointer">Privacy Policy</span>
                    </p>
                  </div>
                </div>
              ) : (
                /* REGISTRATION SECTION */
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="relative mx-auto w-16 h-16 mb-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border-2 border-white">
                        <img 
                          src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName}`} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm border border-slate-100">
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-3 h-3" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">Complete Profile</h3>
                    <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">{user?.email}</p>
                  </div>

                  <form onSubmit={handleRegistration} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={registeringData.name}
                        onChange={(e) => setRegisteringData({...registeringData, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-medium focus:border-blue-500 outline-none transition-all"
                        placeholder="Your full name"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mobile Number</label>
                      <input 
                        type="tel" 
                        required
                        value={registeringData.phone}
                        onChange={(e) => setRegisteringData({...registeringData, phone: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-medium focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. 9876543210"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        value={registeringData.category}
                        onChange={(e) => setRegisteringData({...registeringData, category: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-medium focus:border-blue-500 outline-none transition-all appearance-none"
                      >
                        <option>General</option>
                        <option>OBC-NCL</option>
                        <option>SC/ST</option>
                        <option>EWS</option>
                      </select>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl h shadow-xl shadow-blue-200 transition-all text-sm uppercase tracking-widest mt-4"
                    >
                      Complete Registration
                    </button>

                    <button 
                      type="button"
                      onClick={() => { logout(); setShowAuthModal(false); }}
                      className="w-full text-slate-400 hover:text-slate-600 font-bold py-2 text-[10px] uppercase tracking-widest transition-all"
                    >
                      Cancel & Logout
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-slower {
          animation: marquee 50s linear infinite;
        }
      `}</style>
    </div>
  );
}
