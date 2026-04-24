/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle, 
  MessageSquare, 
  AlertCircle,
  FileText,
  Video,
  LogOut,
  Database,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, CutoffData } from './types';
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
  setDoc
} from 'firebase/firestore';
import { seedCutoffs } from './lib/seedDatabase';
import { handleFirestoreError } from './lib/firebaseUtils';

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
  const [firestoreCutoffs, setFirestoreCutoffs] = useState<CutoffData[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

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
      } else {
        // Initialize new user as student by default
        const newProfile: UserProfile = {
          uid,
          name: auth.currentUser?.displayName || 'Candidate',
          email: auth.currentUser?.email || '',
          role: 'student'
        };
        // Special case for initial admin
        if (newProfile.email === 'rupali.lamkhade9@gmail.com') {
          newProfile.role = 'admin';
        }
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (error) {
      handleFirestoreError(error, 'get', `/users/${uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchUserProfile(u.uid);
      } else {
        setUserProfile(null);
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

  const logout = () => signOut(auth);

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
    const numRank = parseInt(rank);
    return firestoreCutoffs.filter(col => {
      const rankMatch = col.closingRank >= numRank;
      const quotaMatch = col.quota === track;
      const categoryMatch = col.category === category;
      const courseMatch = exam === 'NEET' || exam === 'PCB' ? col.course === 'MBBS' : (exam === 'JEE' || exam === 'PCM' ? col.course !== 'MBBS' : true);
      
      return rankMatch && quotaMatch && categoryMatch && courseMatch;
    }).sort((a, b) => a.closingRank - b.closingRank);
  }, [rank, track, category, exam, firestoreCutoffs]);

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
                onClick={login}
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

                <div className="flex items-end">
                  <button 
                    onClick={() => setShowResults(true)}
                    disabled={!rank || firestoreCutoffs.length === 0}
                    className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 rounded shadow-md transition-all text-sm uppercase tracking-wide flex items-center justify-center gap-2"
                  >
                    {isSeeding ? '...' : (firestoreCutoffs.length === 0 ? 'No Data' : 'Analyze')}
                  </button>
                </div>
              </div>

              {/* PCM/PCB SECTION (New) */}
              <motion.div 
                initial={false}
                animate={{ height: ['NEET', 'JEE', 'PCM', 'PCB'].includes(exam) ? 'auto' : 0, opacity: 1 }}
                className="mt-6 pt-6 border-t border-slate-100 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={14} className="text-blue-600" />
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Prerequisites (Optional)</h4>
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
                  {(exam !== 'JEE' && exam !== 'PCM') && (
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
                  {(exam !== 'NEET' && exam !== 'PCB') && (
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
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-700">Historical Analysis: Predicted Admissions</h3>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest flex items-center gap-2">
                       <CheckCircle size={10} className="text-green-500" /> Based on 2021-2023 Data
                    </span>
                  </div>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3">Institution Name</th>
                          <th className="px-6 py-3">Course</th>
                          <th className="px-6 py-3">Closing Rank</th>
                          <th className="px-6 py-3 text-right">Probability</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredResults.length > 0 ? (
                          filteredResults.map((col, idx) => (
                            <tr key={col.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                              <td className="px-6 py-4">
                                <p className="font-bold text-sm text-slate-700 group-hover:text-blue-700 transition-colors">{col.collegeName}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{col.state}</p>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-500 font-medium">{col.course}</td>
                              <td className="px-6 py-4 text-sm font-mono text-slate-600 font-bold">{col.closingRank.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${idx < 3 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {idx < 3 ? '94% SAFE' : 'BORDERLINE'}
                                </span>
                              </td>
                            </tr>
                          ))
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
            <section className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                 <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Confused about CAP rounds?</h2>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">Book a prioritized consultation with our senior advisors. We specialize in seat optimization and preference list strategy.</p>
                 </div>
                 <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                    <input type="text" placeholder="Full Name" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-sm font-medium outline-none focus:border-blue-500 transition-colors" />
                    <input type="tel" placeholder="Mobile Number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-sm font-medium outline-none focus:border-blue-500 transition-colors" />
                    <button className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded text-xs uppercase tracking-widest transition-all shadow-md">Connect with Expert</button>
                 </form>
               </div>
            </section>

            {/* ADMIN PANEL */}
            {userProfile?.role === 'admin' && <AdminPanel />}

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
