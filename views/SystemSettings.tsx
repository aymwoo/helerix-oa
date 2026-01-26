
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { CustomProvider, PromptTemplate, PromptCategory } from '../types';
import { DatabaseManager, PromptDatabase } from '../db';
import * as Diff from 'diff';
import { useToast } from '../components/ToastContext';

type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'testing';
type SettingsTab = 'ai-config' | 'prompt-engineering' | 'system-maintenance';

const SystemSettings: React.FC = () => {
  const { success, error, warning, info } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai-config');

  // Custom Providers State
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [newProvider, setNewProvider] = useState<Omit<CustomProvider, 'id'>>({ name: '', baseUrl: '', apiKey: '', modelId: '' });
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [customTestResults, setCustomTestResults] = useState<Record<string, { status: ConnectionStatus, message: string }>>({});

  // Import Ref
  const importInputRef = useRef<HTMLInputElement>(null);

  // --- Prompt Management State ---
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<PromptCategory>('exam');
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [currentPromptContent, setCurrentPromptContent] = useState('');
  const [currentPromptName, setCurrentPromptName] = useState('');
  const [compareVersion, setCompareVersion] = useState<PromptTemplate | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  // --- Backup/Restore State ---
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- JSON Format Help State ---
  const [isJsonHelpOpen, setIsJsonHelpOpen] = useState(false);

  // --- Paste Preview Modal State ---
  const [isPastePreviewOpen, setIsPastePreviewOpen] = useState(false);
  const [pastePreviewJson, setPastePreviewJson] = useState<string>('');
  const [pastePreviewProviders, setPastePreviewProviders] = useState<CustomProvider[]>([]);
  const [pastePreviewError, setPastePreviewError] = useState<string | null>(null);

  // Load custom providers from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('helerix_custom_providers');
    if (saved) {
      try {
        setCustomProviders(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse custom providers", e);
      }
    }
  }, []);

  const fetchPrompts = async () => {
    await PromptDatabase.initialize();
    const data = await PromptDatabase.getAll(selectedPromptCategory);
    setPrompts(data);
    return data;
  };

  // Load Prompts when tab or category changes
  useEffect(() => {
    if (activeTab === 'prompt-engineering') {
      fetchPrompts().then((data) => {
        // Default to the currently active one (isDefault) or the latest one
        // Only if we haven't manually edited content yet? Actually, switching tabs should reset unless we track dirtiness.
        // For now, let's reset to default on tab switch.
        const defaultP = data.find(p => p.isDefault) || data[0];
        if (defaultP) {
          setCurrentPromptContent(defaultP.content);
          setCurrentPromptName(defaultP.name);
        } else {
          setCurrentPromptContent("");
          setCurrentPromptName("");
        }
      });
    }
  }, [activeTab, selectedPromptCategory]);

  const saveCustomProviders = (providers: CustomProvider[]) => {
    setCustomProviders(providers);
    localStorage.setItem('helerix_custom_providers', JSON.stringify(providers));
  };

  const handleAddCustomProvider = () => {
    if (!newProvider.name || !newProvider.baseUrl || !newProvider.apiKey) {
      warning("请填写必要信息 (名称, Base URL, API Key)");
      return;
    }

    if (editingProviderId) {
      // Update existing
      const updatedProviders = customProviders.map(p =>
        p.id === editingProviderId ? { ...newProvider, id: editingProviderId } : p
      );
      saveCustomProviders(updatedProviders);
      setEditingProviderId(null);
    } else {
      // Add new
      const provider: CustomProvider = {
        id: Date.now().toString(),
        ...newProvider
      };
      saveCustomProviders([...customProviders, provider]);
    }

    setNewProvider({ name: '', baseUrl: '', apiKey: '', modelId: '' });
    setIsAddingCustom(false);
  };

  const handleEditCustomProvider = (provider: CustomProvider) => {
    setNewProvider({
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      modelId: provider.modelId || ''
    });
    setEditingProviderId(provider.id);
    setIsAddingCustom(true);
  };

  const cancelAddOrEdit = () => {
    setIsAddingCustom(false);
    setNewProvider({ name: '', baseUrl: '', apiKey: '', modelId: '' });
    setEditingProviderId(null);
  };

  const handleImportProviders = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const json = JSON.parse(content);

        if (!Array.isArray(json)) {
          error("导入失败：JSON 根节点必须是数组格式。");
          return;
        }

        const validProviders: CustomProvider[] = [];
        for (const item of json) {
          if (item.name && item.baseUrl && item.apiKey) {
            validProviders.push({
              id: item.id || `cp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: item.name,
              baseUrl: item.baseUrl,
              apiKey: item.apiKey,
              modelId: item.modelId || ''
            });
          }
        }

        if (validProviders.length === 0) {
          error("未找到有效的提供商配置项。请检查 JSON 结构 (需包含 name, baseUrl, apiKey)。");
          return;
        }

        if (confirm(`解析成功，发现 ${validProviders.length} 个配置项。\n点击确定将其合并到当前列表。`)) {
          const updated = [...customProviders, ...validProviders];
          saveCustomProviders(updated);
          success("导入完成！");
        }

      } catch (e) {
        console.error(e);
        error("文件解析错误，请确保是有效的 JSON 文件。");
      } finally {
        if (importInputRef.current) importInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const parseAndPreview = (jsonText: string) => {
    setPastePreviewJson(jsonText);
    setPastePreviewError(null);
    setPastePreviewProviders([]);

    if (!jsonText.trim()) return;

    try {
      const json = JSON.parse(jsonText);

      if (!Array.isArray(json)) {
        setPastePreviewError("JSON 根节点必须是数组格式 (例如: [...] )");
        return;
      }

      const validProviders: CustomProvider[] = [];
      for (const item of json) {
        if (item.name && item.baseUrl && item.apiKey) {
          validProviders.push({
            id: item.id || `cp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: item.name,
            baseUrl: item.baseUrl,
            apiKey: item.apiKey,
            modelId: item.modelId || ''
          });
        }
      }

      if (validProviders.length === 0) {
        setPastePreviewError("未找到有效的提供商配置项。请检查 JSON 结构 (需包含 name, baseUrl, apiKey)");
        return;
      }

      setPastePreviewProviders(validProviders);
    } catch (e: any) {
      setPastePreviewError(`JSON 解析错误: ${e.message}`);
    }
  };

  const handlePasteProviders = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();

      // Even if empty or invalid, we show the modal so user can paste/edit manually
      setIsPastePreviewOpen(true);
      if (clipboardText.trim()) {
        parseAndPreview(clipboardText);
      } else {
        setPastePreviewJson('');
        setPastePreviewError(null);
      }

    } catch (error: any) {
      console.error(error);
      if (error.name === 'NotAllowedError') {
        // Fallback: Just open empty modal
        setIsPastePreviewOpen(true);
        setPastePreviewJson('');
        setPastePreviewError("无法自动读取剪贴板，请手动粘贴内容到下方文本框。");
      } else {
        error(`剪贴板访问失败：${error.message}`);
      }
    }
  };

  const confirmPasteImport = () => {
    if (pastePreviewProviders.length === 0) return;
    const updated = [...customProviders, ...pastePreviewProviders];
    saveCustomProviders(updated);
    setIsPastePreviewOpen(false);
    setPastePreviewJson('');
    setPastePreviewProviders([]);
    setPastePreviewError(null);
    success(`成功导入 ${pastePreviewProviders.length} 个提供商配置！`);
  };

  const cancelPasteImport = () => {
    setIsPastePreviewOpen(false);
    setPastePreviewJson('');
    setPastePreviewProviders([]);
    setPastePreviewError(null);
  };

  const handleDeleteCustomProvider = (id: string) => {
    if (!window.confirm("确定删除此自定义提供商配置吗？")) return;
    saveCustomProviders(customProviders.filter(p => p.id !== id));
    const newResults = { ...customTestResults };
    delete newResults[id];
    setCustomTestResults(newResults);
  };

  const testCustomConnection = async (provider: CustomProvider) => {
    setCustomTestResults(prev => ({ ...prev, [provider.id]: { status: 'testing', message: '正在尝试握手...' } }));

    try {
      let url = provider.baseUrl.replace(/\/$/, "");
      if (!url.endsWith('/chat/completions')) {
        url = `${url}/chat/completions`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          model: provider.modelId || 'gpt-3.5-turbo',
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

  const handleBackup = async () => {
    try {
      const data = await DatabaseManager.exportDatabase();
      if (data) {
        const blob = new Blob([data as any], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.href = url;
        a.download = `helerix_backup_${date}.db`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Backup failed", e);
      error("导出备份失败");
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("警告：恢复操作将完全覆盖当前系统的所有数据（用户、证书、教研记录等）。\n\n您确定要继续吗？")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const u8 = new Uint8Array(buffer);
        const successResult = await DatabaseManager.importDatabase(u8);
        if (successResult) {
          success("系统数据恢复成功。页面即将刷新以应用变更。");
          setTimeout(() => window.location.reload(), 1500);
        } else {
          throw new Error("Import function returned false");
        }
      } catch (err) {
        console.error(err);
        error("恢复失败：文件格式错误或数据库损坏。");
        setIsRestoring(false);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSavePrompt = async (asNew: boolean = true) => {
    if (!currentPromptContent.trim()) return;
    const name = prompt("请为该提示词版本命名:", asNew ? `版本 ${new Date().toLocaleDateString()}` : currentPromptName);
    if (!name) return;

    const newPrompt: PromptTemplate = {
      id: Date.now().toString(),
      name: name,
      content: currentPromptContent,
      isDefault: true, // Saving typically implies setting as current active
      timestamp: Date.now(),
      category: selectedPromptCategory
    };

    await PromptDatabase.add(newPrompt);
    // Refresh list to ensure we see all versions
    fetchPrompts();
    setCurrentPromptName(name);
    success("提示词版本已保存并设为默认。");
  };

  const handleRestoreVersion = (p: PromptTemplate) => {
    if (confirm(`确定要加载历史版本 "${p.name}" 吗？当前编辑区内容将被覆盖。`)) {
      setCurrentPromptContent(p.content);
      setCurrentPromptName(p.name);
    }
  };

  const handleCompareVersion = (p: PromptTemplate) => {
    setCompareVersion(p);
    setIsDiffModalOpen(true);
  };

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-[10px] font-semibold border border-green-200"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>已连接</div>;
      case 'testing': return <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-semibold border border-blue-200"><span className="material-symbols-outlined text-[12px] animate-spin">sync</span>检测中</div>;
      case 'error': return <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-[10px] font-semibold border border-red-200"><span className="material-symbols-outlined text-[12px]">error</span>连接错误</div>;
      default: return <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-semibold border border-gray-200">未连接</div>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col gap-2 pb-4 border-b border-[#E5E7EB]">
        <h1 className="text-3xl font-semibold text-text-main tracking-tight">系统设置</h1>
        <p className="text-text-muted text-base font-normal">
          管理 AI 引擎连接参数、提示词工程及系统数据维护。
        </p>
      </div>

      {/* Tabs - Pill Shape per Design JSON */}
      {/* Tabs - Containerized Segmented Control style for better visibility */}
      <div className="bg-white p-1.5 rounded-xl border border-[#E5E7EB] shadow-sm inline-flex gap-1 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab('ai-config')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'ai-config' ? 'bg-[#8B5CF6] text-white shadow-sm ring-1 ring-black/5' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <span className="material-symbols-outlined text-[18px]">hub</span>
          AI 模型配置
        </button>
        <button
          onClick={() => setActiveTab('prompt-engineering')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'prompt-engineering' ? 'bg-[#8B5CF6] text-white shadow-sm ring-1 ring-black/5' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <span className="material-symbols-outlined text-[18px]">psychology</span>
          提示词工程
        </button>
        <button
          onClick={() => setActiveTab('system-maintenance')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'system-maintenance' ? 'bg-[#8B5CF6] text-white shadow-sm ring-1 ring-black/5' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <span className="material-symbols-outlined text-[18px]">database</span>
          系统维护与备份
        </button>
      </div>

      {/* Content Area */}
      <div className="mt-6">
        {activeTab === 'ai-config' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            {/* Custom Providers */}
            {/* Custom Providers - Card Style per Design JSON: rounded-xl (12px), p-6 (24px), shadow */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 p-2.5 rounded-2xl text-white shadow-md">
                    <span className="material-symbols-outlined">extension</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-main leading-tight">自定义 OpenAI 兼容网关</h3>
                    <p className="text-xs text-text-muted mt-0.5">连接 Qwen、DeepSeek、Ollama 等兼容接口。</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={importInputRef}
                    onChange={handleImportProviders}
                    className="hidden"
                    accept=".json"
                  />
                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    导入配置
                  </button>
                  <button
                    onClick={handlePasteProviders}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
                    title="从剪贴板粘贴 JSON 配置"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_paste</span>
                    粘贴配置
                  </button>
                  <button
                    onClick={() => isAddingCustom ? cancelAddOrEdit() : setIsAddingCustom(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isAddingCustom ? 'bg-gray-100 text-gray-600' : 'bg-[#8B5CF6] text-white hover:bg-violet-600 shadow-sm'}`}
                  >
                    {isAddingCustom ? '取消' : '+ 添加提供商'}
                  </button>
                </div>
              </div>

              {/* JSON Format Help - Collapsible */}
              <div className="mb-4">
                <button
                  onClick={() => setIsJsonHelpOpen(!isJsonHelpOpen)}
                  className="flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-[#8B5CF6] transition-colors"
                >
                  <span className={`material-symbols-outlined text-[16px] transition-transform ${isJsonHelpOpen ? 'rotate-90' : ''}`}>
                    chevron_right
                  </span>
                  <span className="material-symbols-outlined text-[14px]">help</span>
                  JSON 导入格式说明
                </button>

                {isJsonHelpOpen && (
                  <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#8B5CF6] text-[18px]">code</span>
                          JSON 格式示例
                        </h4>
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
                          {`[
  {
    "name": "通义千问 Qwen",
    "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "apiKey": "sk-your-api-key",
    "modelId": "qwen-turbo"
  },
  {
    "name": "DeepSeek",
    "baseUrl": "https://api.deepseek.com/v1",
    "apiKey": "sk-xxx",
    "modelId": "deepseek-chat"
  }
]`}
                        </pre>
                      </div>
                      <div className="w-64 shrink-0">
                        <h4 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#8B5CF6] text-[18px]">list</span>
                          字段说明
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="p-2 bg-white rounded-lg border border-slate-200">
                            <span className="font-semibold text-violet-600">name</span>
                            <span className="text-red-500 ml-0.5">*</span>
                            <p className="text-text-muted mt-0.5">提供商显示名称</p>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-slate-200">
                            <span className="font-semibold text-violet-600">baseUrl</span>
                            <span className="text-red-500 ml-0.5">*</span>
                            <p className="text-text-muted mt-0.5">API 接口地址</p>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-slate-200">
                            <span className="font-semibold text-violet-600">apiKey</span>
                            <span className="text-red-500 ml-0.5">*</span>
                            <p className="text-text-muted mt-0.5">API 密钥</p>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-slate-200">
                            <span className="font-semibold text-violet-600">modelId</span>
                            <p className="text-text-muted mt-0.5">模型名称（可选）</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-text-muted mt-3 flex items-center gap-1">
                          <span className="text-red-500">*</span> 必填字段
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {isAddingCustom && (
                <div className="mb-8 p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl animate-in fade-in slide-in-from-top-4">
                  {/* Quick Templates - Only show when adding new */}
                  {!editingProviderId && (
                    <div className="flex flex-wrap gap-2 mb-6 items-center">
                      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mr-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        快速模板:
                      </span>
                      {[
                        { name: '通义千问 (Qwen)', config: { name: 'Alibaba Qwen', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelId: 'qwen-turbo' } },
                        { name: '字节豆包 (Doubao)', config: { name: 'ByteDance Doubao', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', modelId: 'ep-2025xxxx-xxxxx' } },
                        { name: 'OpenAI 兼容', config: { name: 'Custom Service', baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-4o' } }
                      ].map((t) => (
                        <button
                          key={t.name}
                          onClick={() => setNewProvider({ ...newProvider, ...t.config })}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-all shadow-sm active:scale-95"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-text-main">
                    <span className="material-symbols-outlined text-[#8B5CF6]">{editingProviderId ? 'edit' : 'add_circle'}</span>
                    {editingProviderId ? '编辑提供商配置' : '手动输入配置'}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-text-muted uppercase ml-1">提供商名称 (Display Name)</label>
                      <input type="text" value={newProvider.name} onChange={e => setNewProvider({ ...newProvider, name: e.target.value })} placeholder="例如: My Ollama Server" className="w-full bg-white border border-[#E5E7EB] text-xs rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 font-semibold" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-text-muted uppercase ml-1">Base URL (API Endpoint)</label>
                      <input type="text" value={newProvider.baseUrl} onChange={e => setNewProvider({ ...newProvider, baseUrl: e.target.value })} placeholder="例如: https://api.myserver.com/v1" className="w-full bg-white border border-[#E5E7EB] text-xs rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-text-muted uppercase ml-1">API Key</label>
                      <input type="password" value={newProvider.apiKey} onChange={e => setNewProvider({ ...newProvider, apiKey: e.target.value })} placeholder="sk-..." className="w-full bg-white border border-[#E5E7EB] text-xs rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-text-muted uppercase ml-1">Model Name / ID</label>
                      <input type="text" value={newProvider.modelId} onChange={e => setNewProvider({ ...newProvider, modelId: e.target.value })} placeholder="例如: gpt-4-turbo, llama3:latest" className="w-full bg-white border border-[#E5E7EB] text-xs rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 font-mono" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    {editingProviderId && (
                      <button onClick={cancelAddOrEdit} className="px-5 py-2 bg-white border border-[#E5E7EB] text-text-muted rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors">
                        取消修改
                      </button>
                    )}
                    <button onClick={handleAddCustomProvider} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm active:scale-95">
                      {editingProviderId ? '保存修改' : '确认添加'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {customProviders.length === 0 ? (
                  <div className="text-center py-[60px] text-gray-400 border border-dashed border-gray-200 rounded-lg mt-4">
                    <span className="material-symbols-outlined opacity-50 text-4xl mb-2">dns</span>
                    <p className="text-sm">暂无自定义提供商</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {customProviders.map(provider => {
                      const status = customTestResults[provider.id]?.status || 'disconnected';
                      const message = customTestResults[provider.id]?.message;
                      return (
                        <div key={provider.id} className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-semibold border border-slate-200">
                              {provider.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-text-main text-sm">{provider.name}</h4>
                                {getStatusBadge(status)}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-text-muted font-mono mt-1">
                                <span className="bg-background-light px-1.5 py-0.5 rounded border border-[#E5E7EB] truncate max-w-[150px]" title={provider.baseUrl}>{provider.baseUrl}</span>
                                {provider.modelId && <span className="bg-background-light px-1.5 py-0.5 rounded border border-[#E5E7EB] text-[#8B5CF6] truncate max-w-[100px]">{provider.modelId}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full md:w-auto">
                            {message && (
                              <div className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[10px] font-semibold truncate max-w-[200px] ${status === 'error' ? 'bg-red-50 text-red-600' : status === 'connected' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                {message}
                              </div>
                            )}
                            <button onClick={() => testCustomConnection(provider)} disabled={status === 'testing'} className="p-2 bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50 text-text-muted hover:text-[#8B5CF6] transition-colors disabled:opacity-50" title="测试连接"><span className={`material-symbols-outlined text-[18px] ${status === 'testing' ? 'animate-spin' : ''}`}>network_check</span></button>
                            <button onClick={() => handleEditCustomProvider(provider)} className="p-2 bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50 text-text-muted hover:text-[#8B5CF6] transition-colors" title="编辑配置"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                            <button onClick={() => handleDeleteCustomProvider(provider.id)} className="p-2 bg-white border border-[#E5E7EB] rounded-xl hover:bg-red-50 text-text-muted hover:text-red-600 transition-colors" title="删除配置"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prompt-engineering' && (
          <div className="grid grid-cols-12 gap-8 animate-in slide-in-from-bottom-2 duration-300">
            {/* Left: Editor Area */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              {/* Module Selector */}
              <div className="flex items-center gap-2 mb-2">
                {['exam', 'certificate', 'critic'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedPromptCategory(cat as PromptCategory)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${selectedPromptCategory === cat ? 'bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-md' : 'bg-white text-text-muted border-[#E5E7EB] hover:bg-gray-50'}`}
                  >
                    {cat === 'exam' ? '试卷分析' : cat === 'certificate' ? '证书识别' : '方案批评者'}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-[2rem] border border-[#E5E7EB] shadow-sm p-6 flex flex-col gap-4 h-[600px]">
                <div className="flex justify-between items-center pb-4 border-b border-[#E5E7EB]">
                  <div>
                    <h3 className="font-semibold text-text-main">当前指令内容 (System Prompt)</h3>
                    <p className="text-xs text-text-muted mt-0.5">此内容将作为 AI 的系统预设 (System Instruction) 生效</p>
                  </div>
                  <button
                    onClick={() => handleSavePrompt(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] text-white rounded-xl text-xs font-semibold hover:bg-violet-700 shadow-lg shadow-[#8B5CF6]/20 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    保存为新版本
                  </button>
                </div>
                <textarea
                  value={currentPromptContent}
                  onChange={(e) => setCurrentPromptContent(e.target.value)}
                  className="flex-1 w-full bg-background-light/30 border border-[#E5E7EB] rounded-xl p-4 text-sm font-mono text-text-main outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 resize-none leading-relaxed"
                  placeholder="在此输入系统指令..."
                />
              </div>
            </div>

            {/* Right: History & Actions */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-white rounded-[2rem] border border-[#E5E7EB] shadow-sm p-6 h-[650px] flex flex-col">
                <h3 className="font-semibold text-text-main mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8B5CF6]">history</span>
                  版本历史
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {prompts.map((p) => (
                    <div key={p.id} className={`p-4 rounded-xl border transition-all group ${p.isDefault ? 'bg-[#8B5CF6]/5 border-[#8B5CF6] shadow-sm' : 'bg-white border-[#E5E7EB] hover:border-[#8B5CF6]/30'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-sm text-text-main line-clamp-1">{p.name}</h4>
                          <p className="text-[10px] text-text-muted font-mono mt-0.5">{new Date(p.timestamp).toLocaleString()}</p>
                        </div>
                        {p.isDefault && (
                          <span className="px-2 py-0.5 bg-[#8B5CF6] text-white text-[9px] font-semibold rounded uppercase">Active</span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRestoreVersion(p)}
                          className="flex-1 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-[10px] font-semibold text-text-muted hover:text-[#8B5CF6] hover:border-[#8B5CF6] transition-colors"
                        >
                          恢复此版
                        </button>
                        <button
                          onClick={() => handleCompareVersion(p)}
                          className="flex-1 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-[10px] font-semibold text-text-muted hover:text-blue-600 hover:border-blue-300 transition-colors"
                        >
                          Diff 比对
                        </button>
                      </div>
                    </div>
                  ))}
                  {prompts.length === 0 && (
                    <div className="text-center py-10 text-text-muted text-xs">暂无历史版本</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system-maintenance' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-[2rem] border border-[#E5E7EB] p-10 shadow-sm flex flex-col md:flex-row gap-10 items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-slate-900/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <div className="relative z-10 max-w-lg">
                <h2 className="text-2xl font-semibold text-text-main mb-4">系统数据快照备份</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  导出当前系统内的所有数据（包括用户信息、排期、证书记录及 Prompt 预设）为一个独立的 SQLite 数据库文件 (.db)。
                  <br /><br />
                  建议每周定期备份，以防本地浏览器缓存清理导致数据丢失。
                </p>
              </div>
              <div className="relative z-10 shrink-0">
                <button
                  onClick={handleBackup}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-semibold shadow-xl hover:bg-slate-800 hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
                >
                  <span className="material-symbols-outlined text-3xl">cloud_download</span>
                  <div className="text-left">
                    <span className="block text-xs text-white/50 uppercase tracking-wider">Download</span>
                    <span className="block text-sm">导出数据备份</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-red-50/50 rounded-[2rem] border border-red-100 p-10 shadow-sm flex flex-col md:flex-row gap-10 items-center justify-between">
              <div className="max-w-lg">
                <div className="flex items-center gap-2 mb-4 text-red-600">
                  <span className="material-symbols-outlined">warning</span>
                  <h2 className="text-2xl font-semibold">灾难恢复 / 数据迁移</h2>
                </div>
                <p className="text-sm text-red-800/70 leading-relaxed font-medium">
                  从备份文件恢复数据将<strong className="text-red-600">永久覆盖</strong>当前系统内的所有记录。此操作不可撤销。
                  <br />
                  请确保上传的是由本系统导出的有效 SQLite 数据库文件。
                </p>
              </div>
              <div className="shrink-0 w-full md:w-auto">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".db,.sqlite,.sqlite3"
                  onChange={handleRestore}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoring}
                  className="w-full md:w-auto px-8 py-4 bg-white text-red-600 border border-red-200 rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-red-50 hover:border-red-300 transition-all active:scale-95 flex items-center gap-3 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRestoring ? (
                    <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-3xl">upload_file</span>
                  )}
                  <div className="text-left">
                    <span className="block text-xs text-red-400 uppercase tracking-wider">Restore</span>
                    <span className="block text-sm">{isRestoring ? '正在恢复...' : '导入备份文件'}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Diff Modal */}
        {isDiffModalOpen && compareVersion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl h-[80vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-border-light flex justify-between items-center bg-background-light/50">
                <div>
                  <h3 className="text-lg font-bold text-text-main">版本比对 (Diff Check)</h3>
                  <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-200"></span> 旧版本: {compareVersion.name}</span>
                    <span className="material-symbols-outlined text-[12px]">arrow_right_alt</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-200"></span> 当前编辑版</span>
                  </div>
                </div>
                <button onClick={() => setIsDiffModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed">
                {Diff.diffLines(compareVersion.content, currentPromptContent).map((part, index) => {
                  const color = part.added ? 'bg-green-100 text-green-900' : part.removed ? 'bg-red-50 text-red-900 line-through decoration-red-300 opacity-60' : 'text-text-muted';
                  const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
                  return (
                    <span key={index} className={`block whitespace-pre-wrap px-2 py-0.5 ${color}`}>
                      {prefix}{part.value}
                    </span>
                  )
                })}
              </div>

              <div className="p-4 border-t border-border-light flex justify-end gap-3 bg-background-light/20">
                <button onClick={() => setIsDiffModalOpen(false)} className="px-6 py-2.5 bg-white border border-border-light rounded-lg font-semibold text-sm text-text-main hover:bg-gray-50 transition-colors">关闭</button>
                <button
                  onClick={() => { handleRestoreVersion(compareVersion); setIsDiffModalOpen(false); }}
                  className="px-6 py-2.5 bg-[#8B5CF6] text-white rounded-lg font-semibold text-sm shadow-lg shadow-[#8B5CF6]/20 hover:bg-violet-700 transition-colors"
                >
                  回滚到旧版本
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Paste Preview Modal */}
      {isPastePreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined">content_paste</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-main">确认导入配置</h3>
                  <p className="text-xs text-text-muted">检查以下 JSON 内容，确认后将导入 {pastePreviewProviders.length} 个提供商</p>
                </div>
              </div>
              <button onClick={cancelPasteImport} className="text-text-muted hover:text-text-main p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* JSON Preview - Editable */}
              <div className="flex-1 p-5 overflow-auto border-r border-border-light flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#8B5CF6] text-[18px]">code</span>
                    JSON 内容 (可编辑)
                  </h4>
                  {pastePreviewError ? (
                    <span className="text-[10px] text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">error</span>
                      格式错误
                    </span>
                  ) : (
                    <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded border border-green-100 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                      格式正确
                    </span>
                  )}
                </div>
                <textarea
                  className={`flex-1 w-full bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono resize outline-none border-2 transition-colors leading-relaxed ${pastePreviewError ? 'border-red-500/50' : 'border-transparent focus:border-[#8B5CF6]/50'}`}
                  value={pastePreviewJson}
                  onChange={(e) => parseAndPreview(e.target.value)}
                  placeholder="在此处粘贴或输入 JSON 配置..."
                  spellCheck={false}
                />
                {pastePreviewError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
                    <p className="font-semibold flex items-center gap-1 mb-1">
                      解析失败:
                    </p>
                    <p className="font-mono text-[10px] break-all opacity-80">{pastePreviewError}</p>
                  </div>
                )}
              </div>

              {/* Parsed Providers */}
              <div className="w-full md:w-80 p-5 bg-slate-50 overflow-auto flex flex-col">
                <h4 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2 shrink-0">
                  <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                  解析结果 ({pastePreviewProviders.length} 个)
                </h4>

                {pastePreviewProviders.length > 0 ? (
                  <div className="space-y-3 overflow-y-auto pr-1">
                    {pastePreviewProviders.map((provider, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-border-light shadow-sm animate-in fade-in slide-in-from-right-4" style={{ animationDelay: `${idx * 50}ms` }}>
                        <h5 className="font-semibold text-text-main text-sm truncate">{provider.name}</h5>
                        <p className="text-[10px] text-text-muted mt-1 truncate font-mono">{provider.baseUrl}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-semibold border border-green-100">
                            ✓ API Key
                          </span>
                          {provider.modelId && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-semibold border border-blue-100 truncate max-w-[100px]">
                              {provider.modelId}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-text-muted opacity-50 space-y-2">
                    <span className="material-symbols-outlined text-4xl">inventory_2</span>
                    <p className="text-xs text-center">暂无有效配置<br />请检查左侧 JSON</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-5 border-t bg-white flex justify-end gap-3">
              <button
                onClick={cancelPasteImport}
                className="px-6 py-2.5 border rounded-lg text-text-muted font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmPasteImport}
                disabled={pastePreviewProviders.length === 0}
                className="px-6 py-2.5 bg-[#8B5CF6] text-white rounded-lg font-semibold text-sm shadow-lg shadow-[#8B5CF6]/20 hover:bg-violet-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                确认导入 {pastePreviewProviders.length > 0 ? `${pastePreviewProviders.length} 个` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
