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
  Download,
  Calendar,
  UserPlus,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
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
const FACULTY_DEPARTMENTS = ['CSE', 'IT', 'AI & DS', 'ECE', 'EEE', 'MECH'];
const STUDENT_DEPARTMENTS = ['CSE', 'IT', 'AI & DS', 'ECE', 'EEE', 'MECH'];
const ATTENDANCE_TYPES = ['Java Class', 'HackerRank Test', 'Oracle Training', 'Soft Skills', 'Others'];

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

function useDepartments(token: string | null) {
  const [departments, setDepartments] = useState<string[]>([]);
  const fetchDepartments = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/students/departments', {
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
    }
  };
  useEffect(() => { fetchDepartments(); }, [token]);
  return { departments, refreshDepartments: fetchDepartments };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [view, setView] = useState<'dashboard' | 'mark' | 'students' | 'reports' | 'faculty'>('dashboard');
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
        setView('dashboard');
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
    <div className="h-screen bg-[#F5F5F0] flex font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#5A5A40]/10 flex flex-col h-full">
        <div className="p-6 border-b border-[#5A5A40]/10">
          <div className="flex items-center gap-3">
            <div className="bg-[#5A5A40] p-2 rounded-lg">
              <ClipboardCheck className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-[#1a1a1a]">Adhi Attend</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            active={view === 'dashboard'} 
            onClick={() => setView('dashboard')} 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dashboard" 
          />
          {user?.role === 'admin' && (
            <>
              <NavItem 
                active={view === 'mark'} 
                onClick={() => setView('mark')} 
                icon={<CheckCircle2 className="w-5 h-5" />} 
                label="Mark Attendance" 
              />
              <NavItem 
                active={view === 'students'} 
                onClick={() => setView('students')} 
                icon={<Users className="w-5 h-5" />} 
                label="Manage Students" 
              />
              <NavItem 
                active={view === 'faculty'} 
                onClick={() => setView('faculty')} 
                icon={<UserPlus className="w-5 h-5" />} 
                label="Manage Faculty" 
              />
            </>
          )}
          <NavItem 
            active={view === 'reports'} 
            onClick={() => setView('reports')} 
            icon={<FileSpreadsheet className="w-5 h-5" />} 
            label="Reports & Export" 
          />
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && <Dashboard user={user} setView={setView} token={token} />}
          {view === 'mark' && <MarkAttendance token={token!} user={user!} />}
          {view === 'students' && <ManageStudents token={token!} user={user!} />}
          {view === 'faculty' && <ManageFaculty token={token!} />}
          {view === 'reports' && <Reports token={token!} user={user!} />}
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
  const [stats, setStats] = useState({ totalStudents: 0, attendancePercentage: 0, presentCount: 0, absentCount: 0 });
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [deptStats, setDeptStats] = useState<Record<string, { present: number, absent: number, od: number }>>({});
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
          window.dispatchEvent(new Event('unauthorized'));
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };

    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const res = await fetch('/api/analytics/daily', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    const fetchDeptStats = async () => {
      if (user?.role !== 'admin') return;
      try {
        const res = await fetch('/api/stats/department', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDeptStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch department stats', err);
      }
    };

    fetchStats();
    fetchAnalytics();
    fetchDeptStats();
  }, [token, user]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-6xl mx-auto"
    >
      <header className="mb-10">
        <h1 className="text-4xl font-serif font-bold text-[#1a1a1a]">Welcome back, {user?.name}</h1>
        <p className="text-[#5A5A40]/60 mt-2">Here's what's happening with attendance today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="Total Students" 
          value={stats.totalStudents.toString()} 
          icon={<Users className="w-6 h-6 text-blue-600" />} 
          color="bg-blue-50"
        />
        <StatCard 
          title="Attendance Today" 
          value={`${stats.attendancePercentage}%`} 
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} 
          color="bg-emerald-50"
        />
        <StatCard 
          title="Present Today" 
          value={stats.presentCount.toString()} 
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} 
          color="bg-emerald-50"
        />
        <StatCard 
          title="Absent Today" 
          value={stats.absentCount.toString()} 
          icon={<XCircle className="w-6 h-6 text-red-600" />} 
          color="bg-red-50"
        />
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-[#5A5A40]/10 mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#5A5A40]" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {user?.role === 'admin' && (
            <>
              <ActionButton 
                onClick={() => setView('mark')}
                icon={<ClipboardCheck className="w-5 h-5" />}
                label="Mark New"
                sub="Attendance"
              />
              <ActionButton 
                onClick={() => setView('students')}
                icon={<UserPlus className="w-5 h-5" />}
                label="Add Student"
                sub="Manual Entry"
              />
              <ActionButton 
                onClick={() => setView('faculty')}
                icon={<Users className="w-5 h-5" />}
                label="Add Faculty"
                sub="System Access"
              />
            </>
          )}
          <ActionButton 
            onClick={() => setView('reports')}
            icon={<Download className="w-5 h-5" />}
            label="Export Data"
            sub="Excel Format"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#5A5A40]/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-[#5A5A40]" />
              Attendance Trends
            </h2>
            <span className="text-xs font-bold text-[#5A5A40]/40 uppercase tracking-wider">Last 7 Days</span>
          </div>
          
          <div className="h-[240px] w-full">
            {loadingAnalytics ? (
              <div className="h-full w-full flex items-center justify-center text-[#5A5A40]/40">
                Loading analytics...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics}>
                  <defs>
                    <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#5A5A40" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#5A5A40', opacity: 0.6 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#5A5A40', opacity: 0.6 }}
                    domain={[0, 100]}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#5A5A40" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPercentage)" 
                    name="Attendance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#5A5A40]/10">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-[#5A5A40]" />
              Department-wise Attendance
            </h2>
            <div className="space-y-4">
              {Object.entries(deptStats).map(([dept, stats]) => (
                <div key={dept} className="flex items-center justify-between p-4 bg-[#F5F5F0] rounded-2xl">
                  <span className="font-bold">{dept}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-emerald-600">P: {stats.present}</span>
                    <span className="text-red-600">A: {stats.absent}</span>
                    <span className="text-yellow-600">OD: {stats.od}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#5A5A40]/10 flex items-center gap-4">
      <div className={cn("p-4 rounded-2xl", color)}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-[#5A5A40]/60">{title}</p>
        <p className="text-2xl font-bold text-[#1a1a1a]">{value}</p>
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
  const [config, setConfig] = useState({ batch: '', department: user.department || '', type: '' });
  const [customType, setCustomType] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: 'P' | 'A' | 'OD', reason?: string }>>({});
  const [loading, setLoading] = useState(false);
  const { batches } = useBatches(token);
  const { departments } = useDepartments(token);

  const fetchStudents = async () => {
    setLoading(true);
    try {
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
        // Initialize attendance
        const initial: Record<string, { status: 'P' | 'A' | 'OD', reason?: string }> = {};
        data.forEach((s: Student) => {
          initial[s._id] = { status: 'P' };
        });
        setAttendance(initial);
      } else {
        console.error('Students API did not return an array', data);
        setStudents([]);
      }
      setStep(2);
    } catch (err) {
      alert('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const submitAttendance = async () => {
    setLoading(true);
    const records = Object.entries(attendance).map(([id, val]) => ({
      studentId: id,
      status: (val as { status: string }).status,
      reason: (val as { reason?: string }).reason
    }));

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
          records 
        }),
      });
      if (res.ok) {
        alert('Attendance marked successfully!');
        setStep(1);
        setConfig({ batch: '', department: '', type: '' });
        setCustomType('');
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
      className="max-w-5xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1a1a1a]">Mark Attendance</h1>
          <p className="text-[#5A5A40]/60">Step {step} of 2: {step === 1 ? 'Configure Session' : 'Mark Students'}</p>
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
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#5A5A40]/10 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#5A5A40] mb-2">Attendance Type</label>
              <select 
                value={config.type}
                onChange={e => setConfig({...config, type: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
              >
                <option value="">Select Type</option>
                {ATTENDANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
                  disabled={!!user.department}
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
          <div className="bg-white rounded-3xl shadow-sm border border-[#5A5A40]/10 overflow-hidden">
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

function ManageFaculty({ token }: { token: string }) {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<any | null>(null);
  const [facultyToDelete, setFacultyToDelete] = useState<any | null>(null);
  
  const [addRole, setAddRole] = useState('coordinator');
  const [editRole, setEditRole] = useState('coordinator');

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
    
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
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
    
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${editingFaculty._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
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

      <div className="bg-white rounded-3xl shadow-sm border border-[#5A5A40]/10 overflow-hidden">
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

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
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
                  <div>
                    <label className="block text-sm font-medium text-[#5A5A40] mb-1">Department</label>
                    <select name="department" required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]">
                      <option value="">Select Department</option>
                      {FACULTY_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
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
                  <div>
                    <label className="block text-sm font-medium text-[#5A5A40] mb-1">Department</label>
                    <select name="department" defaultValue={editingFaculty.department || ''} required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]">
                      <option value="">Select Department</option>
                      {FACULTY_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
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
  const [filters, setFilters] = useState({ batch: '', department: user.department || '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[] | null>(null);
  const [bulkDuplicates, setBulkDuplicates] = useState<any[] | null>(null);
  const { batches, refreshBatches } = useBatches(token);
  const { departments, refreshDepartments } = useDepartments(token);

  const fetchStudents = async () => {
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
  }, [filters]);

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1a1a1a]">Student Management</h1>
          <p className="text-[#5A5A40]/60">Manage your college student database</p>
        </div>
        <div className="flex gap-3">
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

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#5A5A40]/10 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-[#5A5A40]/40 uppercase mb-2">Search</label>
          <div className="relative">
            <Search className="w-5 h-5 text-[#5A5A40]/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by name, roll no, batch..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
            />
          </div>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-[#5A5A40]/40 uppercase mb-2">Filter by Batch</label>
          <select 
            value={filters.batch}
            onChange={e => setFilters({...filters, batch: e.target.value})}
            className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
          >
            <option value="">All Batches</option>
            {batches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-[#5A5A40]/40 uppercase mb-2">Filter by Department</label>
          <select 
            value={filters.department}
            onChange={e => setFilters({...filters, department: e.target.value})}
            disabled={!!user.department}
            className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40] disabled:opacity-50 disabled:bg-gray-100"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

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
              <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider">Batch</th>
              <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider">Department</th>
              <th className="px-6 py-4 text-sm font-bold text-[#5A5A40] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#5A5A40]/10">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-[#5A5A40]/40">Loading students...</td></tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#5A5A40]/40 italic">
                  No students found. Use "Add Student" or "Bulk Upload" to populate the database.
                </td>
              </tr>
            ) : filteredStudents.map(student => (
              <tr key={student._id} className="hover:bg-[#F5F5F0]/30 transition-colors">
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    checked={selectedStudents.includes(student._id)}
                    onChange={() => toggleStudentSelection(student._id)}
                    className="w-4 h-4 rounded border-[#5A5A40]/20 text-[#5A5A40] focus:ring-[#5A5A40]"
                  />
                </td>
                <td className="px-6 py-4 font-medium text-[#1a1a1a]">{student.name}</td>
                <td className="px-6 py-4 text-[#5A5A40]">{student.rollNumber}</td>
                <td className="px-6 py-4 text-[#5A5A40]">{student.batch}</td>
                <td className="px-6 py-4 text-[#5A5A40]">{student.department}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setEditingStudent(student)}
                      className="p-2 text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteStudent(student)}
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
                    <input name="batch" required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" placeholder="e.g. 2021" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5A5A40] mb-1">Department</label>
                    <select name="department" required className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]">
                      <option value="">Select Department</option>
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
  const [filters, setFilters] = useState({ startDate: '', endDate: '', batch: '', department: user.department || '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const { batches } = useBatches(token);
  const { departments } = useDepartments(token);

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1a1a1a]">Attendance Reports</h1>
          <p className="text-[#5A5A40]/60">View and export attendance history</p>
        </div>
        <button 
          onClick={downloadExcel}
          disabled={records.length === 0}
          className="bg-emerald-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 shadow-md hover:bg-emerald-700 transition-all text-sm font-medium disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Download Excel
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#5A5A40]/10 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-[#5A5A40]/40 uppercase mb-2">Start Date</label>
            <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#5A5A40]/40 uppercase mb-2">End Date</label>
            <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#5A5A40]/40 uppercase mb-2">Batch</label>
            <select 
              value={filters.batch}
              onChange={e => setFilters({...filters, batch: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
            >
              <option value="">All Batches</option>
              {batches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#5A5A40]/40 uppercase mb-2">Dept</label>
            <select value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})} disabled={!!user.department} className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40] disabled:opacity-50 disabled:bg-gray-100">
              <option value="">All Depts</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#5A5A40]/40 uppercase mb-2">Session Type</label>
            <select 
              value={filters.type} 
              onChange={e => setFilters({...filters, type: e.target.value})} 
              className="w-full px-4 py-2 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40]"
            >
              <option value="">All Types</option>
              {ATTENDANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={fetchReports} className="bg-[#5A5A40] text-white py-2 rounded-xl font-bold hover:bg-[#4A4A30] transition-all flex items-center justify-center gap-2">
            <Search className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="pt-4 border-t border-[#5A5A40]/10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
            <input 
              type="text" 
              placeholder="Search by student name, roll number, or session type..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#5A5A40]/20 outline-none focus:ring-2 focus:ring-[#5A5A40] text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-[#5A5A40]/10 overflow-hidden">
        <div className="overflow-x-auto">
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
