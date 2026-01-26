'use client';

import React, { useEffect, useState } from 'react';
import { User, UserStatus } from '../types';
import { UserDatabase } from '../db';

interface UserProfileProps {
  userId: string;
  onBack: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onBack }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const foundUser = await UserDatabase.getById(userId);
        setUser(foundUser);
      } catch (error) {
        console.error("获取用户详情失败", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-text-muted gap-2">
        <span className="material-symbols-outlined animate-spin">sync</span>
        <span>正在加载档案...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="bg-red-50 p-4 rounded-full text-red-500">
          <span className="material-symbols-outlined text-4xl">person_off</span>
        </div>
        <h3 className="text-xl font-semibold text-text-main">找不到该教研员</h3>
        <button onClick={onBack} className="text-primary hover:underline">返回成员列表</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <button onClick={onBack} className="hover:text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          教研员管理
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-text-main font-medium">个人档案</span>
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-border-light shadow-xl">
        <div className="h-56 bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] w-full relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-full h-full opacity-10">
            <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
              <path d="M0,200 C300,100 700,300 1000,200 L1000,0 L0,0 Z" fill="white" />
            </svg>
          </div>
        </div>
        <div className="px-10 pb-10">
          <div className="relative flex flex-col md:flex-row justify-between items-end -mt-24 gap-6">
            <div className="flex items-end gap-8 w-full">
              <div className="relative shrink-0">
                <img src={user.avatarUrl} alt={user.name} className="w-36 h-36 rounded-[2.5rem] border-8 border-white shadow-2xl bg-white object-cover" />
                <span className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white shadow-md
                  ${user.status === UserStatus.Active ? 'bg-green-500' : 
                    user.status === UserStatus.Offline ? 'bg-gray-400' : 'bg-red-500'}`}>
                </span>
              </div>
              <div className="mb-4 flex-1">
                <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-lg mb-2">{user.name}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 text-[10px] font-bold bg-white/10 text-white/90 border border-white/20 rounded-full backdrop-blur-sm">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mb-4 self-end">
                <button className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl text-sm font-black hover:bg-white/20 transition-all active:scale-95 shadow-lg">
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  即时研讨
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-white text-[#6D28D9] rounded-2xl text-sm font-black hover:bg-slate-50 shadow-xl transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                  协同开发
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-6 border-t">
             {user.department && user.department !== '未分配' && (
               <div className="p-4 rounded-xl bg-background-light/50 border">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">任职科室</p>
                  <p className="text-lg font-bold text-text-main">{user.department}</p>
               </div>
             )}
             <div className="p-4 rounded-xl bg-background-light/50 border">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">教研邮箱</p>
                <p className="text-lg font-bold text-text-main truncate" title={user.email}>{user.email}</p>
             </div>
             <div className="p-4 rounded-xl bg-background-light/50 border">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">入职日期</p>
                <p className="text-lg font-bold text-text-main">2023年10月</p>
             </div>
             <div className="p-4 rounded-xl bg-background-light/50 border">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">人员 ID</p>
                <p className="text-lg font-bold text-text-main font-mono text-sm pt-1">{user.id}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-2">
           <div className="bg-white p-6 rounded-xl border shadow-sm">
             <h3 className="text-lg font-bold text-text-main mb-4">关于</h3>
             <p className="text-text-muted leading-relaxed">
               {user.name} 是 {user.department} 的一名优秀的 {user.roles.join('、')}。在职期间，一直致力于各学科教学大纲的研究与优化，并始终保持高标准的学术产出质量。
             </p>
             <h4 className="text-sm font-bold text-text-main mt-6 mb-3">学科能力与研究方向</h4>
             <div className="flex flex-wrap gap-2">
               {['学科建设', '中考命题研究', '教学法微调', '教师培训'].map((skill) => (
                 <span key={skill} className="px-3 py-1 rounded-full bg-background-light text-text-muted text-xs font-medium border">
                   {skill}
                 </span>
               ))}
             </div>
           </div>
        </div>
        <div className="space-y-6 text-sm">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-text-main mb-4">联系方式</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-background-light flex items-center justify-center text-text-muted">
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                </div>
                <div>
                  <p className="text-xs text-text-muted">工作邮箱</p>
                  <a href={`mailto:${user.email}`} className="text-sm text-primary hover:underline font-medium">{user.email}</a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-background-light flex items-center justify-center text-text-muted">
                  <span className="material-symbols-outlined text-[18px]">call</span>
                </div>
                <div>
                  <p className="text-xs text-text-muted">办公座机</p>
                  <p className="text-sm text-text-main font-medium">+86 (155) 1234-5678</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;