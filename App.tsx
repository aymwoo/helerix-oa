
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
import { ViewState, User, UserRole } from './types';
import { UserDatabase } from './db';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('schedule');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const initUser = async () => {
      try {
        await UserDatabase.initialize();
        const users = await UserDatabase.getAll();
        if (users.length > 0) {
          setCurrentUser(users[0]);
        }
      } catch (error) {
        console.error("Failed to load user", error);
      }
    };
    initUser();
  }, []);

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

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} currentUser={currentUser} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 no-scrollbar">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;
