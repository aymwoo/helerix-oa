
import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { UserDatabase } from '../db';
import { APP_LOGO, AVATAR_ALEX } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'login' | 'register';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isQuickLogin, setIsQuickLogin] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [selectedQuickUser, setSelectedQuickUser] = useState<User | null>(null);
  const [quickPassword, setQuickPassword] = useState('');

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.Math);
  const [isRegistering, setIsRegistering] = useState(false);

  const loadUsers = async () => {
    try {
      await UserDatabase.initialize();
      const allUsers = await UserDatabase.getAll();
      setUsers(allUsers);
      // If no users exist, switch to registration mode
      if (allUsers.length === 0) {
        setAuthMode('register');
      }
    } catch (e) {
      console.error("Failed to load users", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleQuickLogin = (user: User) => {
    setError(null);
    setQuickPassword('');
    setSelectedQuickUser(user);
  };

  const handleQuickPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuickUser) return;

    if (selectedQuickUser.password === quickPassword) {
      onLogin(selectedQuickUser);
    } else {
      setError("密码错误");
    }
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const searchTerm = email.toLowerCase().trim();
    const user = users.find(u => 
      u.email.toLowerCase() === searchTerm || 
      u.name.toLowerCase() === searchTerm
    );
    
    if (user) {
      if (user.password === password) {
        onLogin(user);
      } else {
        setError("密码不正确");
      }
    } else {
      setError("未找到该邮箱或用户名对应的账户");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!regName.trim()) {
      setError("请输入姓名");
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setError("请输入有效的邮箱地址");
      return;
    }
    if (regPassword.length < 6) {
      setError("密码长度至少为 6 位");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    // Check if email already exists
    const existingUser = users.find(u => u.email.toLowerCase() === regEmail.toLowerCase().trim());
    if (existingUser) {
      setError("该邮箱已被注册");
      return;
    }

    setIsRegistering(true);

    try {
      const newUser: User = {
        id: `user_${Date.now()}`,
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        roles: [regRole], // Admin role will be added automatically if this is the first user
        department: regDepartment.trim() || "未分配",
        status: UserStatus.Active,
        avatarUrl: AVATAR_ALEX,
        bio: "",
        phone: "",
        joinDate: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '年').replace(/(\d{2})$/, '$1日'),
        expertise: []
      };

      await UserDatabase.add(newUser);
      
      // Reload users to get the updated user (with Admin role if first user)
      const updatedUsers = await UserDatabase.getAll();
      const registeredUser = updatedUsers.find(u => u.email === newUser.email);
      
      if (registeredUser) {
        onLogin(registeredUser);
      }
    } catch (err) {
      console.error("Registration failed", err);
      setError("注册失败，请重试");
    } finally {
      setIsRegistering(false);
    }
  };

  const availableRoles = Object.values(UserRole).filter(r => r !== UserRole.Admin);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-violet-600/5 to-indigo-600/5 rounded-full blur-3xl" />
      </div>

      {/* Login/Register Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-white/10 p-5 rounded-[2rem] backdrop-blur-md border border-white/20 shadow-2xl ring-8 ring-white/5 group hover:rotate-3 transition-transform duration-500">
                <img src={APP_LOGO} alt="Helerix" className="h-20 w-auto filter drop-shadow-2xl" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
              {authMode === 'register' ? (users.length === 0 ? '创建管理员账户' : '注册新账户') : '欢迎回来'}
            </h1>
            <p className="text-white/60 text-sm">
              {authMode === 'register' 
                ? (users.length === 0 ? '系统初始化：第一位注册用户将自动成为管理员' : '创建您的 Helerix 账户')
                : '登录 Helerix 教研管理系统'}
            </p>
          </div>

          {authMode === 'login' ? (
            <>
              {/* Toggle Tabs - Login Mode */}
              <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
                <button
                  onClick={() => setIsQuickLogin(true)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${isQuickLogin ? 'bg-white text-slate-900 shadow-lg' : 'text-white/60 hover:text-white'}`}
                >
                  快速登录
                </button>
                <button
                  onClick={() => setIsQuickLogin(false)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${!isQuickLogin ? 'bg-white text-slate-900 shadow-lg' : 'text-white/60 hover:text-white'}`}
                >
                  账号登录
                </button>
              </div>

              {isQuickLogin ? (
                /* Quick Login - Select User */
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="material-symbols-outlined text-white/50 text-3xl animate-spin">sync</span>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-white/50">
                      <span className="material-symbols-outlined text-4xl mb-2 block">person_off</span>
                      <p className="text-sm">暂无用户账户</p>
                      <p className="text-xs mt-1">请先注册一个账户</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-3">选择账户登录</p>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {users.map((user, index) => (
                          <button
                            key={user.id}
                            onClick={() => handleQuickLogin(user)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group animate-in fade-in slide-in-from-left-2"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-10 h-10 rounded-full border-2 border-white/20 group-hover:border-primary transition-colors"
                            />
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-bold text-sm group-hover:text-primary transition-colors">{user.name}</p>
                                {user.roles.includes(UserRole.Admin) && (
                                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-black rounded uppercase">管理员</span>
                                )}
                              </div>
                              <p className="text-white/40 text-xs truncate">{user.email}</p>
                            </div>
                            <span className="material-symbols-outlined text-white/20 group-hover:text-primary transition-colors">arrow_forward</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Email Login Form */
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider font-bold mb-2">邮箱 / 用户名</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">account_circle</span>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                        placeholder="请输入邮箱或姓名"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider font-bold mb-2">密码</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">lock</span>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm animate-in fade-in slide-in-from-top-2">
                      <span className="material-symbols-outlined text-lg">error</span>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-[#8B5CF6] to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-[#8B5CF6]/25 hover:shadow-[#8B5CF6]/40 hover:from-[#8B5CF6]/90 hover:to-indigo-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-xl">login</span>
                    登录系统
                  </button>
                </form>
              )}

              {/* Switch to Register */}
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-white/40 text-sm mb-3">还没有账户？</p>
                <button
                  onClick={() => { setAuthMode('register'); setError(null); }}
                  className="text-primary font-bold text-sm hover:text-primary/80 transition-colors"
                >
                  立即注册 →
                </button>
              </div>
            </>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-4">
              {users.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm mb-4">
                  <span className="material-symbols-outlined text-lg">star</span>
                  首位注册用户将自动获得管理员权限
                </div>
              )}

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider font-bold mb-2">姓名 *</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">person</span>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => { setRegName(e.target.value); setError(null); }}
                    placeholder="请输入您的姓名"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider font-bold mb-2">邮箱地址 *</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">mail</span>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => { setRegEmail(e.target.value); setError(null); }}
                    placeholder="name@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider font-bold mb-2">部门</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">apartment</span>
                  <input
                    type="text"
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    placeholder="例如：数学教研组"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider font-bold mb-2">教研学科</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">school</span>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  >
                    {availableRoles.map(role => (
                      <option key={role} value={role} className="bg-slate-900 text-white">{role}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-xl pointer-events-none">expand_more</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider font-bold mb-2">设置密码 *</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">lock</span>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => { setRegPassword(e.target.value); setError(null); }}
                      placeholder="至少6位"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider font-bold mb-2">确认密码 *</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">verified_user</span>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => { setRegConfirmPassword(e.target.value); setError(null); }}
                      placeholder="再次输入"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm animate-in fade-in slide-in-from-top-2">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:from-primary/90 hover:to-indigo-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegistering ? (
                  <>
                    <span className="material-symbols-outlined text-xl animate-spin">sync</span>
                    注册中...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">person_add</span>
                    {users.length === 0 ? '创建管理员账户' : '注册账户'}
                  </>
                )}
              </button>

              {/* Switch to Login (only if users exist) */}
              {users.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                  <p className="text-white/40 text-sm mb-3">已有账户？</p>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(null); }}
                    className="text-primary font-bold text-sm hover:text-primary/80 transition-colors"
                  >
                    ← 返回登录
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-white/30 text-xs">
              © {new Date().getFullYear()} Helerix 教研管理平台
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -z-10 top-0 left-0 w-full h-full">
          <div className="absolute top-4 left-4 w-20 h-20 border border-white/5 rounded-2xl rotate-12" />
          <div className="absolute bottom-4 right-4 w-16 h-16 border border-white/5 rounded-full" />
        </div>
      </div>

      {/* Quick Login Password Modal */}
      {selectedQuickUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] border border-white/10 shadow-2xl p-8 animate-in zoom-in duration-200">
            <div className="text-center mb-8">
              <img
                src={selectedQuickUser.avatarUrl}
                alt={selectedQuickUser.name}
                className="w-20 h-20 rounded-full border-4 border-primary/20 mx-auto mb-4"
              />
              <h3 className="text-xl font-black text-white">{selectedQuickUser.name}</h3>
              <p className="text-white/40 text-xs mt-1">请输入登录密码</p>
            </div>

            <form onSubmit={handleQuickPasswordSubmit} className="space-y-4">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">lock</span>
                <input
                  type="password"
                  autoFocus
                  value={quickPassword}
                  onChange={(e) => { setQuickPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedQuickUser(null); setError(null); }}
                  className="flex-1 py-3.5 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-[#8B5CF6] text-white font-bold rounded-xl shadow-lg shadow-[#8B5CF6]/20 hover:bg-violet-700 transition-all"
                >
                  确认登录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
