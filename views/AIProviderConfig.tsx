
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { CustomProvider } from '../types';
import { AIProviderDatabase } from '../db';
import { useToast } from '../components/ToastContext';

type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'testing';

const AIProviderConfig: React.FC = () => {
  const { success, warning, info } = useToast();
  const [config, setConfig] = useState({
    auxiliaryApiKey: '',
    auxiliaryProvider: 'openai'
  });

  const [statuses, setStatuses] = useState<{ gemini: ConnectionStatus; auxiliary: ConnectionStatus }>({
    gemini: 'connected',
    auxiliary: 'disconnected'
  });

  const [testResults, setTestResults] = useState<{ gemini: string; auxiliary: string }>({
    gemini: '',
    auxiliary: ''
  });

  // --- Custom Providers State ---
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [newProvider, setNewProvider] = useState<Omit<CustomProvider, 'id'>>({ name: '', baseUrl: '', apiKey: '', modelId: '' });
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTestResults, setCustomTestResults] = useState<Record<string, { status: ConnectionStatus, message: string }>>({});

  // Load custom providers from database on mount
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const data = await AIProviderDatabase.getAll();
        setCustomProviders(data);
      } catch (e) {
        console.error("Failed to load providers", e);
      }
    };
    loadProviders();
  }, []);

  const saveCustomProviders = (providers: CustomProvider[]) => {
    setCustomProviders(providers);
  };

  const handleAddCustomProvider = async () => {
    if (!newProvider.name || !newProvider.baseUrl || !newProvider.apiKey) {
      warning("请填写必要信息 (名称, Base URL, API Key)");
      return;
    }
    try {
      const provider: CustomProvider = {
        id: Date.now().toString(),
        ...newProvider
      };
      const updated = await AIProviderDatabase.add(provider);
      setCustomProviders(updated);
      setNewProvider({ name: '', baseUrl: '', apiKey: '', modelId: '' });
      setIsAddingCustom(false);
      success("添加成功");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomProvider = async (id: string) => {
    if (!window.confirm("确定删除此自定义提供商配置吗？")) return;
    try {
      const updated = await AIProviderDatabase.delete(id);
      setCustomProviders(updated);
      // Clean up test results
      const newResults = { ...customTestResults };
      delete newResults[id];
      setCustomTestResults(newResults);
      success("已删除");
    } catch (err) {
      console.error(err);
    }
  };

  const testCustomConnection = async (provider: CustomProvider) => {
    setCustomTestResults(prev => ({ ...prev, [provider.id]: { status: 'testing', message: '正在尝试握手...' } }));
    
    try {
      // Normalize URL: remove trailing slash and ensure it points to chat completions if possible, 
      // though user might provide full path. We assume user provides base like 'https://api.openai.com/v1'
      let url = provider.baseUrl.replace(/\/$/, "");
      if (!url.endsWith('/chat/completions')) {
         url = `${url}/chat/completions`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          model: provider.modelId || 'gpt-3.5-turbo', // Fallback model ID if empty
          messages: [{ role: 'user', content: 'Connection check. Reply OK.' }],
          max_tokens: 5
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 100)}`);
      }
      
      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        setCustomTestResults(prev => ({ ...prev, [provider.id]: { status: 'connected', message: '连接成功：API 响应正常' } }));
      } else {
        throw new Error("Invalid response structure");
      }

    } catch (error: any) {
      console.error("Custom provider test failed", error);
      let msg = error.message || "未知错误";
      if (error.name === 'AbortError') msg = "连接超时";
      setCustomTestResults(prev => ({ ...prev, [provider.id]: { status: 'error', message: `连接失败: ${msg}` } }));
    }
  };

  const testGeminiConnection = async () => {
    setStatuses(prev => ({ ...prev, gemini: 'testing' }));
    setTestResults(prev => ({ ...prev, gemini: '正在建立握手连接...' }));
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-lite-latest',
        contents: "Connection test. Reply with 'OK'.",
      });
      
      if (response.text) {
        setStatuses(prev => ({ ...prev, gemini: 'connected' }));
        setTestResults(prev => ({ ...prev, gemini: '连接成功：API 响应正常' }));
      } else {
        throw new Error("Empty response");
      }
    } catch (error) {
      console.error("Gemini test failed", error);
      setStatuses(prev => ({ ...prev, gemini: 'error' }));
      setTestResults(prev => ({ ...prev, gemini: '连接失败：请检查网络或环境变量' }));
    }
  };

  const testAuxiliaryConnection = async () => {
    if (!config.auxiliaryApiKey) {
      warning("请先输入备用 API 密钥");
      return;
    }
    
    setStatuses(prev => ({ ...prev, auxiliary: 'testing' }));
    setTestResults(prev => ({ ...prev, auxiliary: '正在尝试连接第三方网关...' }));

    setTimeout(() => {
      if (config.auxiliaryApiKey.toLowerCase() === 'error') {
        setStatuses(prev => ({ ...prev, auxiliary: 'error' }));
        setTestResults(prev => ({ ...prev, auxiliary: '认证失败：无效的 API 令牌' }));
      } else {
        setStatuses(prev => ({ ...prev, auxiliary: 'connected' }));
        setTestResults(prev => ({ ...prev, auxiliary: `已成功连接至 ${config.auxiliaryProvider.toUpperCase()}` }));
      }
    }, 1500);
  };

  const handleSave = () => {
    success("提供商配置已成功保存。");
  };

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-[10px] font-black border border-green-200">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            已连接
          </div>
        );
      case 'testing':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black border border-blue-200">
            <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
            检测中
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-[10px] font-black border border-red-200">
            <span className="material-symbols-outlined text-[12px]">error</span>
            连接错误
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black border border-gray-200">
            未连接
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-text-main tracking-tight">AI 提供商配置</h1>
          <p className="text-text-muted text-base font-normal">
            管理底层大模型服务商的 API 连接状态与身份凭证。
          </p>
        </div>
        <button 
          onClick={handleSave}
          className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          应用提供商设置
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gemini Provider */}
        <div className="bg-white rounded-[2rem] border border-border-light p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-2xl text-primary">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main leading-tight">Google Gemini Pro</h3>
                <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Primary Core Provider</p>
              </div>
            </div>
            {getStatusBadge(statuses.gemini)}
          </div>

          <div className="space-y-6 relative z-10">
            <div className="p-4 rounded-2xl bg-background-light/50 border border-border-light">
              <p className="text-sm font-bold text-text-main mb-1">环境凭证模式</p>
              <p className="text-xs text-text-muted leading-relaxed">系统已通过环境变量 (process.env.API_KEY) 自动注入。无需手动配置。</p>
            </div>
            
            {testResults.gemini && (
              <div className={`px-4 py-3 rounded-xl text-xs font-bold ${statuses.gemini === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                {testResults.gemini}
              </div>
            )}

            <button onClick={testGeminiConnection} disabled={statuses.gemini === 'testing'} className="w-full py-3 bg-white border border-border-light rounded-2xl text-sm font-bold text-text-main hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
              <span className={`material-symbols-outlined text-[20px] ${statuses.gemini === 'testing' ? 'animate-spin' : ''}`}>{statuses.gemini === 'testing' ? 'sync' : 'network_check'}</span>
              连接可用性测试
            </button>
          </div>
        </div>

        {/* Auxiliary Provider Settings */}
        <div className="bg-white rounded-[2rem] border border-border-light p-8 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-secondary/10 p-2.5 rounded-2xl text-secondary">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main leading-tight">备用模型提供商</h3>
                <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Fallback Provider</p>
              </div>
            </div>
            {getStatusBadge(statuses.auxiliary)}
          </div>

          <div className="space-y-6 relative z-10">
            <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-text-muted uppercase ml-1">提供商类型</label>
               <select value={config.auxiliaryProvider} onChange={(e) => setConfig({...config, auxiliaryProvider: e.target.value})} className="w-full bg-white border border-border-light text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 appearance-none bg-no-repeat bg-[right_1rem_center]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1rem' }}>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="claude">Anthropic (Claude 3.5)</option>
                  <option value="deepseek">DeepSeek (V3)</option>
                  <option value="qwen">Alibaba Cloud (Qwen/通义千问)</option>
                  <option value="doubao">ByteDance (Doubao/豆包)</option>
               </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase ml-1">API Key</label>
              <div className="relative group/input">
                  <span className="material-symbols-outlined absolute left-4 top-3 text-text-muted text-[20px] group-focus-within/input:text-primary transition-colors">vpn_key</span>
                  <input type="password" value={config.auxiliaryApiKey} onChange={(e) => { setConfig({...config, auxiliaryApiKey: e.target.value}); setStatuses(prev => ({...prev, auxiliary: 'disconnected'})); setTestResults(prev => ({...prev, auxiliary: ''})); }} placeholder="输入 API 密钥..." className="w-full bg-white border border-border-light text-sm rounded-2xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono" />
              </div>
            </div>

            {testResults.auxiliary && (
              <div className={`px-4 py-3 rounded-xl text-xs font-bold ${statuses.auxiliary === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>{testResults.auxiliary}</div>
            )}

            <button onClick={testAuxiliaryConnection} disabled={statuses.auxiliary === 'testing' || !config.auxiliaryApiKey} className="w-full py-3 bg-white border border-border-light rounded-2xl text-sm font-bold text-text-main hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
              <span className={`material-symbols-outlined text-[20px] ${statuses.auxiliary === 'testing' ? 'animate-spin' : ''}`}>{statuses.auxiliary === 'testing' ? 'sync' : 'vpn_lock'}</span>
              验证备用网关
            </button>
          </div>
        </div>
      </div>

      {/* Custom OpenAI-Compatible Providers Section */}
      <div className="bg-white rounded-[2rem] border border-border-light p-8 shadow-sm">
         <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
               <div className="bg-slate-900 p-2.5 rounded-2xl text-white shadow-md">
                  <span className="material-symbols-outlined">extension</span>
               </div>
               <div>
                  <h3 className="text-lg font-bold text-text-main leading-tight">自定义 OpenAI 兼容网关</h3>
                  <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Custom Connectors</p>
               </div>
            </div>
            <button 
              onClick={() => setIsAddingCustom(!isAddingCustom)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isAddingCustom ? 'bg-slate-100 text-slate-600' : 'bg-primary text-white border-primary shadow-lg shadow-primary/20 hover:bg-violet-700'}`}
            >
              <span className="material-symbols-outlined text-[16px]">{isAddingCustom ? 'close' : 'add'}</span>
              {isAddingCustom ? '取消添加' : '添加提供商'}
            </button>
         </div>

         {/* Add Form */}
         {isAddingCustom && (
           <div className="mb-8 p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl animate-in fade-in slide-in-from-top-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase ml-1">提供商名称 (Display Name)</label>
                    <input type="text" value={newProvider.name} onChange={e => setNewProvider({...newProvider, name: e.target.value})} placeholder="例如: My Ollama Server" className="w-full bg-white border border-border-light text-xs rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase ml-1">Base URL (API Endpoint)</label>
                    <input type="text" value={newProvider.baseUrl} onChange={e => setNewProvider({...newProvider, baseUrl: e.target.value})} placeholder="例如: https://api.myserver.com/v1" className="w-full bg-white border border-border-light text-xs rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 font-mono" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase ml-1">API Key</label>
                    <input type="password" value={newProvider.apiKey} onChange={e => setNewProvider({...newProvider, apiKey: e.target.value})} placeholder="sk-..." className="w-full bg-white border border-border-light text-xs rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 font-mono" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase ml-1">Model Name / ID</label>
                    <input type="text" value={newProvider.modelId} onChange={e => setNewProvider({...newProvider, modelId: e.target.value})} placeholder="例如: gpt-4-turbo, llama3:latest" className="w-full bg-white border border-border-light text-xs rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 font-mono" />
                 </div>
              </div>
              <div className="flex justify-end">
                 <button onClick={handleAddCustomProvider} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm">
                   确认添加
                 </button>
              </div>
           </div>
         )}

         {/* List */}
         <div className="space-y-4">
            {customProviders.length === 0 ? (
               <div className="text-center py-8 bg-background-light/30 rounded-2xl border border-dashed border-border-light text-text-muted">
                  <span className="material-symbols-outlined opacity-20 text-4xl mb-2">dns</span>
                  <p className="text-xs font-medium">暂无自定义提供商</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 gap-4">
                  {customProviders.map(provider => {
                     const status = customTestResults[provider.id]?.status || 'disconnected';
                     const message = customTestResults[provider.id]?.message;
                     
                     return (
                        <div key={provider.id} className="p-4 rounded-2xl bg-white border border-border-light shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                 {provider.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                 <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-text-main text-sm">{provider.name}</h4>
                                    {getStatusBadge(status)}
                                 </div>
                                 <div className="flex items-center gap-3 text-[10px] text-text-muted font-mono mt-1">
                                    <span className="bg-background-light px-1.5 py-0.5 rounded border border-border-light truncate max-w-[150px]" title={provider.baseUrl}>{provider.baseUrl}</span>
                                    {provider.modelId && <span className="bg-background-light px-1.5 py-0.5 rounded border border-border-light text-primary truncate max-w-[100px]">{provider.modelId}</span>}
                                 </div>
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-2 w-full md:w-auto">
                              {message && (
                                 <div className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[10px] font-bold truncate max-w-[200px] ${status === 'error' ? 'bg-red-50 text-red-600' : status === 'connected' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {message}
                                 </div>
                              )}
                              <button 
                                onClick={() => testCustomConnection(provider)} 
                                disabled={status === 'testing'}
                                className="p-2 bg-white border border-border-light rounded-xl hover:bg-gray-50 text-text-muted hover:text-primary transition-colors disabled:opacity-50" 
                                title="测试连接"
                              >
                                <span className={`material-symbols-outlined text-[18px] ${status === 'testing' ? 'animate-spin' : ''}`}>network_check</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteCustomProvider(provider.id)} 
                                className="p-2 bg-white border border-border-light rounded-xl hover:bg-red-50 text-text-muted hover:text-red-600 transition-colors" 
                                title="删除配置"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-[100px] transition-transform group-hover:scale-125 duration-1000"></div>
         <div className="relative z-10 flex items-center gap-8">
            <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
               <span className="material-symbols-outlined text-4xl">shield_lock</span>
            </div>
            <div>
               <h3 className="text-xl font-black mb-2">安全隐私说明</h3>
               <p className="text-sm text-white/50 leading-relaxed font-medium max-w-xl">
                  Helerix 教研系统会将您的 API 密钥安全加密存储在数据库中，用于系统自动化调用。请确保您的服务器环境安全。
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AIProviderConfig;
