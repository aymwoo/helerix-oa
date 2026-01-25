
import React from 'react';
import { ViewState } from '../types';
import { AVATAR_ALEX, APP_LOGO } from '../constants';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

// 模拟当前登录用户的权限
// 在真实场景中，这应该来自 App.tsx 的 Context 或 Props
const IS_ADMIN = true; // 演示：默认当前用户是陈老师（管理员）

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const getLinkClass = (view: ViewState) => {
    const isActive = currentView === view;
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group cursor-pointer ${
      isActive
        ? "bg-primary/10 text-primary font-medium"
        : "text-text-muted hover:bg-white hover:text-text-main"
    }`;
  };

  return (
    <aside className="w-64 flex-col bg-surface-light border-r border-border-light hidden md:flex transition-colors duration-200">
      <div className="h-20 flex items-center px-6 border-b border-border-light">
          <div className="flex items-center gap-3">
             <img src={APP_LOGO} alt="Helerix Logo" className="h-10 w-auto object-contain" />
             <div className="pl-3 border-l border-border-light flex flex-col justify-center h-8">
                <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase leading-none mb-1">OA System</span>
                <span className="text-xs text-text-main font-bold leading-none">教研协作</span>
             </div>
          </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <div onClick={() => onNavigate('schedule')} className={getLinkClass('schedule')}>
          <span className="material-symbols-outlined text-xl">calendar_month</span>
          教研排期
        </div>

        <div onClick={() => onNavigate('users')} className={getLinkClass('users')}>
          <span className="material-symbols-outlined text-xl">account_box</span>
          教研员管理
        </div>

        <div onClick={() => onNavigate('certificates')} className={getLinkClass('certificates')}>
          <span className="material-symbols-outlined text-xl">workspace_premium</span>
          专业档案/荣誉
        </div>

        <div onClick={() => onNavigate('ai-exam-analysis')} className={getLinkClass('ai-exam-analysis')}>
          <span className="material-symbols-outlined text-xl">psychology</span>
          AI 试卷分析
        </div>

        <div onClick={() => onNavigate('ai-critic')} className={getLinkClass('ai-critic')}>
          <span className="material-symbols-outlined text-xl">gavel</span>
          AI 批评者
        </div>

        {/* 仅管理员可见 系统设置 */}
        {IS_ADMIN && (
          <div onClick={() => onNavigate('system-settings')} className={getLinkClass('system-settings')}>
            <span className="material-symbols-outlined text-xl">settings</span>
            系统设置
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border-light">
        <div 
          onClick={() => onNavigate('my-profile')}
          className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all hover:bg-background-light group ${currentView === 'my-profile' ? 'bg-primary/5 ring-1 ring-primary/10' : ''}`}
        >
          <img
            alt="用户头像"
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-105"
            src={AVATAR_ALEX}
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold truncate transition-colors ${currentView === 'my-profile' ? 'text-primary' : 'text-text-main group-hover:text-primary'}`}>陈老师</p>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px] text-primary">verified_user</span>
              <p className="text-[10px] text-text-muted truncate font-bold uppercase tracking-tighter">系统管理员</p>
            </div>
          </div>
          <button className="text-text-muted hover:text-red-500 transition-colors">
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
