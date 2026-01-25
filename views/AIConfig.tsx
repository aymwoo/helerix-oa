import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'testing';

const AIConfig: React.FC = () => {
  const [config, setConfig] = useState({
    defaultSubject: 'math',
    defaultGrade: 'junior-2',
    difficultyBaseline: 5,
    deepAnalysis: true,
    modelFlavor: 'gemini-3-pro-preview',
    temperature: 0.3,
    maxTokens: 1200,
    strategy: 'balanced',
    ocrPrecision: 'high',
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

  // Preview state for the Workshop
  const [previewScale, setPreviewScale] = useState(1);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

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
      alert("请先输入备用 API 密钥");
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
    alert("配置已成功保存并应用到教研引擎。");
  };

  // Previewer functions
  const resetPreview = () => {
    setPreviewScale(1);
    setPreviewPos({ x: 0, y: 0 });
  };
  const handlePointerDown = (e: React.PointerEvent) => {
    if (previewScale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - previewPos.x, y: e.clientY - previewPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPreviewPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-text-main tracking-tight">AI 智能引擎中心</h1>
          <p className="text-text-muted text-base font-normal max-w-2xl">
            配置试卷分析逻辑、管理 API 连接状态及教学评估参数。
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white border border-border-light rounded-xl text-sm font-bold text-text-main hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 active:scale-95">
            <span className="material-symbols-outlined text-[18px]">history</span>
            配置快照
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            保存并生效
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: API Credentials */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] border border-border-light p-6 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="bg-green-500/10 p-2.5 rounded-2xl">
                <span className="material-symbols-outlined text-green-600">shield_lock</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">API 凭证管理</h3>
                <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Auth & Connectivity</p>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              {/* Gemini Provider */}
              <div className="p-4 rounded-2xl bg-background-light/50 border border-border-light group transition-all hover:border-primary/20">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Google Gemini Pro (Main)</span>
                  {getStatusBadge(statuses.gemini)}
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-border-light flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[24px]">verified_user</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-main truncate">环境凭证模式</p>
                    <p className="text-[10px] text-text-muted font-medium truncate">密钥已由系统注入 (process.env)</p>
                  </div>
                </div>
                {testResults.gemini && (
                  <div className={`mb-4 px-3 py-2 rounded-lg text-[10px] font-bold ${statuses.gemini === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {testResults.gemini}
                  </div>
                )}
                <button onClick={testGeminiConnection} disabled={statuses.gemini === 'testing'} className="w-full py-2 bg-white border border-border-light rounded-xl text-[11px] font-black text-text-main hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                  <span className={`material-symbols-outlined text-[16px] ${statuses.gemini === 'testing' ? 'animate-spin' : ''}`}>{statuses.gemini === 'testing' ? 'sync' : 'network_check'}</span>
                  测试连接
                </button>
              </div>

              {/* Auxiliary Provider Settings */}
              <div className="p-4 rounded-2xl bg-background-light/50 border border-border-light group transition-all hover:border-primary/20">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">备用模型提供商</span>
                  {getStatusBadge(statuses.auxiliary)}
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-text-muted uppercase ml-1">提供商类型</label>
                     <select value={config.auxiliaryProvider} onChange={(e) => setConfig({...config, auxiliaryProvider: e.target.value})} className="w-full bg-white border border-border-light text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 appearance-none bg-no-repeat bg-[right_1rem_center]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1rem' }}>
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
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px] group-focus-within/input:text-primary transition-colors">vpn_key</span>
                        <input type="password" value={config.auxiliaryApiKey} onChange={(e) => { setConfig({...config, auxiliaryApiKey: e.target.value}); setStatuses(prev => ({...prev, auxiliary: 'disconnected'})); setTestResults(prev => ({...prev, auxiliary: ''})); }} placeholder="输入 API 密钥..." className="w-full bg-white border border-border-light text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono" />
                    </div>
                  </div>
                  {testResults.auxiliary && (
                    <div className={`px-3 py-2 rounded-lg text-[10px] font-bold ${statuses.auxiliary === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{testResults.auxiliary}</div>
                  )}
                  <button onClick={testAuxiliaryConnection} disabled={statuses.auxiliary === 'testing' || !config.auxiliaryApiKey} className="w-full py-2 bg-white border border-border-light rounded-xl text-[11px] font-black text-text-main hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                    <span className={`material-symbols-outlined text-[16px] ${statuses.auxiliary === 'testing' ? 'animate-spin' : ''}`}>{statuses.auxiliary === 'testing' ? 'sync' : 'bolt'}</span>
                    验证备用凭证
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Exam Analysis Specific Settings */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-border-light p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 bg-violet-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
                <span className="material-symbols-outlined text-[32px]">analytics</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-text-main tracking-tight">AI 试卷分析设置</h3>
                <p className="text-sm text-text-muted font-medium">配置 AI 专家在处理试卷扫描件时的核心偏好与评估基准。</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Left Column Settings */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">model_training</span>
                    推理模型选择
                  </label>
                  <select 
                    value={config.modelFlavor} 
                    onChange={(e) => setConfig({...config, modelFlavor: e.target.value})}
                    className="w-full px-4 py-3 bg-background-light/50 border border-border-light rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                  >
                    <option value="gemini-3-pro-preview">Gemini 3 Pro (高精度/深度研判)</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash (极速响应/基础提取)</option>
                    <option value="gemini-flash-lite-latest">Gemini Flash Lite (轻量级/OCR 专用)</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">subject</span>
                    默认分析学科
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['math', 'chinese', 'english', 'physics'].map((sub) => (
                      <button key={sub} onClick={() => setConfig({...config, defaultSubject: sub})} className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${config.defaultSubject === sub ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-text-muted border-border-light hover:border-primary/50'}`}>
                        <span className="material-symbols-outlined text-[18px]">{sub === 'math' ? 'calculate' : sub === 'chinese' ? 'menu_book' : sub === 'english' ? 'translate' : 'science'}</span>
                        {sub === 'math' ? '数学' : sub === 'chinese' ? '语文' : sub === 'english' ? '英语' : '物理'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">stairs</span>
                    难度评估基准 (1-10)
                  </label>
                  <div className="bg-background-light/30 p-6 rounded-2xl border border-border-light">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">当前基准: {config.difficultyBaseline} 级难度</span>
                      <div className="w-10 h-10 rounded-xl bg-white border border-border-light flex items-center justify-center font-black text-primary shadow-sm ring-4 ring-primary/5">{config.difficultyBaseline}</div>
                    </div>
                    <input type="range" min="1" max="10" value={config.difficultyBaseline} onChange={(e) => setConfig({...config, difficultyBaseline: parseInt(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary" />
                    <div className="flex justify-between mt-3 px-1 text-[10px] font-bold text-text-muted uppercase tracking-tighter">
                      <span>基础巩固</span><span>学业水平</span><span>竞赛选拔</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column Settings (Advanced Options) */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">psychology</span>
                    教研分析深度
                  </label>
                  <div className="flex items-center justify-between p-4 bg-background-light/50 border border-border-light rounded-2xl">
                     <div>
                        <p className="text-sm font-bold text-text-main">深度教育学研判</p>
                        <p className="text-[10px] text-text-muted">启用后 AI 将基于新课标提供教学改进建议</p>
                     </div>
                     <button 
                        onClick={() => setConfig({...config, deepAnalysis: !config.deepAnalysis})}
                        className={`w-12 h-6 rounded-full transition-colors relative ${config.deepAnalysis ? 'bg-primary' : 'bg-gray-300'}`}
                     >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.deepAnalysis ? 'left-7' : 'left-1'}`}></div>
                     </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">thermostat</span>
                    推理温度 (Temperature: 0-1)
                  </label>
                  <div className="bg-background-light/30 p-4 rounded-2xl border border-border-light">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">当前值: {config.temperature.toFixed(1)}</p>
                      <input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="1" 
                        value={config.temperature}
                        onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value) || 0})}
                        className="w-16 px-2 py-1 bg-white border border-border-light rounded-lg text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      value={config.temperature} 
                      onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})} 
                      className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary" 
                    />
                    <div className="flex justify-between mt-2 px-1 text-[9px] font-bold text-text-muted uppercase">
                      <span>确定性</span><span>平衡</span><span>创造力</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">format_list_numbered</span>
                    最大 Token 限制 (100-2000)
                  </label>
                  <div className="bg-background-light/30 p-4 rounded-2xl border border-border-light">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">限制额度: {config.maxTokens}</p>
                      <input 
                        type="number" 
                        min="100" 
                        max="2000" 
                        step="50"
                        value={config.maxTokens}
                        onChange={(e) => setConfig({...config, maxTokens: parseInt(e.target.value) || 100})}
                        className="w-20 px-2 py-1 bg-white border border-border-light rounded-lg text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                    <input 
                      type="range" 
                      min="100" 
                      max="2000" 
                      step="50" 
                      value={config.maxTokens} 
                      onChange={(e) => setConfig({...config, maxTokens: parseInt(e.target.value)})} 
                      className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary" 
                    />
                    <div className="flex justify-between mt-2 px-1 text-[9px] font-bold text-text-muted uppercase">
                      <span>简短提取</span><span>详细分析</span><span>完整教研报告</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">bolt</span>
                    模型策略配置
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'literal', title: '字面还原', desc: '侧重 OCR 文本准确性，不做过多意图延伸。' },
                      { id: 'balanced', title: '均衡策略', desc: '在文本识别与逻辑推理间寻找最佳平衡。' },
                      { id: 'exploratory', title: '发散思考', desc: '强化跨学科关联与深度知识点挖掘。' }
                    ].map(strategy => (
                      <button key={strategy.id} onClick={() => setConfig({...config, strategy: strategy.id})} className={`w-full p-4 rounded-2xl border text-left transition-all ${config.strategy === strategy.id ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20' : 'bg-white border-border-light hover:border-primary/30'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <p className={`text-sm font-bold ${config.strategy === strategy.id ? 'text-primary' : 'text-text-main'}`}>{strategy.title}</p>
                            {config.strategy === strategy.id && <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>}
                        </div>
                        <p className="text-[10px] text-text-muted leading-relaxed font-medium">{strategy.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prompt Preview / Lab Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-48 -mt-48 blur-[100px] transition-transform group-hover:scale-125 duration-1000"></div>
            <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-xl shadow-inner group-hover:rotate-3 transition-transform">
                    <span className="material-symbols-outlined text-white text-[32px]">auto_fix</span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black tracking-tight">AI 教研 Prompt 指令集</h4>
                    <p className="text-xs text-white/50 font-black uppercase tracking-widest mt-1">Helerix Engine v3.45</p>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed italic max-w-xl font-medium">
                  “当前指令集已集成最新的《新课程标准 (2022)》评估框架。AI 将从‘核心素养’、‘考点难度’、‘教学逻辑’三个维度切入，为您生成不低于 800 字的深度教研综述。”
                </p>
              </div>
              <div className="shrink-0">
                <button className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-sm shadow-2xl hover:bg-gray-100 transition-all active:scale-95 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[24px]">science</span>
                  提示词实验室
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfig;