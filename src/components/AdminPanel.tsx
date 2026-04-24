
import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Shield, RefreshCw } from 'lucide-react';
import { handleFirestoreError } from '../lib/firebaseUtils';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserProfile['role'] | 'all'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = collection(db, 'users');
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs
        .map(doc => ({ ...doc.data() } as UserProfile))
        .filter(u => u.uid !== auth.currentUser?.uid); // Filter out current user to avoid self-demotion
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchUsers();
    };
    init();
  }, []);

  const updateRole = async (uid: string, newRole: UserProfile['role']) => {
    setUpdating(uid);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: newRole });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      setShowSuccess(uid);
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (error) {
      handleFirestoreError(error, 'update', `/users/${uid}`);
    } finally {
      setUpdating(null);
    }
  };

  const updateBulkRoles = async (newRole: UserProfile['role']) => {
    if (selectedUsers.length === 0) return;
    setBulkUpdating(true);
    try {
      const promises = selectedUsers.map(async (uid) => {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { role: newRole });
      });

      await Promise.all(promises);
      
      setUsers(prev => prev.map(u => selectedUsers.includes(u.uid) ? { ...u, role: newRole } : u));
      setSelectedUsers([]);
      alert(`Success: ${selectedUsers.length} users updated to ${newRole}`);
    } catch (error) {
      console.error("Bulk update failed:", error);
      alert("Some updates failed. Check console for details.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const toggleSelect = (uid: string) => {
    setSelectedUsers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const toggleSelectAll = () => {
    const filteredUsers = users.filter(u => roleFilter === 'all' || u.role === roleFilter);
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.uid));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
      {/* BULK ACTION BAR */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-600 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <span className="text-white text-xs font-bold uppercase tracking-widest">
              {selectedUsers.length} Users Selected
            </span>
            <div className="h-4 w-[1px] bg-white/20"></div>
            <p className="text-[10px] text-blue-100 font-medium">Assign role to all selected:</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              disabled={bulkUpdating}
              onChange={(e) => updateBulkRoles(e.target.value as UserProfile['role'])}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded px-3 py-1 text-[10px] font-bold outline-none transition-all cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled className="text-slate-800">Assign Role...</option>
              <option value="student" className="text-slate-800">Student</option>
              <option value="counselor" className="text-slate-800">Counselor</option>
              <option value="admin" className="text-slate-800">Admin</option>
            </select>
            <button 
              onClick={() => setSelectedUsers([])}
              className="text-white/70 hover:text-white text-[10px] font-bold uppercase px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded-lg text-blue-700">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Authority Control</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">User Permissions Registry</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
                  <div className="flex bg-slate-200/50 p-1 rounded-lg">
                    {(['all', 'student', 'counselor', 'admin'] as const).map((role) => (
                      <button
                        key={role}
                        onClick={() => setRoleFilter(role)}
                        className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all ${
                          roleFilter === role 
                            ? 'bg-white text-blue-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {role}s
                      </button>
                    ))}
                  </div>
          <button 
            onClick={fetchUsers} 
            className="p-2 text-slate-400 hover:text-blue-700 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedUsers.length > 0 && selectedUsers.length === users.filter(u => roleFilter === 'all' || u.role === roleFilter).length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-4 tracking-widest">Identity</th>
              <th className="px-6 py-4 tracking-widest">Access Tier</th>
              <th className="px-6 py-4 text-right tracking-widest">Assign Override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 italic">
            {users.filter(u => roleFilter === 'all' || u.role === roleFilter).length > 0 ? (
              users
                .filter(u => roleFilter === 'all' || u.role === roleFilter)
                .map((u) => (
                <tr key={u.uid} className={`hover:bg-slate-50/30 transition-colors group ${selectedUsers.includes(u.uid) ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.includes(u.uid)}
                      onChange={() => toggleSelect(u.uid)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <span className="text-xs font-bold">{u.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-700">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium not-italic">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-bold px-2 py-1 rounded border uppercase tracking-widest ${
                      u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                      u.role === 'counselor' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-3">
                      {showSuccess === u.uid && (
                        <span className="text-[10px] font-bold text-green-600 animate-pulse">✓ Saved</span>
                      )}
                      <select
                        disabled={updating === u.uid}
                        value={u.role}
                        onChange={(e) => updateRole(u.uid, e.target.value as UserProfile['role'])}
                        className="text-[10px] font-bold bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 appearance-none cursor-pointer hover:border-slate-400 transition-colors"
                      >
                        <option value="student">Student</option>
                        <option value="counselor">Counselor</option>
                        <option value="admin">Admin</option>
                      </select>
                      {updating === u.uid && <RefreshCw size={12} className="animate-spin text-blue-600" />}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
                  {loading ? 'Fetching User Registry...' : 'No other users found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
