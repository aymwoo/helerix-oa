import React from 'react';
import { ViewState, User, UserRole } from '../types';
import { AVATAR_ALEX, APP_LOGO } from '../constants';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  currentUser: User | null;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, currentUser, onLogout }) => {
  const isAdmin = currentUser?.roles.includes(UserRole.Admin);

  const getLinkClass = (view: ViewState) => {
    const isActive = currentView === view;
    // Design JSON Spec: background-color: #F3E8FF; color: #8B5CF6; border-right: 3px solid #8B5CF6;
    return `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all group cursor-pointer relative overflow-hidden ${isActive
      ? "bg-violet-100 text-primary font-bold"
      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`;
  };

  const ActiveIndicator = () => (
    <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-primary rounded-l-full" />
  );

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确定要退出登录吗？")) {
      onLogout?.();
    }
  };

  return (
    <aside className="w-64 flex-col bg-white border-r border-gray-200 hidden md:flex transition-colors duration-200">
      {/* Brand Header */}
      <div className="h-40 flex items-center justify-center border-b border-gray-100 overflow-hidden bg-gradient-to-br from-violet-50/30 via-white to-transparent">
        <div 
          className="w-full h-full flex items-center justify-center p-0 group cursor-pointer transition-all" 
          onClick={() => onNavigate('schedule')}
        >
          <img src={APP_LOGO} alt="Logo" className="w-full h-full object-contain scale-110 drop-shadow-xl group-hover:scale-125 transition-all duration-500" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 space-y-1">
        <div onClick={() => onNavigate('schedule')} className={getLinkClass('schedule')}>
          <span className="material-symbols-outlined text-xl">calendar_month</span>
          教研排期
          {currentView === 'schedule' && <ActiveIndicator />}
        </div>

        <div onClick={() => onNavigate('users')} className={getLinkClass('users')}>
          <span className="material-symbols-outlined text-xl">badge</span>
          教研员管理
          {currentView === 'users' && <ActiveIndicator />}
        </div>

        <div onClick={() => onNavigate('certificates')} className={getLinkClass('certificates')}>
          <span className="material-symbols-outlined text-xl">workspace_premium</span>
          证书管理
          {currentView === 'certificates' && <ActiveIndicator />}
        </div>

        <div onClick={() => onNavigate('ai-exam-analysis')} className={getLinkClass('ai-exam-analysis')}>
          <span className="material-symbols-outlined text-xl">pie_chart</span>
          AI 试卷分析
          {currentView === 'ai-exam-analysis' && <ActiveIndicator />}
        </div>

        <div onClick={() => onNavigate('ai-critic')} className={getLinkClass('ai-critic')}>
          <span className="material-symbols-outlined text-xl">auto_fix</span>
          AI 批评者
          {currentView === 'ai-critic' && <ActiveIndicator />}
        </div>

        <div onClick={() => onNavigate('system-settings')} className={getLinkClass('system-settings')}>
          <span className="material-symbols-outlined text-xl">settings</span>
          系统设置
          {currentView === 'system-settings' && <ActiveIndicator />}
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-gray-100">
        <div
          onClick={() => onNavigate('my-profile')}
          className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 group border border-transparent hover:border-gray-200 ${currentView === 'my-profile' ? 'bg-violet-50 border-violet-100' : ''}`}
        >
          <img
            alt="用户头像"
            className="w-10 h-10 rounded-full border-2 border-orange-300 shadow-sm"
            src={currentUser?.avatarUrl || AVATAR_ALEX}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate group-hover:text-primary transition-colors">{currentUser?.name || "未登录"}</p>
            <p className="text-[10px] text-gray-500 font-medium truncate">{currentUser?.roles[0] || "访客"}</p>
          </div>
          <button 
            onClick={handleLogoutClick}
            className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
            title="退出登录"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
