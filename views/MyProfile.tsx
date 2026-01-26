
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, UserRole, ExamAnalysis, ScheduleEvent, Certificate, CertificateCategory } from '../types';
import { UserDatabase, ExamAnalysisDatabase, EventsDatabase, CertificateDatabase, FileManager } from '../db';
import { AVATAR_ALEX } from '../constants';
import { useToast } from '../components/ToastContext';

interface ActivityItem {
  id: string;
  timestamp: number;
  type: 'exam' | 'event' | 'cert';
  title: string;
  action: string;
  subtitle?: string;
}

interface MyProfileProps {
  currentUser: User | null;
  onUserUpdate: (user: User) => void;
}

const MyProfile: React.FC<MyProfileProps> = ({ currentUser, onUserUpdate }) => {
  const { success, error } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<User | null>(currentUser);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState({
    examCount: 0,
    eventCount: 0,
    certCount: 0,
    annualHours: 0
  });

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!currentUser) return;
      
      setIsLoading(true);
      try {
        await UserDatabase.initialize();
        // Always verify user exists in DB
        const user = await UserDatabase.getById(currentUser.id);
        if (user) {
          setProfile(user);
        } else {
           // Fallback to prop if DB fails or user not found (e.g. new session)
           setProfile(currentUser);
        }

        // Load real stats and activities
        await ExamAnalysisDatabase.initialize();
        const analyses = await ExamAnalysisDatabase.getAll();

        await EventsDatabase.initialize();
        const events = await EventsDatabase.getAll();

        await CertificateDatabase.initialize();
        const certificates = await CertificateDatabase.getAll();

        // Calculate stats
        const userEvents = events.filter(e => e.participants?.includes(user?.name || "陈老师"));

        const currentYear = new Date().getFullYear();
        const totalAnnualHours = certificates.reduce((sum, cert) => {
          const certYear = new Date(cert.issueDate).getFullYear();
          if (certYear === currentYear) {
            return sum + (cert.hours || 0);
          }
          return sum;
        }, 0);

        setStats({
          examCount: analyses.length,
          eventCount: userEvents.length,
          certCount: certificates.length,
          annualHours: totalAnnualHours
        });

        // Merge activities
        const combinedActivities: ActivityItem[] = [
          ...analyses.map(a => ({
            id: a.id,
            timestamp: a.timestamp,
            type: 'exam' as const,
            title: a.title,
            action: '完成了 AI 试卷分析',
            subtitle: 'AI 智能引擎'
          })),
          ...userEvents.map(e => ({
            id: e.id,
            timestamp: new Date(`${e.date}T${e.startTime}`).getTime(),
            type: 'event' as const,
            title: e.title,
            action: '参与了线下教研活动',
            subtitle: '日程管理器'
          })),
          ...certificates.map(c => {
            let actionStr = '登记了专业荣誉';
            if (c.category === CertificateCategory.Training) actionStr = `完成了培训并获得 ${c.hours} 学时`;
            if (c.category === CertificateCategory.Project) actionStr = '成功结项了教研课题';
            if (c.category === CertificateCategory.Award) actionStr = `荣获了${c.level}荣誉表彰`;

            return {
              id: c.id,
              timestamp: c.timestamp || new Date(c.issueDate).getTime(), // Fallback to issue date if timestamp missing
              type: 'cert' as const,
              title: c.name,
              action: actionStr,
              subtitle: '证书库'
            };
          })
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

        setActivities(combinedActivities);

      } catch (error) {
        console.error("加载个人资料失败", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfileData();
  }, [currentUser]);

  const handleSave = async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      await UserDatabase.update(profile);
      onUserUpdate(profile);
      setIsEditing(false);
      success("个人资料已成功保存并同步。");
    } catch (err) {
      console.error("保存失败", err);
      error("保存失败，请检查连接。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profile) {
      try {
        const fileUri = await FileManager.saveFile(file);
        const dataUrl = await FileManager.resolveToDataUrl(fileUri);
        if (dataUrl) {
          const updatedProfile = { ...profile, avatarUrl: dataUrl };
          setProfile(updatedProfile);
          
          // Auto-save avatar even if not in full edit mode
          await UserDatabase.update(updatedProfile);
          onUserUpdate(updatedProfile);
          success("头像已更新并同步。");
        }
      } catch (err) {
        console.error("Avatar upload failed", err);
        error("头像上传失败");
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setPasswordFeedback(null);

    // Security check: verify current password
    if (passwordForm.current !== (profile.password || '123456')) {
      setPasswordFeedback({ type: 'error', message: '当前密码错误' });
      return;
    }
    
    if (passwordForm.new.length < 6) {
      setPasswordFeedback({ type: 'error', message: '新密码长度至少为 6 位' });
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordFeedback({ type: 'error', message: '两次输入的新密码不一致' });
      return;
    }

    setIsPasswordChanging(true);
    try {
      const updatedProfile = { ...profile, password: passwordForm.new };
      await UserDatabase.update(updatedProfile);
      onUserUpdate(updatedProfile);
      setProfile(updatedProfile);
      
      setPasswordFeedback({ type: 'success', message: '密码修改成功！' });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordForm({ current: '', new: '', confirm: '' });
        setPasswordFeedback(null);
      }, 1500);
    } catch (err) {
      console.error("Password update failed", err);
      setPasswordFeedback({ type: 'error', message: '系统错误，密码修改失败' });
    } finally {
      setIsPasswordChanging(false);
    }
  };

  const formatTime = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return new Date(ts).toLocaleDateString();
  };

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted gap-2">
        <span className="material-symbols-outlined animate-spin">sync</span>
        <span>正在载入您的档案...</span>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 overflow-visible">
      {/* Hero Header Card */}
      <div className="relative bg-white rounded-[3rem] border border-[#E5E7EB] shadow-2xl shadow-primary/5 overflow-hidden">
        <div className="h-80 bg-[#6D28D9] relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9]"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-full h-full opacity-20">
            <svg className="w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="none">
              <path d="M0,400 C300,300 700,500 1000,400 L1000,0 L0,0 Z" fill="white" fillOpacity="0.1" />
            </svg>
          </div>
          <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-black/20 rounded-full blur-[100px]"></div>
        </div>

        <div className="px-12">
          <div className="relative flex flex-col lg:flex-row justify-between items-start -mt-32 gap-8">
            <div className="flex flex-col md:flex-row items-end gap-8 w-full">
              <div className="relative group shrink-0">
                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <img
                  src={profile.avatarUrl}
                  alt="Profile"
                  className="relative w-44 h-44 rounded-[3rem] border-8 border-white shadow-2xl bg-white object-cover transition-transform group-hover:scale-105 duration-500"
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-white text-[#6D28D9] w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 transition-all active:scale-95 z-20"
                >
                  <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                </button>
                <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
              </div>
              
              <div className="mb-6 flex-1">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.name}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                        className="text-5xl font-black text-white tracking-tight bg-white/10 px-4 py-1 rounded-2xl border border-white/20 outline-none focus:ring-4 focus:ring-white/10 w-full max-w-lg"
                      />
                    ) : (
                      <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-md">{profile.name}</h1>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <p className="text-xl font-bold text-white/90 flex items-center gap-2 drop-shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
                      {profile.roles.includes(UserRole.Admin) ? "系统管理员" : "高级教研员"}
                    </p>
                    {((isEditing) || (profile.department && profile.department !== '未分配')) && (
                      <>
                        <span className="w-1 h-1 bg-white/30 rounded-full hidden md:block"></span>
                        <div className="flex items-center gap-2 text-white/80 text-lg font-medium">
                          <span className="material-symbols-outlined text-xl">domain</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profile.department}
                              onChange={e => setProfile({ ...profile, department: e.target.value })}
                              className="bg-white/10 px-3 py-1 rounded-xl border border-white/20 outline-none focus:ring-4 focus:ring-white/10 text-white"
                            />
                          ) : (
                            profile.department
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mb-6 self-end ml-auto">
                {isEditing ? (
                  <button
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 px-10 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-2xl bg-white text-[#6D28D9] hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    保存发布
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center justify-center gap-2 px-10 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-2xl bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit_note</span>
                    编辑档案
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="h-8"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (40%) - Stats & Timeline */}
        <div className="lg:col-span-5 space-y-8">
          {/* Core Impact Dashboard (Light Theme) */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-[#E5E7EB] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B5CF6]/5 rounded-full -mr-16 -mt-16 blur-3xl transition-transform group-hover:scale-150 duration-1000"></div>
            <h3 className="text-xl font-black text-text-main mb-8 flex items-center gap-3 relative z-10">
              <span className="material-symbols-outlined text-[#8B5CF6]">data_thresholding</span>
              核心工作量统计
            </h3>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              {[
                { label: 'AI 分析卷宗', val: stats.examCount, unit: '份', icon: 'psychology', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                { label: '研讨活动参与', val: stats.eventCount, unit: '场', icon: 'groups', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                { label: '专业学术成果', val: stats.certCount, unit: '项', icon: 'workspace_premium', color: 'bg-amber-50 text-amber-600 border-amber-100' },
                { label: '本年度学时', val: stats.annualHours, unit: 'h', icon: 'history_edu', color: 'bg-rose-50 text-rose-600 border-rose-100' }
              ].map((stat, i) => (
                <div key={i} className={`p-5 rounded-3xl ${stat.color} border transition-all hover:scale-[1.02] flex flex-col justify-between h-32`}>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-80">{stat.label}</span>
                    <span className="material-symbols-outlined text-[18px] opacity-40">{stat.icon}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">{stat.val}</span>
                    <span className="text-xs font-bold opacity-60">{stat.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[10px] text-text-muted font-bold text-center uppercase tracking-widest opacity-60">
              学时数据同步自 {new Date().getFullYear()} 年度荣誉与培训档案
            </p>
          </div>

          {/* Recent Activity Timeline - Real Data from All Sections */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-[#E5E7EB] shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-text-main flex items-center gap-3">
                <span className="material-symbols-outlined text-[#8B5CF6]">history</span>
                教研动态追踪
              </h3>
              <span className="px-3 py-1 bg-background-light text-[10px] font-bold rounded-lg border border-[#E5E7EB] text-text-muted uppercase tracking-widest">Live Updates</span>
            </div>
            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-light">
              {activities.length === 0 ? (
                <div className="py-10 text-center opacity-30">
                  <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
                  <p className="text-xs font-bold">暂无最新动态</p>
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="relative pl-10 group">
                    <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 z-10 
                      ${act.type === 'exam' ? 'border-indigo-400 text-indigo-500' : act.type === 'cert' ? 'border-amber-400 text-amber-500' : 'border-emerald-400 text-emerald-500'}`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {act.type === 'exam' ? 'psychology' : act.type === 'cert' ? 'workspace_premium' : 'calendar_month'}
                      </span>
                    </div>
                    <div className="p-4 bg-background-light/30 rounded-2xl border border-transparent group-hover:border-border-light group-hover:bg-white transition-all">
                      <p className="text-[10px] font-black text-text-muted mb-1 flex items-center gap-2">
                        {formatTime(act.timestamp)}
                        <span className="w-1 h-1 bg-border-light rounded-full"></span>
                        {act.subtitle}
                      </p>
                      <p className="text-sm font-medium text-text-main leading-relaxed">
                        {act.action} <span className="font-black text-[#8B5CF6]">“{act.title}”</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (60%) - Details & Security */}
        <div className="lg:col-span-7 space-y-8">
          {/* Detailed Info Card */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-[#E5E7EB] shadow-sm">
            <h3 className="text-2xl font-black text-text-main mb-10 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#8B5CF6]">contact_page</span>
              账户通讯详情
            </h3>
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">教研联系邮箱</p>
                <div className="flex items-center gap-4 p-5 bg-background-light/30 border border-[#E5E7EB] rounded-[1.5rem] group hover:border-[#8B5CF6]/30 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#8B5CF6] shadow-sm group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profile.email}
                      onChange={e => setProfile({ ...profile, email: e.target.value })}
                      className="text-base font-black text-text-main bg-transparent outline-none flex-1"
                    />
                  ) : (
                    <span className="text-base font-black text-text-main">{profile.email}</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">联系电话</p>
                <div className="flex items-center gap-4 p-5 bg-background-light/30 border border-[#E5E7EB] rounded-[1.5rem] group hover:border-[#8B5CF6]/30 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#8B5CF6] shadow-sm group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined">call</span>
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={e => setProfile({ ...profile, phone: e.target.value })}
                      className="text-base font-black text-text-main bg-transparent outline-none flex-1"
                    />
                  ) : (
                    <span className="text-base font-black text-text-main">{profile.phone || "未设置"}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Security Quick Links */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-[#E5E7EB] shadow-sm">
            <h3 className="text-2xl font-black text-text-main mb-8 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#8B5CF6]">security</span>
              安全审计与账户偏好
            </h3>
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center justify-between p-6 rounded-[2rem] bg-background-light/40 border border-[#E5E7EB] hover:bg-white hover:border-[#8B5CF6]/40 hover:shadow-xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center text-text-muted group-hover:text-[#8B5CF6] transition-all group-hover:rotate-6">
                    <span className="material-symbols-outlined">key</span>
                  </div>
                  <div className="text-left">
                    <p className="text-base font-black text-text-main">修改登录密码</p>
                    <p className="text-[10px] text-text-muted font-bold">建议定期更换以确保安全</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-muted group-hover:translate-x-2 transition-transform">east</span>
              </button>

              <button className="flex items-center justify-between p-6 rounded-[2rem] bg-background-light/40 border border-[#E5E7EB] hover:bg-white hover:border-[#8B5CF6]/40 hover:shadow-xl transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center text-text-muted group-hover:text-amber-500 transition-all group-hover:rotate-6">
                    <span className="material-symbols-outlined">notifications</span>
                  </div>
                  <div className="text-left">
                    <p className="text-base font-black text-text-main">消息推送偏好</p>
                    <p className="text-[10px] text-text-muted font-bold">当前已开启邮件与微信提醒</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-muted group-hover:translate-x-2 transition-transform">east</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col">
            <div className="p-8 border-b border-[#E5E7EB] flex justify-between items-center bg-background-light/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center">
                  <span className="material-symbols-outlined">lock_reset</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-text-main">修改登录密码</h3>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Change Your Password</p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-white text-text-muted hover:text-red-500 transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-8 space-y-6">
              {passwordFeedback && (
                <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2 ${passwordFeedback.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                  <span className="material-symbols-outlined text-[20px]">{passwordFeedback.type === 'error' ? 'error' : 'check_circle'}</span>
                  {passwordFeedback.message}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">当前密码</label>
                <div className="relative group/input">
                  <span className="material-symbols-outlined absolute left-4 top-3.5 text-text-muted text-[20px] group-focus-within/input:text-[#8B5CF6] transition-colors">password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.current}
                    onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    className="w-full bg-background-light/50 border border-[#E5E7EB] rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#8B5CF6]/10 focus:border-[#8B5CF6] transition-all"
                    placeholder="输入您的当前密码"
                  />
                </div>
              </div>

              <div className="h-px bg-[#E5E7EB] w-full"></div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">新密码</label>
                  <div className="relative group/input">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-text-muted text-[20px] group-focus-within/input:text-[#8B5CF6] transition-colors">key</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.new}
                      onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      className="w-full bg-background-light/50 border border-[#E5E7EB] rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#8B5CF6]/10 focus:border-[#8B5CF6] transition-all"
                      placeholder="输入至少 6 位新密码"
                    />
                  </div>
                </div>
 
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">确认新密码</label>
                  <div className="relative group/input">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-text-muted text-[20px] group-focus-within/input:text-[#8B5CF6] transition-colors">verified</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirm}
                      onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      className="w-full bg-background-light/50 border border-[#E5E7EB] rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#8B5CF6]/10 focus:border-[#8B5CF6] transition-all"
                      placeholder="再次输入新密码"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-4 border border-[#E5E7EB] rounded-2xl text-sm font-black text-text-muted hover:bg-background-light transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPasswordChanging}
                  className="flex-1 py-4 bg-[#8B5CF6] text-white rounded-2xl text-sm font-black shadow-xl shadow-[#8B5CF6]/30 hover:bg-violet-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isPasswordChanging ? (
                    <>
                      <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                      处理中...
                    </>
                  ) : (
                    '保存新密码'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
