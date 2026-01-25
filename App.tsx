
import React, { useState } from 'react';
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
import { ViewState } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('schedule');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);

  const handleNavigate = (view: ViewState) => {
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
      case 'users': return <UserList onUserSelect={handleUserSelect} />;
      case 'user-profile': return selectedUserId ? <UserProfile userId={selectedUserId} onBack={() => handleNavigate('users')} /> : <UserList onUserSelect={handleUserSelect} />;
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
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 no-scrollbar">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;
