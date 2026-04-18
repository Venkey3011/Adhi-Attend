import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ClipboardCheck, 
  FileSpreadsheet, 
  Plus, 
  Upload, 
  LogOut, 
  ChevronRight,
  Search,
  Menu,
  Download,
  Calendar,
  UserPlus,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Folder,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
type Role = 'admin' | 'coordinator';

interface User {
  id: string;
  name: string;
  role: Role;
  department?: string;
  permissions?: string[];
}

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  batch: string;
  department: string;
}

interface AttendanceRecord {
  studentId: string;
  status: 'P' | 'A' | 'OD';
  reason?: string;
}

// Constants
const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
const FACULTY_DEPARTMENTS = ['CSE', 'IT', 'AI & DS', 'ECE', 'EEE', 'MECH', 'Placement'];
const STUDENT_DEPARTMENTS = ['CSE', 'IT', 'AI & DS', 'ECE', 'EEE', 'MECH', 'Placement'];
const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'markAttendance', label: 'Mark Attendance' },
  { id: 'manageStudents', label: 'Manage Students' },
  { id: 'reports', label: 'Reports' },
];

function useAttendanceTypes(token: string | null) {
  const [types, setTypes] = useState<{_id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTypes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/attendance-types', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTypes(data);
      }
    } catch (err) {
      console.error('Failed to fetch attendance types', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTypes(); }, [token]);

  return { types, loading, refreshTypes: fetchTypes };
}

function useBatches(token: string | null) {
  const [batches, setBatches] = useState<string[]>([]);
  const fetchBatches = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/students/batches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        window.dispatchEvent(new Event('unauthorized'));
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setBatches(data);
      } else {
        console.error('Batches API did not return an array', data);
      }
    } catch (err) {
      console.error('Failed to fetch batches', err);
    }
  };
  useEffect(() => { fetchBatches(); }, [token]);
  return { batches, refreshBatches: fetchBatches };
}

function useDepartments(token: string | null, batch?: string) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchDepartments = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = batch ? `/api/students/departments?batch=${encodeURIComponent(batch)}` : '/api/students/departments';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        window.dispatchEvent(new Event('unauthorized'));
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setDepartments(data);
      } else {
        console.error('Departments API did not return an array', data);
      }
    } catch (err) {
      console.error('Failed to fetch departments', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchDepartments(); }, [token, batch]);
  return { departments, loading, refreshDepartments: fetchDepartments };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [view, setView] = useState<'dashboard' | 'mark' | 'students' | 'reports' | 'faculty'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));
      
      // Verify token
      fetch('/api/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => {
        if (res.status === 401) {
          window.dispatchEvent(new Event('unauthorized'));
        }
      }).catch(() => {});
    }
  }, [token]);

  const login = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const result = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        setToken(result.token);
        setUser(result.user);
        
        // Set initial view based on permissions
        if (result.user.role === 'admin' || result.user.permissions?.includes('dashboard')) {
          setView('dashboard');
        } else if (result.user.permissions?.includes('markAttendance')) {
          setView('mark');
        } else if (result.user.permissions?.includes('manageStudents')) {
          setView('students');
        } else if (result.user.permissions?.includes('reports')) {
          setView('reports');
        } else {
          setView('dashboard');
        }
      } else {
        alert(`Authentication Failed: ${result.error || 'Invalid credentials'}`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        alert('Authentication timed out. The server might be struggling to connect to the database. Please check your MongoDB Atlas IP Whitelist (allow 0.0.0.0/0).');
      } else {
        alert('Connection Error: Could not reach the server. Please ensure the backend is running.');
      }
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4 font-serif">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-[#5A5A40]/10"
        >
          <div className="text-center mb-8">
            <div className="bg-[#5A5A40] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <ClipboardCheck className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-[#1a1a1a]">Adhi Attend</h1>
            <p className="text-[#5A5A40]/60 mt-2 italic">Secure Portal for Faculty & Admin</p>
          </div>

          <form onSubmit={login} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#5A5A40] mb-2">Username</label>
              <input 
                name="username"
                required
                className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A5A40] mb-2">Password</label>
              <input 
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-semibold hover:bg-[#4A4A30] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              {!loading && <ChevronRight className="w-4 h-4" />}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-[#5A5A40]/10 text-center">
            <p className="text-xs text-[#5A5A40]/40 uppercase tracking-widest">System v1.0.4</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F5F5F0] flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-[#5A5A40]/10 p-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#5A5A40] p-2 rounded-lg">
            <ClipboardCheck className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-[#1a1a1a]">Adhi Attend</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-[#5A5A40] hover:bg-[#5A5A40]/5 rounded-lg transition-all"
        >
          {isMobileMenuOpen ? <XCircle className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 md:relative md:flex w-64 bg-white border-r border-[#5A5A40]/10 flex-col h-full transition-transform duration-300 ease-in-out pt-20 md:pt-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 border-b border-[#5A5A40]/10 hidden md:block">
          <div className="flex items-center gap-3">
            <div className="bg-[#5A5A40] p-2 rounded-lg">
              <ClipboardCheck className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-[#1a1a1a]">Adhi Attend</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {(user?.role === 'admin' || user?.permissions?.includes('dashboard')) && (
            <NavItem 
              active={view === 'dashboard'} 
              onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }} 
              icon={<LayoutDashboard className="w-5 h-5" />} 
              label="Dashboard" 
            />
          )}
          {(user?.role === 'admin' || user?.permissions?.includes('markAttendance')) && (
            <NavItem 
              active={view === 'mark'} 
              onClick={() => { setView('mark'); setIsMobileMenuOpen(false); }} 
              icon={<CheckCircle2 className="w-5 h-5" />} 
              label="Mark Attendance" 
            />
          )}
          {(user?.role === 'admin' || user?.permissions?.includes('manageStudents')) && (
            <NavItem 
              active={view === 'students'} 
              onClick={() => { setView('students'); setIsMobileMenuOpen(false); }} 
              icon={<Users className="w-5 h-5" />} 
              label="Manage Students" 
            />
          )}
          {user?.role === 'admin' && (
            <NavItem 
              active={view === 'faculty'} 
              onClick={() => { setView('faculty'); setIsMobileMenuOpen(false); }} 
              icon={<UserPlus className="w-5 h-5" />} 
              label="Manage Faculty" 
            />
          )}
          {(user?.role === 'admin' || user?.permissions?.includes('reports')) && (
            <NavItem 
              active={view === 'reports'} 
              onClick={() => { setView('reports'); setIsMobileMenuOpen(false); }} 
              icon={<FileSpreadsheet className="w-5 h-5" />} 
              label="Reports & Export" 
            />
          )}
        </nav>

        <div className="p-4 border-t border-[#5A5A40]/10">
          <div className="bg-[#F5F5F0] p-4 rounded-2xl mb-4">
            <p className="text-xs font-bold text-[#5A5A40]/40 uppercase tracking-wider mb-1">Logged in as</p>
            <p className="font-semibold text-[#1a1a1a] truncate">{user?.name}</p>
            <p className="text-xs text-[#5A5A40] capitalize">{user?.role}</p>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-[#5A5A40] hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (user?.role === 'admin' || user?.permissions?.includes('dashboard')) && <Dashboard user={user} setView={setView} token={token} />}
          {view === 'mark' && (user?.role === 'admin' || user?.permissions?.includes('markAttendance')) && <MarkAttendance token={token!} user={user!} />}
          {view === 'students' && (user?.role === 'admin' || user?.permissions?.includes('manageStudents')) && <ManageStudents token={token!} user={user!} />}
          {view === 'faculty' && user?.role === 'admin' && <ManageFaculty token={token!} />}
          {view === 'reports' && (user?.role === 'admin' || user?.permissions?.includes('reports')) && <Reports token={token!} user={user!} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
        active 
          ? "bg-[#5A5A40] text-white shadow-md" 
          : "text-[#5A5A40] hover:bg-[#5A5A40]/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Dashboard({ user, setView, token }: { user: User | null, setView: (v: any) => void, token: string | null }) {
  const [stats, setStats] = useState({ totalStudents: 0, attendancePercentage: 0, presentCount: 0, absentCount: 0, odCount: 0 });
  const [deptStats, setDeptStats] = useState<Record<string, { departments: Record<string, { present: number, absent: number, od: number, total: number }>, totalStudents: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, deptRes] = await Promise.all([
          fetch('/api/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/stats/department', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (statsRes.ok) setStats(await statsRes.json());
        if (deptRes.ok) setDeptStats(await deptRes.json());
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, user]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#1a1a1a]">Dashboard</h1>
          <p className="text-[#5A5A40]/60 mt-2">Real-time attendance overview across all departments</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-[#5A5A40]/40 uppercase tracking-widest">Current Session</p>
          <p className="text-lg font-medium text-[#5A5A40]">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </header>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="Total Students" 
          value={stats.totalStudents.toLocaleString()} 
          icon={<Users className="w-5 h-5" />} 
        />
        <StatCard 
          title="Avg. Attendance" 
          value={`${stats.attendancePercentage}%`} 
          icon={<ClipboardCheck className="w-5 h-5" />} 
          progress={stats.attendancePercentage}
        />
        <StatCard 
          title="Present Today" 
          value={stats.presentCount.toLocaleString()} 
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} 
          subValue={`+${stats.odCount} OD`}
        />
        <StatCard 
          title="Absentees" 
          value={stats.absentCount.toLocaleString()} 
          icon={<XCircle className="w-5 h-5 text-red-600" />} 
          isWarning={stats.absentCount > 50}
        />
      </div>

      {/* Quick Management Section */}
      <div className="mb-12 pt-8 border-t border-[#5A5A40]/10">
        <h3 className="text-xs font-bold text-[#5A5A40]/40 uppercase tracking-[0.2em] mb-6">Quick Management</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button onClick={() => setView('mark')} className="p-4 bg-white rounded-2xl border border-[#5A5A40]/10 hover:border-[#5A5A40] transition-all flex items-center gap-3 group">
            <div className="p-2 bg-[#5A5A40]/5 rounded-lg group-hover:bg-[#5A5A40] group-hover:text-white transition-all">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-[#5A5A40]">Mark Attendance</span>
          </button>
          <button onClick={() => setView('students')} className="p-4 bg-white rounded-2xl border border-[#5A5A40]/10 hover:border-[#5A5A40] transition-all flex items-center gap-3 group">
            <div className="p-2 bg-[#5A5A40]/5 rounded-lg group-hover:bg-[#5A5A40] group-hover:text-white transition-all">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-[#5A5A40]">Manage Students</span>
          </button>
          <button onClick={() => setView('reports')} className="p-4 bg-white rounded-2xl border border-[#5A5A40]/10 hover:border-[#5A5A40] transition-all flex items-center gap-3 group">
            <div className="p-2 bg-[#5A5A40]/5 rounded-lg group-hover:bg-[#5A5A40] group-hover:text-white transition-all">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-[#5A5A40]">View Reports</span>
          </button>
          <button onClick={() => setView('faculty')} className="p-4 bg-white rounded-2xl border border-[#5A5A40]/10 hover:border-[#5A5A40] transition-all flex items-center gap-3 group">
            <div className="p-2 bg-[#5A5A40]/5 rounded-lg group-hover:bg-[#5A5A40] group-hover:text-white transition-all">
              <UserPlus className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-[#5A5A40]">Faculty Access</span>
          </button>
        </div>
      </div>

      {/* Batch & Department Stats - The Main Focus */}
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold text-[#1a1a1a]">Batch Breakdown</h2>
          <div className="flex gap-4">
             <div className="flex items-center gap-2 text-xs font-bold text-[#5A5A40]/40 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Present
             </div>
             <div className="flex items-center gap-2 text-xs font-bold text-[#5A5A40]/40 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span> OD
             </div>
             <div className="flex items-center gap-2 text-xs font-bold text-[#5A5A40]/40 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Absent
             </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-[#5A5A40]/10" />)}
          </div>
        ) : Object.keys(deptStats).length === 0 ? (
          <div className="bg-white p-20 rounded-3xl border border-dashed border-[#5A5A40]/20 text-center">
            <p className="text-[#5A5A40]/40 italic">No attendance data recorded for today yet.</p>
            <button 
              onClick={() => setView('mark')}
              className="mt-4 text-[#5A5A40] font-bold hover:underline"
            >
              Mark attendance now →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-12">
            {Object.entries(deptStats).sort().map(([batch, data]: [string, any]) => {
              const depts = data.departments || {};
              const batchTotal = data.totalStudents || 0;
              return (
                <section key={batch} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-[#5A5A40]/10"></div>
                    <div className="flex flex-col items-center">
                      <h3 className="text-sm font-bold text-[#5A5A40] uppercase tracking-[0.2em]">Batch {batch}</h3>
                      <span className="text-[10px] font-bold text-[#5A5A40]/40 uppercase tracking-widest mt-0.5">Total Students: {batchTotal}</span>
                    </div>
                    <div className="h-px flex-1 bg-[#5A5A40]/10"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(depts).map(([dept, dStats]: [string, any]) => {
                    const pPerc = dStats.total > 0 ? (dStats.present / dStats.total) * 100 : 0;
                    const aPerc = dStats.total > 0 ? (dStats.absent / dStats.total) * 100 : 0;
                    const odPerc = dStats.total > 0 ? (dStats.od / dStats.total) * 100 : 0;
                    
                    return (
                      <motion.div 
                        key={dept}
                        whileHover={{ y: -4 }}
                        className="bg-white p-6 rounded-3xl shadow-sm border border-[#5A5A40]/10 hover:border-[#5A5A40]/30 transition-all"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h4 className="text-xl font-bold text-[#1a1a1a]">{dept}</h4>
                            <p className="text-xs text-[#5A5A40]/40 font-medium uppercase tracking-wider">Department</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-[#1a1a1a]">{Math.round(pPerc + odPerc)}%</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase">Attendance</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Stacked Progress Bar */}
                          <div className="h-2 w-full bg-[#F5F5F0] rounded-full overflow-hidden flex">
                            <div style={{ width: `${pPerc}%` }} className="h-full bg-emerald-500 transition-all duration-500" />
                            <div style={{ width: `${odPerc}%` }} className="h-full bg-yellow-500 transition-all duration-500" />
                            <div style={{ width: `${aPerc}%` }} className="h-full bg-red-500 transition-all duration-500" />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-[#F5F5F0] p-2 rounded-xl text-center">
                              <p className="text-[10px] font-bold text-[#5A5A40]/40 uppercase">Present</p>
                              <p className="font-bold text-[#1a1a1a]">{dStats.present}</p>
                            </div>
                            <div className="bg-[#F5F5F0] p-2 rounded-xl text-center">
                              <p className="text-[10px] font-bold text-[#5A5A40]/40 uppercase">Absent</p>
                              <p className="font-bold text-[#1a1a1a]">{dStats.absent}</p>
                            </div>
                            <div className="bg-[#F5F5F0] p-2 rounded-xl text-center">
                              <p className="text-[10px] font-bold text-[#5A5A40]/40 uppercase">OD</p>
                              <p className="font-bold text-[#1a1a1a]">{dStats.od}</p>
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t border-[#5A5A40]/5 flex justify-between items-center text-[10px] font-bold text-[#5A5A40]/40 uppercase">
                            <span>Total Strength</span>
                            <span className="text-[#1a1a1a]">{dStats.total}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  </motion.div>
);
}

function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  progress, 
  subValue, 
  isWarning 
}: { 
  title: string, 
  value: string, 
  icon: React.ReactNode, 
  trend?: string, 
  trendUp?: boolean,
  progress?: number,
  subValue?: string,
  isWarning?: boolean
}) {
  return (
    <div className={cn(
      "bg-white p-6 rounded-3xl shadow-sm border transition-all hover:shadow-md",
      isWarning ? "border-red-200 bg-red-50/10" : "border-[#5A5A40]/10"
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-[#F5F5F0] rounded-2xl text-[#5A5A40]">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
            trendUp ? "text-emerald-600" : "text-red-600"
          )}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-[#5A5A40]/40 uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-[#1a1a1a]">{value}</p>
          {subValue && <span className="text-xs font-bold text-[#5A5A40]/60">{subValue}</span>}
        </div>
        {progress !== undefined && (
          <div className="mt-4 h-1.5 w-full bg-[#F5F5F0] rounded-full overflow-hidden">
            <div 
              style={{ width: `${progress}%` }} 
              className={cn(
                "h-full transition-all duration-1000",
                progress > 80 ? "bg-emerald-500" : progress > 60 ? "bg-yellow-500" : "bg-red-500"
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, sub, onClick }: { icon: React.ReactNode, label: string, sub: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-6 bg-[#F5F5F0] rounded-2xl hover:bg-[#5A5A40] hover:text-white transition-all group text-left border border-[#5A5A40]/5"
    >
      <div className="mb-3 text-[#5A5A40] group-hover:text-white transition-colors">
        {icon}
      </div>
      <p className="font-bold">{label}</p>
      <p className="text-xs opacity-60">{sub}</p>
    </button>
  );
}

function MarkAttendance({ token, user }: { token: string, user: User }) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({ batch: '', department: (user.department && user.department !== 'Placement') ? user.department : '', type: '' });
  const [customType, setCustomType] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: 'P' | 'A' | 'OD', reason?: string }>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [existingAttendanceMessage, setExistingAttendanceMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { types, loading: loadingTypes } = useAttendanceTypes(token);
  const { batches } = useBatches(token);
  const { departments, loading: loadingDepts } = useDepartments(token, config.batch);

  useEffect(() => {
    // If the selected department is not in the filtered departments list, reset it
    // unless the user is a coordinator (who has a fixed department)
    if (!loadingDepts && config.batch && config.department && (!user.department || user.department === 'Placement')) {
      if (!departments.includes(config.department)) {
        setConfig(prev => ({ ...prev, department: '' }));
      }
    }
  }, [departments, loadingDepts, config.batch, user.department, config.department]);

  useEffect(() => {
    console.log("Attendance state changed:", attendance);
  }, [attendance]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const type = config.type === 'Others' ? customType : config.type;
      const date = new Date().toISOString().split('T')[0];
      console.log("Fetching students, checking attendance:", { type, batch: config.batch, department: config.department, date });
      const checkRes = await fetch(`/api/attendance/session/check?type=${encodeURIComponent(type)}&batch=${config.batch}&department=${encodeURIComponent(config.department)}&date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const checkData = await checkRes.json();
      console.log("Check data:", checkData);
      
      const res = await fetch(`/api/students?batch=${config.batch}&department=${encodeURIComponent(config.department)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        window.dispatchEvent(new Event('unauthorized'));
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudents(data);
        console.log("Check data exists:", checkData.exists);
        if (checkData.exists) {
          setSessionId(checkData.sessionId);
          setExistingAttendanceMessage('Attendance already exists for today. You can edit and update it.');
          const initial: Record<string, { status: 'P' | 'A' | 'OD', reason?: string }> = {};
          checkData.records.forEach((r: any) => {
            initial[r.studentId] = { status: r.status, reason: r.reason };
          });
          console.log("Setting initial attendance:", initial);
          setAttendance(initial);
        } else {
          setSessionId(null);
          setExistingAttendanceMessage(null);
          setAttendance({});
        }
      } else {
        console.error('Students API did not return an array', data);
        setStudents([]);
      }
      setStep(2);
    } catch (err) {
      console.error("Error in fetchStudents:", err);
      alert('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const submitAttendance = async () => {
    setLoading(true);
    const records = students.map(s => {
      const val = attendance[s._id];
      return {
        studentId: s._id,
        status: val?.status || 'A',
        reason: val?.reason
      };
    });

    try {
      const res = await fetch('/api/attendance/session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          ...config, 
          type: config.type === 'Others' ? customType : config.type,
          records,
          sessionId
        }),
      });
      if (res.ok) {
        alert('Attendance marked successfully!');
        setStep(1);
        setConfig({ batch: '', department: user.department || '', type: '' });
        setCustomType('');
        setSessionId(null);
      } else {
        alert('Failed to save attendance');
      }
    } catch (err) {
      alert('Error submitting attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1a1a1a]">Mark Attendance</h1>
          <p className="text-[#5A5A40]/60 text-sm sm:text-base">Step {step} of 2: {step === 1 ? 'Configure Session' : 'Mark Students'}</p>
        </div>
        {step === 2 && (
          <button 
            onClick={() => setStep(1)}
            className="text-[#5A5A40] hover:underline flex items-center gap-1 text-sm"
          >
            ← Change Configuration
          </button>
        )}
      </div>

      {step === 1 ? (
        <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-sm border border-[#5A5A40]/10 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#5A5A40] mb-2">Attendance Type</label>
              <select 
                value={config.type}
                onChange={e => setConfig({...config, type: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
              >
                <option value="">Select Type</option>
                {types.map(t => <option key={t._id} value={t.name}>{t.name}</option>)}
                <option value="Others">Others (Specify...)</option>
              </select>
            </div>
            {config.type === 'Others' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="block text-sm font-medium text-[#5A5A40] mb-2">Specify Attendance Type</label>
                <input 
                  type="text"
                  value={customType}
                  onChange={e => setCustomType(e.target.value)}
                  placeholder="Enter custom attendance type..."
                  className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                />
              </motion.div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#5A5A40] mb-2">Batch</label>
                <select 
                  value={config.batch}
                  onChange={e => setConfig({...config, batch: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                >
                  <option value="">Select Batch</option>
                  {batches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5A5A40] mb-2">Department</label>
                <select 
                  value={config.department}
                  onChange={e => setConfig({...config, department: e.target.value})}
                  disabled={!!user.department && user.department !== 'Placement'}
                  className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40] disabled:opacity-50 disabled:bg-gray-100"
                >
                  <option value="">Select Dept</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <button 
              disabled={!config.batch || !config.department || !config.type || (config.type === 'Others' && !customType) || loading}
              onClick={fetchStudents}
              className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-[#4A4A30] transition-all disabled:opacity-50"
            >
              {loading ? 'Loading Students...' : 'Start Marking Attendance'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {existingAttendanceMessage && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-medium">
              {existingAttendanceMessage}
            </div>
          )}
          <div className="bg-white rounded-3xl shadow-sm border border-[#5A5A40]/10 overflow-hidden">
            <div className="hidden sm:block">
              <table className="w-full text-left border-collapse">
              <thead className="bg-[#F5F5F0]">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider">Student Details</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider">Reason (Optional)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#5A5A40]/10">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-[#5A5A40]/40 italic">
                      No students found for this batch and department. 
                      Please add students in the "Manage Students" section first.
                    </td>
                  </tr>
                ) : students.map(student => (
                  <tr key={student._id} className="hover:bg-[#F5F5F0]/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#1a1a1a]">{student.name}</p>
                      <p className="text-xs text-[#5A5A40]/60">{student.rollNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <StatusBtn 
                          active={attendance[student._id]?.status === 'P'} 
                          onClick={() => setAttendance({...attendance, [student._id]: { status: 'P' }})}
                          color="emerald"
                          label="P"
                        />
                        <StatusBtn 
                          active={attendance[student._id]?.status === 'A'} 
                          onClick={() => setAttendance({...attendance, [student._id]: { status: 'A' }})}
                          color="red"
                          label="A"
                        />
                        <StatusBtn 
                          active={attendance[student._id]?.status === 'OD'} 
                          onClick={() => setAttendance({...attendance, [student._id]: { status: 'OD', reason: attendance[student._id]?.reason }})}
                          color="amber"
                          label="OD"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {attendance[student._id]?.status === 'OD' && (
                        <input 
                          placeholder="Enter reason..."
                          value={attendance[student._id]?.reason || ''}
                          onChange={e => setAttendance({...attendance, [student._id]: { ...attendance[student._id], reason: e.target.value }})}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#5A5A40]/20 outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden divide-y divide-[#5A5A40]/10">
            {students.length === 0 ? (
              <div className="p-8 text-center text-[#5A5A40]/40 italic">
                No students found for this batch and department.
              </div>
            ) : students.map(student => (
              <div key={student._id} className="p-5 space-y-4 bg-white hover:bg-[#F5F5F0]/20 transition-colors">
                <div className="flex flex-col gap-1">
                  <p className="font-bold text-lg text-[#1a1a1a]">{student.name}</p>
                  <p className="text-sm text-[#5A5A40]/60 font-mono">{student.rollNumber}</p>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-[#5A5A40]/40 uppercase tracking-widest">Attendance Status</span>
                  <div className="flex gap-3">
                    <StatusBtn 
                      active={attendance[student._id]?.status === 'P'} 
                      onClick={() => setAttendance({...attendance, [student._id]: { status: 'P' }})}
                      color="emerald"
                      label="P"
                    />
                    <StatusBtn 
                      active={attendance[student._id]?.status === 'A'} 
                      onClick={() => setAttendance({...attendance, [student._id]: { status: 'A' }})}
                      color="red"
                      label="A"
                    />
                    <StatusBtn 
                      active={attendance[student._id]?.status === 'OD'} 
                      onClick={() => setAttendance({...attendance, [student._id]: { status: 'OD', reason: attendance[student._id]?.reason }})}
                      color="amber"
                      label="OD"
                    />
                  </div>
                </div>

                {attendance[student._id]?.status === 'OD' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-2"
                  >
                    <label className="block text-[10px] font-bold text-[#5A5A40]/40 uppercase tracking-widest mb-1 ml-1">Reason for OD</label>
                    <input 
                      placeholder="Enter specific reason..."
                      value={attendance[student._id]?.reason || ''}
                      onChange={e => setAttendance({...attendance, [student._id]: { ...attendance[student._id], reason: e.target.value }})}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-all"
                    />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
          <div className="flex justify-end gap-4">
            <button 
              onClick={() => setStep(1)}
              className="px-8 py-3 rounded-xl font-bold text-[#5A5A40] hover:bg-[#5A5A40]/5 transition-all"
            >
              Cancel
            </button>
            <button 
              disabled={loading}
              onClick={submitAttendance}
              className="px-12 py-3 bg-[#5A5A40] text-white rounded-xl font-bold shadow-lg hover:bg-[#4A4A30] transition-all flex items-center gap-2"
            >
              {loading ? 'Saving...' : 'Submit Attendance'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function StatusBtn({ active, onClick, color, label }: { active: boolean, onClick: () => void, color: 'emerald' | 'red' | 'amber', label: string }) {
  const colors = {
    emerald: active ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
    red: active ? 'bg-red-600 text-white shadow-md' : 'bg-red-50 text-red-600 hover:bg-red-100',
    amber: active ? 'bg-amber-600 text-white shadow-md' : 'bg-amber-50 text-amber-600 hover:bg-amber-100',
  };

  return (
    <button 
      onClick={onClick}
      className={cn("w-10 h-10 rounded-xl font-bold transition-all", colors[color])}
    >
      {label}
    </button>
  );
}

function ManageAttendanceTypes({ token, onClose }: { token: string, onClose: () => void }) {
  const { types, loading, refreshTypes } = useAttendanceTypes(token);
  const [newName, setNewName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName.trim() })
      });
      if (res.ok) {
        setNewName('');
        refreshTypes();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      alert('Failed to add type');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance type?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/attendance-types/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        refreshTypes();
      }
    } catch (err) {
      alert('Failed to delete type');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-serif font-bold">Attendance Types</h2>
          <button onClick={onClose} className="text-[#5A5A40]/40 hover:text-[#5A5A40] transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input 
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New class/type name..."
            className="flex-1 px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
          />
          <button 
            disabled={actionLoading || !newName.trim()}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50"
          >
            Add
          </button>
        </form>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <p className="text-center text-[#5A5A40]/40 py-4">Loading...</p>
          ) : types.length === 0 ? (
            <p className="text-center text-[#5A5A40]/40 py-4">No types added yet</p>
          ) : types.map(t => (
            <div key={t._id} className="flex justify-between items-center p-3 bg-[#F5F5F0] rounded-xl group">
              <span className="font-medium text-[#1a1a1a]">{t.name}</span>
              <button 
                onClick={() => handleDelete(t._id)}
                className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ManageFaculty({ token }: { token: string }) {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showManageTypes, setShowManageTypes] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<any | null>(null);
  const [facultyToDelete, setFacultyToDelete] = useState<any | null>(null);
  
  const [addRole, setAddRole] = useState('coordinator');
  const [editRole, setEditRole] = useState('coordinator');
  const [addPermissions, setAddPermissions] = useState<string[]>(['dashboard', 'markAttendance', 'manageStudents', 'reports']);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (editingFaculty) {
      setEditPermissions(editingFaculty.permissions || []);
    }
  }, [editingFaculty]);

  const fetchFaculties = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        window.dispatchEvent(new Event('unauthorized'));
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setFaculties(data);
      } else {
        console.error('Faculties API did not return an array', data);
        setFaculties([]);
      }
    } catch (err) {
      alert('Failed to fetch faculty list');
      setFaculties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  const addFaculty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    if (data.role === 'admin') {
      data.department = '';
    }
    
    const payload = {
      ...data,
      permissions: addPermissions
    };
    
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowAdd(false);
        fetchFaculties();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      alert('Failed to add faculty');
    } finally {
      setLoading(false);
    }
  };

  const updateFaculty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingFaculty) return;

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    if (data.role === 'admin') {
      data.department = '';
    }
    
    const payload = {
      ...data,
      permissions: editPermissions
    };
    
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${editingFaculty._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingFaculty(null);
        fetchFaculties();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      alert('Failed to update faculty');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteFaculty = async () => {
    if (!facultyToDelete) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${facultyToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFacultyToDelete(null);
        fetchFaculties();
      } else {
        alert('Failed to delete faculty');
      }
    } catch (err) {
      alert('Error deleting faculty');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1a1a1a]">Faculty Management</h1>
          <p className="text-[#5A5A40]/60">Manage system users and coordinators</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowManageTypes(true)}
            className="bg-white text-[#5A5A40] border border-[#5A5A40]/20 px-6 py-2 rounded-xl flex items-center gap-2 shadow-sm hover:bg-[#F5F5F0] transition-all text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            Attendance Types
          </button>
          <button 
            onClick={() => {
              setAddRole('coordinator');
              setShowAdd(true);
            }}
            className="bg-[#5A5A40] text-white px-6 py-2 rounded-xl flex items-center gap-2 shadow-md hover:bg-[#4A4A30] transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Faculty
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-[#5A5A40]/10 overflow-hidden">
        <div className="hidden sm:block">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F5F5F0]">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#5A5A40]/10">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#5A5A40]/40">Loading faculty...</td></tr>
              ) : faculties.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#5A5A40]/40">No faculty found</td></tr>
              ) : faculties.map(f => (
                <tr key={f._id} className="hover:bg-[#F5F5F0]/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#1a1a1a]">{f.name}</td>
                  <td className="px-6 py-4 text-[#5A5A40]">{f.username}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      f.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {f.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#5A5A40]">{f.department || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditRole(f.role);
                          setEditingFaculty(f);
                        }}
                        className="p-2 text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {f.username !== 'Admin' && (
                        <button 
                          onClick={() => setFacultyToDelete(f)}
                          className="p-2 text-red-500 hover:bg-red-50/50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-[#5A5A40]/10">
          {loading ? (
            <div className="p-8 text-center text-[#5A5A40]/40">Loading faculty...</div>
          ) : faculties.length === 0 ? (
            <div className="p-8 text-center text-[#5A5A40]/40">No faculty found</div>
          ) : faculties.map(f => (
            <div key={f._id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-[#1a1a1a]">{f.name}</p>
                  <p className="text-xs text-[#5A5A40]/60">@{f.username}</p>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  f.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                )}>
                  {f.role}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <p className="text-xs text-[#5A5A40]/80">Dept: <span className="font-semibold">{f.department || '-'}</span></p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditRole(f.role);
                      setEditingFaculty(f);
                    }}
                    className="p-2 text-[#5A5A40] bg-[#5A5A40]/5 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {f.username !== 'Admin' && (
                    <button 
                      onClick={() => setFacultyToDelete(f)}
                      className="p-2 text-red-500 bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showManageTypes && (
          <ManageAttendanceTypes token={token} onClose={() => setShowManageTypes(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md my-8"
            >
              <h2 className="text-2xl font-serif font-bold mb-6">Add New Faculty</h2>
              <form onSubmit={addFaculty} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Full Name</label>
                  <input name="name" required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Username</label>
                  <input name="username" required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Password</label>
                  <input name="password" type="password" required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Role</label>
                  <select 
                    name="role" 
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    required 
                    className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  >
                    <option value="coordinator">Faculty Coordinator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {addRole === 'coordinator' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#5A5A40] mb-1">Department</label>
                      <select name="department" required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]">
                        <option value="">Select Department</option>
                        {FACULTY_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="pt-2">
                      <label className="block text-sm font-medium text-[#5A5A40] mb-2">Access Permissions</label>
                      <div className="grid grid-cols-2 gap-2">
                        {AVAILABLE_PERMISSIONS.map(p => (
                          <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg border border-[#5A5A40]/10 hover:bg-[#F5F5F0] cursor-pointer transition-all">
                            <input 
                              type="checkbox" 
                              checked={addPermissions.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAddPermissions([...addPermissions, p.id]);
                                } else {
                                  setAddPermissions(addPermissions.filter(id => id !== p.id));
                                }
                              }}
                              className="rounded border-[#5A5A40]/30 text-[#5A5A40] focus:ring-[#5A5A40]" 
                            />
                            <span className="text-xs font-medium text-[#5A5A40]">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-all">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-[#5A5A40] text-white rounded-xl font-bold shadow-lg hover:bg-[#4A4A30] transition-all">
                    {loading ? 'Adding...' : 'Save Faculty'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingFaculty && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md my-8"
            >
              <h2 className="text-2xl font-serif font-bold mb-6">Edit Faculty</h2>
              <form onSubmit={updateFaculty} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Full Name</label>
                  <input name="name" defaultValue={editingFaculty.name} required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Username</label>
                  <input name="username" defaultValue={editingFaculty.username} required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Password (Leave blank to keep current)</label>
                  <input name="password" type="password" className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Role</label>
                  <select 
                    name="role" 
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    required 
                    className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  >
                    <option value="coordinator">Faculty Coordinator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {editRole === 'coordinator' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#5A5A40] mb-1">Department</label>
                      <select name="department" defaultValue={editingFaculty.department || ''} required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]">
                        <option value="">Select Department</option>
                        {FACULTY_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="pt-2">
                      <label className="block text-sm font-medium text-[#5A5A40] mb-2">Access Permissions</label>
                      <div className="grid grid-cols-2 gap-2">
                        {AVAILABLE_PERMISSIONS.map(p => (
                          <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg border border-[#5A5A40]/10 hover:bg-[#F5F5F0] cursor-pointer transition-all">
                            <input 
                              type="checkbox" 
                              checked={editPermissions.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditPermissions([...editPermissions, p.id]);
                                } else {
                                  setEditPermissions(editPermissions.filter(id => id !== p.id));
                                }
                              }}
                              className="rounded border-[#5A5A40]/30 text-[#5A5A40] focus:ring-[#5A5A40]" 
                            />
                            <span className="text-xs font-medium text-[#5A5A40]">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingFaculty(null)} className="flex-1 py-3 rounded-xl font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-all">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-[#5A5A40] text-white rounded-xl font-bold shadow-lg hover:bg-[#4A4A30] transition-all">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {facultyToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-2">Delete Faculty?</h2>
              <p className="text-[#5A5A40]/80 mb-6">
                Are you sure you want to delete <strong>{facultyToDelete.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setFacultyToDelete(null)} 
                  className="flex-1 py-3 rounded-xl font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={confirmDeleteFaculty} 
                  disabled={loading} 
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ManageStudents({ token, user }: { token: string, user: User }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [filters, setFilters] = useState({ batch: '', department: (user.department && user.department !== 'Placement') ? user.department : '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[] | null>(null);
  const [bulkDuplicates, setBulkDuplicates] = useState<any[] | null>(null);
  const { batches, refreshBatches } = useBatches(token);
  const { departments, loading: loadingDepts, refreshDepartments } = useDepartments(token, filters.batch);

  const isCoordinator = user.role === 'coordinator';

  useEffect(() => {
    if (!loadingDepts && filters.batch && filters.department && (!user.department || user.department === 'Placement')) {
      if (!departments.includes(filters.department)) {
        setFilters(prev => ({ ...prev, department: '' }));
      }
    }
  }, [departments, loadingDepts, filters.batch, user.department, filters.department]);

  const fetchStudents = async () => {
    if (!filters.batch || !filters.department) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/students?batch=${filters.batch}&department=${encodeURIComponent(filters.department)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        window.dispatchEvent(new Event('unauthorized'));
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudents(data);
      } else {
        console.error('Students API did not return an array', data);
        setStudents([]);
      }
    } catch (err) {
      alert('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [filters.batch, filters.department]);

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setBulkFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setBulkPreview(data);
      } catch (err) {
        alert('Error parsing Excel file');
        setBulkFile(null);
        setBulkPreview(null);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const finalizeBulkUpload = async () => {
    if (!bulkFile) return;
    const formData = new FormData();
    formData.append('file', bulkFile);

    setLoading(true);
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.duplicates && data.duplicates.length > 0) {
          setBulkDuplicates(data.duplicates);
        } else {
          alert('Bulk upload successful');
        }
        setBulkFile(null);
        setBulkPreview(null);
        fetchStudents();
        refreshBatches();
        refreshDepartments();
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      alert('Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStudentToDelete(null);
        setSelectedStudents(prev => prev.filter(id => id !== studentToDelete._id));
        fetchStudents();
        refreshBatches();
      } else {
        alert('Failed to delete student');
      }
    } catch (err) {
      alert('Error deleting student');
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = (student: Student) => {
    setStudentToDelete(student);
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/students/bulk-delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ ids: selectedStudents })
      });
      if (res.ok) {
        setSelectedStudents([]);
        setShowBulkDeleteConfirm(false);
        fetchStudents();
        refreshBatches();
      } else {
        alert('Failed to delete students');
      }
    } catch (err) {
      alert('Error deleting students');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedStudents.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s._id));
    }
  };

  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.rollNumber.toLowerCase().includes(query) ||
      student.batch.toLowerCase().includes(query) ||
      student.department.toLowerCase().includes(query)
    );
  });

  const updateStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStudent) return;
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${editingStudent._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingStudent(null);
        fetchStudents();
        refreshBatches();
        refreshDepartments();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      alert('Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    setLoading(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowAdd(false);
        fetchStudents();
        refreshBatches();
        refreshDepartments();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      alert('Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1a1a1a]">Student Management</h1>
          <div className="flex items-center gap-2 text-sm text-[#5A5A40]/60 mt-1">
            <button 
              onClick={() => setFilters({ batch: '', department: user.department || '' })}
              className="hover:text-[#5A5A40] transition-colors"
            >
              All Batches
            </button>
            {filters.batch && (
              <>
                <ChevronRight className="w-3 h-3" />
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, department: user.department || '' }))}
                  className="hover:text-[#5A5A40] transition-colors"
                >
                  {filters.batch}
                </button>
              </>
            )}
            {filters.department && !isCoordinator && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="font-medium text-[#5A5A40]">{filters.department}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={async () => {
              try {
                const res = await fetch('/api/students/template', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'student_upload_template.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
              } catch (err) {
                alert('Failed to download template');
              }
            }}
            className="bg-white border border-[#5A5A40]/20 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#F5F5F0] transition-all text-sm font-medium text-[#5A5A40]"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <label className="bg-white border border-[#5A5A40]/20 px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-[#F5F5F0] transition-all text-sm font-medium">
            <Upload className="w-4 h-4" />
            Bulk Upload
            <input type="file" className="hidden" onChange={handleBulkUpload} accept=".xlsx,.xls" />
          </label>
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-[#5A5A40] text-white px-6 py-2 rounded-xl flex items-center gap-2 shadow-md hover:bg-[#4A4A30] transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation & Search */}
      <div className="flex items-center gap-4 mb-6">
        {(filters.batch || (filters.department && (user.role === 'admin' || user.department === 'Placement'))) && (
          <button 
            onClick={() => {
              if (filters.department && (user.role === 'admin' || user.department === 'Placement')) {
                setFilters(prev => ({ ...prev, department: '' }));
              } else {
                setFilters({ batch: '', department: (user.department && user.department !== 'Placement') ? user.department : '' });
              }
            }}
            className="p-2 hover:bg-[#5A5A40]/10 rounded-full transition-all text-[#5A5A40]"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
          <input 
            type="text" 
            placeholder="Search students..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40] bg-white shadow-sm"
          />
        </div>
      </div>

      {!filters.batch ? (
        /* Batch Selection Level */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.length === 0 ? (
            <div className="col-span-full p-12 text-center text-[#5A5A40]/40 italic bg-white rounded-3xl border border-dashed border-[#5A5A40]/20">
              No batches found. Add a student to create a batch.
            </div>
          ) : batches.map(batch => (
            <motion.button
              key={batch}
              whileHover={{ scale: 1.02, y: -4 }}
              onClick={() => setFilters(prev => ({ ...prev, batch }))}
              className="bg-white p-6 rounded-3xl shadow-sm border border-[#5A5A40]/10 flex items-center gap-4 text-left hover:border-[#5A5A40]/30 transition-all group"
            >
              <div className="w-12 h-12 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center text-[#5A5A40] group-hover:bg-[#5A5A40] group-hover:text-white transition-all">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-[#1a1a1a]">{batch}</h3>
                <p className="text-xs text-[#5A5A40]/60">Click to view departments</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-[#5A5A40]/20 group-hover:text-[#5A5A40] transition-all" />
            </motion.button>
          ))}
        </div>
      ) : !filters.department ? (
        /* Department Selection Level */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingDepts ? (
            <div className="col-span-full p-12 text-center text-[#5A5A40]/40 italic">Loading departments...</div>
          ) : departments.length === 0 ? (
            <div className="col-span-full p-12 text-center text-[#5A5A40]/40 italic bg-white rounded-3xl border border-dashed border-[#5A5A40]/20">
              No departments found in this batch.
            </div>
          ) : departments.map(dept => (
            <motion.button
              key={dept}
              whileHover={{ scale: 1.02, y: -4 }}
              onClick={() => setFilters(prev => ({ ...prev, department: dept }))}
              className="bg-white p-6 rounded-3xl shadow-sm border border-[#5A5A40]/10 flex items-center gap-4 text-left hover:border-[#5A5A40]/30 transition-all group"
            >
              <div className="w-12 h-12 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center text-[#5A5A40] group-hover:bg-[#5A5A40] group-hover:text-white transition-all">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-[#1a1a1a]">{dept}</h3>
                <p className="text-xs text-[#5A5A40]/60">Click to view students</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-[#5A5A40]/20 group-hover:text-[#5A5A40] transition-all" />
            </motion.button>
          ))}
        </div>
      ) : (
        /* Student List Level */
        <>
          {selectedStudents.length > 0 && (
            <div className="bg-[#5A5A40]/10 p-4 rounded-xl mb-6 flex items-center justify-between">
              <span className="font-medium text-[#5A5A40]">{selectedStudents.length} students selected</span>
              <button 
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-600 transition-all text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-[#5A5A40]/10 overflow-hidden">
            <div className="hidden sm:block">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F5F5F0]">
                  <tr>
                    <th className="px-6 py-4 w-12">
                      <input 
                        type="checkbox" 
                        checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                        onChange={toggleAllSelection}
                        className="w-4 h-4 rounded border-[#5A5A40]/20 text-[#5A5A40] focus:ring-[#5A5A40]"
                      />
                    </th>
                    <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider">Roll Number</th>
                    <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#5A5A40]/10">
                  {loading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-[#5A5A40]/40">Loading students...</td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-[#5A5A40]/40 italic">
                        No students found in this department.
                      </td>
                    </tr>
                  ) : filteredStudents.map(student => (
                    <tr key={student._id} className={cn("hover:bg-[#F5F5F0]/30 transition-colors", selectedStudents.includes(student._id) && "bg-[#5A5A40]/5")}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedStudents.includes(student._id)}
                          onChange={() => toggleStudentSelection(student._id)}
                          className="w-4 h-4 rounded border-[#5A5A40]/20 text-[#5A5A40] focus:ring-[#5A5A40]"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#5A5A40]/10 rounded-full flex items-center justify-center text-[#5A5A40] text-xs font-bold">
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-medium text-[#1a1a1a]">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#5A5A40]">{student.rollNumber}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setEditingStudent(student)}
                            className="p-2 text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setStudentToDelete(student)}
                            className="p-2 text-red-500 hover:bg-red-50/50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-[#5A5A40]/10">
              {loading ? (
                <div className="p-8 text-center text-[#5A5A40]/40">Loading students...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-[#5A5A40]/40 italic">No students found</div>
              ) : filteredStudents.map(student => (
                <div key={student._id} className={cn("p-4 space-y-3", selectedStudents.includes(student._id) && "bg-[#5A5A40]/5")}>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <input 
                        type="checkbox" 
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => toggleStudentSelection(student._id)}
                        className="w-5 h-5 mt-1 rounded border-[#5A5A40]/20 text-[#5A5A40] focus:ring-[#5A5A40]"
                      />
                      <div>
                        <p className="font-bold text-[#1a1a1a]">{student.name}</p>
                        <p className="text-xs text-[#5A5A40]/60 font-mono">{student.rollNumber}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setEditingStudent(student)}
                        className="p-2 text-[#5A5A40] bg-[#5A5A40]/5 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setStudentToDelete(student)}
                        className="p-2 text-red-500 bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
            >
              <h2 className="text-2xl font-serif font-bold mb-6">Add New Student</h2>
              <form onSubmit={addStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Full Name</label>
                  <input name="name" required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Roll Number</label>
                  <input name="rollNumber" required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5A5A40] mb-1">Batch</label>
                    <input name="batch" defaultValue={filters.batch} required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" placeholder="e.g. 2021" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5A5A40] mb-1">Department</label>
                    <select name="department" defaultValue={filters.department} required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]">
                      <option value="">Select Department</option>
                      {filters.department && !STUDENT_DEPARTMENTS.includes(filters.department) && (
                        <option value={filters.department}>{filters.department}</option>
                      )}
                      {STUDENT_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-all">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-[#5A5A40] text-white rounded-xl font-bold shadow-lg hover:bg-[#4A4A30] transition-all">
                    {loading ? 'Adding...' : 'Save Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
            >
              <h2 className="text-2xl font-serif font-bold mb-6">Edit Student</h2>
              <form onSubmit={updateStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Full Name</label>
                  <input name="name" defaultValue={editingStudent.name} required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Roll Number</label>
                  <input name="rollNumber" defaultValue={editingStudent.rollNumber} required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5A5A40] mb-1">Batch</label>
                    <input name="batch" defaultValue={editingStudent.batch} required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" placeholder="e.g. 2021" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5A5A40] mb-1">Department</label>
                    <select name="department" defaultValue={editingStudent.department} required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]">
                      <option value="">Select Department</option>
                      {editingStudent.department && !STUDENT_DEPARTMENTS.includes(editingStudent.department) && (
                        <option value={editingStudent.department}>{editingStudent.department}</option>
                      )}
                      {STUDENT_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 py-3 rounded-xl font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-all">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-[#5A5A40] text-white rounded-xl font-bold shadow-lg hover:bg-[#4A4A30] transition-all">
                    {loading ? 'Updating...' : 'Update Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {studentToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-2">Delete Student?</h2>
              <p className="text-[#5A5A40]/80 mb-6">
                Are you sure you want to delete <strong>{studentToDelete.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setStudentToDelete(null)} 
                  className="flex-1 py-3 rounded-xl font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={confirmDelete} 
                  disabled={loading} 
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-2">Delete Multiple Students?</h2>
              <p className="text-[#5A5A40]/80 mb-6">
                Are you sure you want to delete <strong>{selectedStudents.length}</strong> selected students? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowBulkDeleteConfirm(false)} 
                  className="flex-1 py-3 rounded-xl font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleBulkDelete} 
                  disabled={loading} 
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Preview Modal */}
      <AnimatePresence>
        {bulkPreview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <h2 className="text-2xl font-serif font-bold mb-2">Preview Bulk Upload</h2>
              <p className="text-[#5A5A40]/60 mb-6">Review the students before finalizing the upload. ({bulkPreview.length} students found)</p>
              
              <div className="flex-1 overflow-auto border border-[#5A5A40]/10 rounded-xl mb-6">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F5F5F0] sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-sm font-bold text-[#5A5A40] uppercase">Name</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#5A5A40] uppercase">Roll Number</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#5A5A40] uppercase">Batch</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#5A5A40] uppercase">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#5A5A40]/10">
                    {bulkPreview.slice(0, 100).map((student, idx) => (
                      <tr key={idx} className="hover:bg-[#F5F5F0]/30">
                        <td className="px-4 py-3 text-sm">{student.Username || student.username || student.Name || student.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{student['Register N'] || student['Register Number'] || student.RegisterNumber || student.RollNumber || student.rollNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{student.Batch || student.batch || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{student.Department || student.department || 'N/A'}</td>
                      </tr>
                    ))}
                    {bulkPreview.length > 100 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm text-center text-[#5A5A40]/60 italic">
                          ... and {bulkPreview.length - 100} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => { setBulkPreview(null); setBulkFile(null); }} 
                  className="px-6 py-3 rounded-xl font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={finalizeBulkUpload} 
                  disabled={loading} 
                  className="px-6 py-3 bg-[#5A5A40] text-white rounded-xl font-bold shadow-lg hover:bg-[#4A4A30] transition-all flex items-center gap-2"
                >
                  {loading ? 'Uploading...' : 'Finalize Upload'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Duplicates Modal */}
      <AnimatePresence>
        {bulkDuplicates && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <h2 className="text-2xl font-serif font-bold mb-2 text-red-600">Upload Completed with Duplicates</h2>
              <p className="text-[#5A5A40]/60 mb-6">
                The upload was successful, but {bulkDuplicates.length} student(s) were skipped because their register numbers already exist in the database or were duplicated in the file.
              </p>
              
              <div className="flex-1 overflow-auto border border-[#5A5A40]/10 rounded-xl mb-6">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F5F5F0] sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-sm font-bold text-[#5A5A40] uppercase">Name</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#5A5A40] uppercase">Roll Number</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#5A5A40] uppercase">Batch</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#5A5A40] uppercase">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#5A5A40]/10">
                    {bulkDuplicates.slice(0, 100).map((student, idx) => (
                      <tr key={idx} className="hover:bg-red-50/50">
                        <td className="px-4 py-3 text-sm">{student.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-red-600">{student.rollNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{student.batch || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{student.department || 'N/A'}</td>
                      </tr>
                    ))}
                    {bulkDuplicates.length > 100 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm text-center text-[#5A5A40]/60 italic">
                          ... and {bulkDuplicates.length - 100} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setBulkDuplicates(null)} 
                  className="px-6 py-3 bg-[#5A5A40] text-white rounded-xl font-bold shadow-lg hover:bg-[#4A4A30] transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Reports({ token, user }: { token: string, user: User }) {
  const [filters, setFilters] = useState({ startDate: '', endDate: '', batch: '', department: (user.department && user.department !== 'Placement') ? user.department : '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  
  const { types } = useAttendanceTypes(token);
  const { batches } = useBatches(token);
  const { departments, loading: loadingDepts } = useDepartments(token, filters.batch);

  useEffect(() => {
    if (!loadingDepts && filters.batch && filters.department && (!user.department || user.department === 'Placement')) {
      if (!departments.includes(filters.department)) {
        setFilters(prev => ({ ...prev, department: '' }));
      }
    }
  }, [departments, loadingDepts, filters.batch, user.department, filters.department]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const res = await fetch(`/api/attendance/reports?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        window.dispatchEvent(new Event('unauthorized'));
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        data.sort((a: any, b: any) => {
          const dateA = new Date(a.sessionId?.date || 0).getTime();
          const dateB = new Date(b.sessionId?.date || 0).getTime();
          if (dateB !== dateA) return dateB - dateA; // Date descending

          const rollA = a.studentId?.rollNumber || '';
          const rollB = b.studentId?.rollNumber || '';
          return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setRecords(data);
      } else {
        console.error('Reports API did not return an array', data);
        setRecords([]);
      }
    } catch (err) {
      alert('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredRecords = records.filter(record => {
    const search = searchTerm.toLowerCase();
    const name = (record.studentId?.name || '').toLowerCase();
    const roll = (record.studentId?.rollNumber || '').toLowerCase();
    const session = (record.sessionId?.type || '').toLowerCase();
    return name.includes(search) || roll.includes(search) || session.includes(search);
  });

  const updateRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRecord) return;
    
    const formData = new FormData(e.currentTarget);
    const status = formData.get('status') as string;
    const reason = formData.get('reason') as string;

    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/records/${editingRecord._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status, reason })
      });
      if (res.ok) {
        setEditingRecord(null);
        fetchReports();
      } else {
        alert('Failed to update record');
      }
    } catch (err) {
      alert('Error updating record');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    const params = new URLSearchParams(filters);
    // Note: In a real app, we'd handle token better for downloads, but for this demo, we can append it or use a temporary download link
    // For simplicity, let's use a fetch and blob approach
    try {
      const res = await fetch(`/api/attendance/export?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance_Report_${new Date().toLocaleDateString()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Download failed');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1a1a1a]">Attendance Reports</h1>
          <p className="text-sm sm:text-base text-[#5A5A40]/60">View and export attendance history</p>
        </div>
        <button 
          onClick={downloadExcel}
          disabled={records.length === 0}
          className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-emerald-700 transition-all text-sm font-medium disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Download Excel
        </button>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-[#5A5A40]/10 mb-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1.5">Start Date</label>
            <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="w-full px-3 py-2 text-sm rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1.5">End Date</label>
            <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="w-full px-3 py-2 text-sm rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1.5">Batch</label>
            <select 
              value={filters.batch}
              onChange={e => setFilters({...filters, batch: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
            >
              <option value="">All Batches</option>
              {batches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1.5">Dept</label>
            <select value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})} disabled={!!user.department && user.department !== 'Placement'} className="w-full px-3 py-2 text-sm rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40] disabled:opacity-50 disabled:bg-gray-100">
              <option value="">All Depts</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1.5">Type</label>
            <select 
              value={filters.type} 
              onChange={e => setFilters({...filters, type: e.target.value})} 
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
            >
              <option value="">All Types</option>
              {types.map(t => <option key={t._id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <button 
              onClick={fetchReports}
              className="w-full bg-[#5A5A40] text-white py-2 rounded-xl font-bold hover:bg-[#4A4A30] transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Search className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[#5A5A40]/10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
            <input 
              type="text" 
              placeholder="Search by student name, roll number, or session type..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40] text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-[#5A5A40]/10 overflow-hidden">
        <div className="hidden sm:block">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F5F5F0]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[#5A5A40] uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-[#5A5A40] uppercase tracking-wider">Session</th>
                <th className="px-6 py-4 text-xs font-bold text-[#5A5A40] uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-[#5A5A40] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-[#5A5A40] uppercase tracking-wider">Reason</th>
                <th className="px-6 py-4 text-xs font-bold text-[#5A5A40] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#5A5A40]/10">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[#5A5A40]/40">Loading reports...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[#5A5A40]/40">No records found for the selected filters</td></tr>
              ) : filteredRecords.map(record => (
                <tr key={record._id} className="hover:bg-[#F5F5F0]/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-[#5A5A40]">{record.sessionId?.date ? new Date(record.sessionId.date).toLocaleDateString() : 'Unknown Date'}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-[#1a1a1a]">{record.sessionId?.type || 'Unknown Session'}</p>
                    <p className="text-[10px] text-[#5A5A40]/60 uppercase tracking-tighter">{record.sessionId?.batch || 'N/A'} • {record.sessionId?.department || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[#1a1a1a]">{record.studentId?.name || 'Deleted Student'}</p>
                    <p className="text-xs text-[#5A5A40]/60">{record.studentId?.rollNumber || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      record.status === 'P' ? "bg-emerald-100 text-emerald-700" : 
                      record.status === 'A' ? "bg-red-100 text-red-700" : 
                      "bg-amber-100 text-amber-700"
                    )}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#5A5A40] italic">{record.reason || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setEditingRecord(record)}
                      className="p-2 text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-[#5A5A40]/10">
          {loading ? (
            <div className="p-8 text-center text-[#5A5A40]/40">Loading reports...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-[#5A5A40]/40 italic">No records found</div>
          ) : filteredRecords.map(record => (
            <div key={record._id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-[#5A5A40]/40 uppercase tracking-widest">
                    {record.sessionId?.date ? new Date(record.sessionId.date).toLocaleDateString() : 'Unknown Date'}
                  </p>
                  <p className="font-bold text-[#1a1a1a] mt-1">{record.studentId?.name || 'Deleted Student'}</p>
                  <p className="text-xs text-[#5A5A40]/60 font-mono">{record.studentId?.rollNumber || 'N/A'}</p>
                </div>
                <button 
                  onClick={() => setEditingRecord(record)}
                  className="p-2 text-[#5A5A40] bg-[#5A5A40]/5 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#5A5A40]/5">
                <div className="text-xs text-[#5A5A40]">
                  <span className="font-medium">{record.sessionId?.type}</span>
                  <span className="mx-2 opacity-20">|</span>
                  <span className="opacity-60">{record.sessionId?.batch}</span>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                  record.status === 'P' ? "bg-emerald-100 text-emerald-700" : 
                  record.status === 'A' ? "bg-red-100 text-red-700" : 
                  "bg-amber-100 text-amber-700"
                )}>
                  {record.status}
                </span>
              </div>
              {record.reason && (
                <p className="text-[10px] text-[#5A5A40]/60 italic bg-[#F5F5F0] p-2 rounded-lg">
                  Reason: {record.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Record Modal */}
      <AnimatePresence>
        {editingRecord && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
            >
              <h2 className="text-2xl font-serif font-bold mb-6">Edit Attendance Record</h2>
              <div className="mb-4 p-4 bg-[#F5F5F0] rounded-xl">
                <p className="font-bold text-[#1a1a1a]">{editingRecord.studentId?.name || 'Deleted Student'}</p>
                <p className="text-sm text-[#5A5A40]">{editingRecord.sessionId?.date ? new Date(editingRecord.sessionId.date).toLocaleDateString() : ''} - {editingRecord.sessionId?.type}</p>
              </div>
              <form onSubmit={updateRecord} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Status</label>
                  <select 
                    name="status" 
                    defaultValue={editingRecord.status} 
                    required 
                    className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  >
                    <option value="P">Present (P)</option>
                    <option value="A">Absent (A)</option>
                    <option value="OD">On Duty (OD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A5A40] mb-1">Reason (if OD)</label>
                  <input 
                    name="reason" 
                    defaultValue={editingRecord.reason || ''} 
                    className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" 
                    placeholder="e.g. Medical Leave"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingRecord(null)} className="flex-1 py-3 rounded-xl font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-all">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-[#5A5A40] text-white rounded-xl font-bold shadow-lg hover:bg-[#4A4A30] transition-all">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
