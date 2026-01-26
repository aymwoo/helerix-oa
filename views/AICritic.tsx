
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { CustomProvider, PromptTemplate, CriticMessage, CriticSession } from '../types';
import { PromptDatabase, CriticDatabase, AIProviderDatabase } from '../db';

const AICritic: React.FC = () => {
  const [sessions, setSessions] = useState<CriticSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CriticMessage[]>([
    {
      id: 'intro',
      role: 'model',
      text: "我是您的 AI 批评者。请直接输入您的教研方案或上传文档，我会立即开始“找茬”，指出其中的漏洞与不足。"
    }
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<{ type: 'image' | 'pdf'; data: string; name: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Custom Provider State
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');

  // Prompt State
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [systemInstruction, setSystemInstruction] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const loadInitData = async () => {
      // Load Custom Providers
      try {
        const providers = await AIProviderDatabase.getAll();
        setCustomProviders(providers);
        if (providers.length > 0) setSelectedProviderId(providers[0].id);
      } catch (e) {
        console.error("Failed to load providers", e);
      }

      // Load Prompts
      await PromptDatabase.initialize();
      const loadedPrompts = await PromptDatabase.getAll('critic');
      setPrompts(loadedPrompts);
      const active = loadedPrompts.find(p => p.isDefault) || loadedPrompts[0];
      if (active) {
        setSelectedPromptId(active.id);
        setSystemInstruction(active.content);
      }

      // Load Sessions
      await CriticDatabase.initialize();
      const loadedSessions = await CriticDatabase.getAll();
      setSessions(loadedSessions);
    };
    loadInitData();
  }, []);

  // Persist messages when they change (only if not empty and not just intro)
  useEffect(() => {
    const persist = async () => {
      if (!currentSessionId || messages.length <= 1) return;

      const sessionToSave = sessions.find(s => s.id === currentSessionId);
      if (sessionToSave) {
        const updatedSession: CriticSession = {
          ...sessionToSave,
          messages: messages,
          timestamp: Date.now()
        };
        const all = await CriticDatabase.addOrUpdate(updatedSession);
        setSessions(all);
      }
    };
    persist();
  }, [messages, currentSessionId, sessions]);

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        id: 'intro',
        role: 'model',
        text: "我是您的 AI 批评者。请提出您的新方案。"
      }
    ]);
    setShowHistory(false);
  };

  const selectSession = (session: CriticSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setShowHistory(false);
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("确定要删除这条批评历史吗？")) {
      const all = await CriticDatabase.delete(id);
      setSessions(all);
      if (currentSessionId === id) {
        startNewChat();
      }
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = [...attachments];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await blobToBase64(file);
      const type = file.type.includes('pdf') ? 'pdf' : 'image';
      newAttachments.push({ type, data: base64, name: file.name });
    }
    setAttachments(newAttachments);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const sendMessage = async () => {
    if ((!inputValue.trim() && attachments.length === 0) || isTyping) return;

    // Create session if not exists
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      activeSessionId = Date.now().toString();
      setCurrentSessionId(activeSessionId);
      const newSession: CriticSession = {
        id: activeSessionId,
        title: inputValue.slice(0, 30) || (attachments.length > 0 ? attachments[0].name : "新方案批评"),
        timestamp: Date.now(),
        messages: []
      };
      setSessions(prev => [newSession, ...prev]);
    }

    const userMessage: CriticMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      attachments: [...attachments]
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setAttachments([]);
    setIsTyping(true);

    const finalSystemInstruction = systemInstruction || `
        你是一个严厉、直言不讳且逻辑严密的资深教研评审专家。
        你的任务是阅读用户的教研方案或想法，对其进行“压力测试”。
        输出格式应该是结构化的批评。请保持专业，但语气要带有压迫感。
    `;

    const responseId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: responseId, role: 'model', text: '' }]);

    try {
      const provider = customProviders.find(p => p.id === selectedProviderId);
      if (!provider) throw new Error("请先选择一个 AI 模型");

      let url = provider.baseUrl.replace(/\/$/, "");
      // Only append path if not present. Use regex to be safer about /v1/chat/completions vs /chat/completions
      if (!/\/chat\/completions$/.test(url)) {
        url = `${url}/chat/completions`;
      }

      const contentParts: any[] = [];
      if (userMessage.text) contentParts.push({ type: 'text', text: userMessage.text });
      userMessage.attachments?.forEach(att => {
        if (att.type === 'image') {
          contentParts.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${att.data}` } });
        } else {
          contentParts.push({ type: 'text', text: `[Attached PDF: ${att.name}]` });
        }
      });

      // Compatibility fix: If no attachments, send as string instead of array
      // Many models (like Qwen-Turbo) reject array content unless vision-enabled
      const finalUserContent = (userMessage.attachments && userMessage.attachments.length > 0)
        ? contentParts
        : (userMessage.text || "");

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          model: provider.modelId || 'gpt-4o',
          messages: [
            { role: 'system', content: finalSystemInstruction },
            ...messages.slice(-4).map(m => ({
              role: m.role === 'model' ? 'assistant' : m.role,
              content: m.text
            })),
            { role: 'user', content: finalUserContent }
          ],
          stream: true,
          temperature: 0.6
        })
      });

      if (!res.ok) throw new Error(`Provider Error: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === 'data: [DONE]') break;
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices[0]?.delta?.content || "";
              if (delta) {
                fullText += delta;
                setMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: fullText } : m));
              }
            } catch (e) { }
          }
        }
      }
    } catch (error) {
      console.error("AI Error", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "系统错误：批评者暂时离线（连接失败）。", isError: true }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePromptChange = (id: string) => {
    const p = prompts.find(pr => pr.id === id);
    if (p) {
      setSelectedPromptId(p.id);
      setSystemInstruction(p.content);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 pb-2 relative">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-8 text-white shadow-2xl shrink-0 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full -mr-20 -mt-20 blur-3xl transition-transform group-hover:scale-125 duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner hover:bg-white/20 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-4xl text-red-400">{showHistory ? 'close' : 'history'}</span>
            </button>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                AI 批评者
                {currentSessionId && <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded border border-white/10 text-slate-400">正在进行</span>}
              </h2>
              <p className="text-sm text-slate-400 font-medium mt-1 max-w-xl truncate">
                {currentSessionId ? sessions.find(s => s.id === currentSessionId)?.title : "“真理越辩越明。” 准备好接受压力测试了吗？"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <button
                onClick={startNewChat}
                className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full border border-primary/20 text-xs font-bold text-primary hover:bg-primary/30 transition-all"
              >
                <span className="material-symbols-outlined text-sm">add_comment</span>
                新批评
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-full border border-red-500/20 text-xs font-bold text-red-300">
                <span className="material-symbols-outlined text-sm animate-pulse">priority_high</span>
                STRICT
              </div>
            </div>

            <div className="flex gap-2">
              {/* Prompt Selector */}
              <div className="relative group">
                <select
                  value={selectedPromptId}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 pl-8 pr-6 py-1.5 rounded-lg text-xs font-bold outline-none cursor-pointer hover:bg-slate-700 transition-colors w-[130px] truncate"
                  title="选择批评者人设/提示词"
                >
                  {prompts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute left-2 top-1.5 text-[16px] text-slate-500">psychology</span>
              </div>

              {/* Provider Selector */}
              <div className="relative group">
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 pl-8 pr-6 py-1.5 rounded-lg text-xs font-bold outline-none cursor-pointer hover:bg-slate-700 transition-colors w-[130px] truncate"
                >
                  {!customProviders.length && <option value="">无可用模型</option>}
                  {customProviders.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute left-2 top-1.5 text-[16px] text-slate-500">cloud</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden relative">

        {/* History Sidebar */}
        {showHistory && (
          <div className="w-72 bg-white/80 backdrop-blur-md rounded-xl border border-[#E5E7EB] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left-4 duration-300 z-30 absolute md:relative h-full">
            <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="font-bold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">forum</span>
                历史批评记录
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {sessions.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <span className="material-symbols-outlined text-4xl mb-2">history</span>
                  <p className="text-xs font-bold">暂无历史记录</p>
                </div>
              ) : (
                sessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => selectSession(s)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${currentSessionId === s.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-transparent hover:bg-background-light'}`}
                  >
                    <h4 className="text-sm font-bold text-text-main truncate pr-6">{s.title}</h4>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-text-muted font-mono">{new Date(s.timestamp).toLocaleDateString()}</span>
                      <button
                        onClick={(e) => deleteSession(e, s.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat Window */}
        <div className="flex-1 bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col relative">

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth no-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center shadow-sm border 
                              ${msg.role === 'user' ? 'bg-violet-600 text-white border-violet-600' : 'bg-slate-800 text-red-400 border-slate-700'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {msg.role === 'user' ? 'person' : 'psychology_alt'}
                  </span>
                </div>

                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1 justify-end">
                      {msg.attachments.map((att, idx) => (
                        <div key={idx} className="bg-background-light border border-[#E5E7EB] rounded-xl p-2 flex items-center gap-2 text-xs font-bold text-text-muted">
                          <span className="material-symbols-outlined text-sm">{att.type === 'pdf' ? 'picture_as_pdf' : 'image'}</span>
                          <span className="max-w-[150px] truncate">{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={`px-6 py-4 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm
                                  ${msg.role === 'user' ? 'bg-violet-600 text-white rounded-tr-sm' :
                      msg.isError ? 'bg-red-50 text-red-600 border border-red-100 rounded-tl-sm' :
                        'bg-background-light text-text-main border border-[#E5E7EB] rounded-tl-sm font-medium'}`}
                  >
                    {msg.text || (isTyping && msg.role === 'model' && !msg.text ? "..." : "")}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && messages[messages.length - 1].role === 'user' && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 text-red-400 border border-slate-700 shrink-0 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                </div>
                <div className="px-6 py-4 bg-background-light border border-[#E5E7EB] rounded-3xl rounded-tl-sm text-sm text-text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-[#E5E7EB]">
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2 px-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group shrink-0">
                    <div className="h-16 px-3 bg-background-light border border-[#E5E7EB] rounded-xl flex flex-col items-center justify-center gap-1 min-w-[80px]">
                      <span className="material-symbols-outlined text-primary">{att.type === 'pdf' ? 'picture_as_pdf' : 'image'}</span>
                      <span className="text-[9px] text-text-muted font-bold truncate w-full text-center">{att.name}</span>
                    </div>
                    <button onClick={() => removeAttachment(idx)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 items-end bg-background-light rounded-xl p-2 border border-[#E5E7EB] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-sm">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-text-muted hover:text-primary hover:bg-white rounded-full transition-colors shrink-0"
              >
                <span className="material-symbols-outlined">attach_file</span>
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" multiple onChange={handleFileSelect} />

              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="阐述您的教研想法，或上传方案..."
                className="flex-1 bg-transparent border-none outline-none py-3.5 max-h-32 min-h-[48px] resize-none text-sm font-medium text-text-main placeholder-text-muted/70"
                rows={1}
              />

              <button
                onClick={sendMessage}
                disabled={(!inputValue.trim() && attachments.length === 0) || isTyping}
                className={`p-3 rounded-full shrink-0 transition-all duration-300 shadow-md flex items-center justify-center
                              ${(!inputValue.trim() && attachments.length === 0) || isTyping ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-700 hover:scale-105 active:scale-95'}`}
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICritic;
