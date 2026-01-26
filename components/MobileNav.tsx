import React, { useState } from 'react';
import { ViewState, User, UserRole } from '../types';

interface MobileNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  currentUser: User | null;
  onLogout: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate, currentUser, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'schedule', icon: 'calendar_month', label: '排期' },
    { id: 'certificates', icon: 'workspace_premium', label: '证书' },
    { id: 'ai-critic', icon: 'auto_fix', label: 'AI助手', highlight: true },
    { id: 'ai-exam-analysis', icon: 'pie_chart', label: '分析' },
  ];

  const handleNavClick = (view: string) => {
    onNavigate(view as ViewState);
    setIsMenuOpen(false);
  };

  const menuItems = [
    { id: 'users', icon: 'badge', label: '教研员管理' },
    { id: 'system-settings', icon: 'settings', label: '系统设置' },
    { id: 'my-profile', icon: 'person', label: '个人中心' },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between z-50 safe-area-pb">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
              currentView === item.id 
                ? 'text-primary' 
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <span className={`material-symbols-outlined ${item.highlight ? 'text-2xl' : 'text-xl'} ${currentView === item.id ? 'fill-current' : ''}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        
        <button
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
             ['users', 'system-settings', 'my-profile'].includes(currentView)
                ? 'text-primary' 
                : 'text-gray-400'
          }`}
        >
          <span className="material-symbols-outlined text-xl">menu</span>
          <span className="text-[10px] font-medium">更多</span>
        </button>
      </div>

      {/* More Menu Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mb-8">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex flex-col items-center gap-3 p-3 rounded-2xl border ${
                    currentView === item.id 
                      ? 'bg-violet-50 border-violet-100 text-primary' 
                      : 'bg-white border-gray-100 text-gray-600'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentView === item.id ? 'bg-primary text-white' : 'bg-gray-100'
                  }`}>
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  </div>
                  <span className="text-xs font-bold">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-6">
               <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl mb-4">
                  <img src={currentUser?.avatarUrl || "/avatar.png"} className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                     <div className="font-bold text-gray-900">{currentUser?.name}</div>
                     <div className="text-xs text-gray-500">{currentUser?.roles.join(', ')}</div>
                  </div>
               </div>
               <button 
                  onClick={() => { onLogout(); setIsMenuOpen(false); }}
                  className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">logout</span>
                  退出登录
               </button>
            </div>
            
            <div className="h-20"></div> {/* Spacing for safe area */}
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
