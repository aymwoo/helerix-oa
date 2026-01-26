
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import UserList from './views/UserList';
import UserProfile from './views/UserProfile';
import CertificateList from './views/CertificateList';
import CertificateDetail from './views/CertificateDetail';
import SystemSettings from './views/SystemSettings';
import AIExamAnalysis from './views/AIExamAnalysis';
import AICritic from './views/AICritic';
import Schedule from './views/Schedule';
import MyProfile from './views/MyProfile';
import Login from './views/Login';
import { ViewState, User, UserRole } from './types';
import { UserDatabase } from './db';

const AUTH_STORAGE_KEY = 'helerix_auth_user_id';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('schedule');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await UserDatabase.initialize();
        const storedUserId = localStorage.getItem(AUTH_STORAGE_KEY);
        
        if (storedUserId) {
          const user = await UserDatabase.getById(storedUserId);
          if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
          } else {
            // Stored user no longer exists, clear storage
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error("Failed to check auth", error);
      } finally {
        setIsInitializing(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_STORAGE_KEY, user.id);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentView('schedule');
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const handleNavigate = (view: ViewState) => {
    // Permission check for system settings
    if (view === 'system-settings') {
      const isAdmin = currentUser?.roles.includes(UserRole.Admin);
      if (!isAdmin) {
        alert("权限不足：系统设置仅对管理员开放");
        return;
      }
    }
    setCurrentView(view);
    if (view !== 'user-profile') setSelectedUserId(null);
    if (view !== 'certificate-detail') setSelectedCertId(null);
  };

  const handleUserSelect = (id: string) => {
    setSelectedUserId(id);
    setCurrentView('user-profile');
  };

  const handleCertSelect = (id: string) => {
    setSelectedCertId(id);
    setCurrentView('certificate-detail');
  };

  const renderView = () => {
    switch (currentView) {
      case 'schedule': return <Schedule />;
      case 'users': return <UserList onUserSelect={handleUserSelect} currentUser={currentUser} />;
      case 'user-profile': return selectedUserId ? <UserProfile userId={selectedUserId} onBack={() => handleNavigate('users')} /> : <UserList onUserSelect={handleUserSelect} currentUser={currentUser} />;
      case 'certificates': return <CertificateList onCertSelect={handleCertSelect} />;
      case 'certificate-detail': return selectedCertId ? <CertificateDetail certId={selectedCertId} onBack={() => handleNavigate('certificates')} /> : <CertificateList onCertSelect={handleCertSelect} />;
      case 'system-settings': return <SystemSettings />;
      case 'ai-exam-analysis': return <AIExamAnalysis />;
      case 'ai-critic': return <AICritic />;
      case 'my-profile': return <MyProfile />;
      default: return <Schedule />;
    }
  };

  // Show loading spinner during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-white/50 text-5xl animate-spin">sync</span>
          <p className="text-white/40 text-sm font-medium">正在加载...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 no-scrollbar">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;
