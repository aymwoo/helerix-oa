import React, { useState, useEffect, useRef } from 'react';

import { ExamAnalysis, PromptTemplate, CustomProvider } from '../types';
import { ExamAnalysisDatabase, PromptDatabase, AIProviderDatabase } from '../db';
import { useToast } from '../components/ToastContext';

const AIExamAnalysis: React.FC = () => {
  const { success, error } = useToast();
  const [history, setHistory] = useState<ExamAnalysis[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("default");
  const [editingPrompt, setEditingPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExamAnalysis | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Custom Provider State
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zoom and Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const loadData = async () => {
      await ExamAnalysisDatabase.initialize();
      const hist = await ExamAnalysisDatabase.getAll();
      setHistory(hist);

      await PromptDatabase.initialize();
      const pms = await PromptDatabase.getAll("exam");
      setPrompts(pms);

      const def = pms.find(p => p.isDefault) || pms[0];
      if (def) {
        setSelectedPromptId(def.id);
        setEditingPrompt(def.content);
      }

      // Load Custom Providers
      try {
        const providers = await AIProviderDatabase.getAll();
        setCustomProviders(providers);
        if (providers.length > 0) setSelectedProviderId(providers[0].id);
      } catch (e) {
        console.error("Failed to load providers", e);
      }
    };
    loadData();
  }, []);

  // Keep latest state in ref to avoid stale closure in paste handler
  const stateRef = useRef({ customProviders, selectedProviderId, editingPrompt });
  useEffect(() => {
    stateRef.current = { customProviders, selectedProviderId, editingPrompt };
  }, [customProviders, selectedProviderId, editingPrompt]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []); // Only bind once, processFile will read from ref

  const handlePromptChange = (id: string) => {
    const p = prompts.find(x => x.id === id);
    if (p) {
      setSelectedPromptId(id);
      setEditingPrompt(p.content);
    }
  };

  const saveNewPromptVersion = async () => {
    const name = prompt("请输入此试卷分析提示词版本的名称：", `分析预设 ${prompts.length + 1}`);
    if (!name) return;

    const newPrompt: PromptTemplate = {
      id: Date.now().toString(),
      name,
      content: editingPrompt,
      isDefault: false,
      timestamp: Date.now(),
      category: "exam"
    };

    const updated = await PromptDatabase.add(newPrompt);
    setPrompts(updated);
    setSelectedPromptId(newPrompt.id);
    success("试卷分析提示词版本已保存。");
  };

  const messages = [
    "正在通过 OCR 提取题目文本...",
    "正在进行语义理解与题意研判...",
    "正在对照现行教学大纲进行考点匹配...",
    "正在评估试题难度梯度...",
    "正在生成针对性教研建议...",
    "正在润色分析报告..."
  ];

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

  const processFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => setPreviewUrl(event.target?.result as string);
    reader.readAsDataURL(file);

    setIsAnalyzing(true);
    setCurrentResult(null);
    resetView();

    let msgIndex = 0;
    const interval = setInterval(() => {
      setLoadingMessage(messages[msgIndex % messages.length]);
      msgIndex++;
    }, 2000);

    try {
      const base64Data = await blobToBase64(file);
      let resultData: any;

      // --- Custom OpenAI Compatible Provider Logic ---
      // Use ref to get latest state even if specific closure is stale
      const { customProviders: currentProviders, selectedProviderId: currentProviderId, editingPrompt: currentPrompt } = stateRef.current;
      
      const provider = currentProviders.find(p => p.id === currentProviderId);
      if (!provider) throw new Error("请选择一个有效的 AI 模型");

      let url = provider.baseUrl.replace(/\/$/, "");
      if (!/\/chat\/completions$/.test(url)) {
        url = `${url}/chat/completions`;
      }

      // Enforce JSON manually in prompt since response_format is not universally supported
      const jsonSchemaDesc = JSON.stringify({
        title: "string",
        subject: "string",
        grade: "string",
        difficulty: "integer (1-10)",
        summary: "string",
        knowledgePoints: ["string"],
        itemAnalysis: [{ question: "string", point: "string", insight: "string" }],
        teachingAdvice: "string"
      }, null, 2);

      const systemInstruction = "You are an expert exam analyzer. You MUST output strictly valid JSON matching the schema provided by the user. Do not include markdown formatting (like ```json) in your response.";
      const fullPrompt = `${currentPrompt}\n\n[IMPORTANT] RETURN ONLY RAW JSON matching this schema:\n${jsonSchemaDesc}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          model: provider.modelId || 'gpt-4o',
          messages: [
            { role: 'system', content: systemInstruction },
            {
              role: 'user',
              content: [
                { type: 'text', text: fullPrompt },
                { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64Data}` } }
              ]
            }
          ],
          max_tokens: 3000,
          temperature: 0.2
        })
      });

      if (!res.ok) throw new Error(`Provider API Error: ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No content returned from provider");

      // Cleanup potential markdown fences
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
      resultData = JSON.parse(cleaned);

      const newAnalysis: ExamAnalysis = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...resultData,
        imageUrl: previewUrl || ""
      };

      const updatedHistory = await ExamAnalysisDatabase.add(newAnalysis);
      setHistory(updatedHistory);
      setCurrentResult(newAnalysis);

    } catch (err) {
      console.error("AI 分析失败", err);
      error(`AI 深度分析失败: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      clearInterval(interval);
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const deleteRecord = async (id: string) => {
    if (confirm("确定要删除这条分析记录吗？")) {
      const updated = await ExamAnalysisDatabase.delete(id);
      setHistory(updated);
      if (currentResult?.id === id) setCurrentResult(null);
    }
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.5, 5));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-text-main tracking-tight">AI 试卷分析</h1>
          <p className="text-text-muted mt-2">上传、或直接<b>粘贴(Ctrl+V)</b>试卷图片，AI 将自动为您解析考点分布与命题质量。</p>
        </div>
        <div className="flex gap-3 items-center">

          {/* Provider Selection */}
          <div className="relative group">
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              className="appearance-none bg-white border border-[#E5E7EB] pl-10 pr-10 py-3.5 rounded-2xl text-sm font-black text-text-main focus:ring-4 focus:ring-[#8B5CF6]/10 focus:border-[#8B5CF6] outline-none cursor-pointer shadow-sm hover:shadow-md transition-all min-w-[160px]"
            >
              {customProviders.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute left-3 top-4 text-[20px] text-[#8B5CF6]">cloud</span>
            <span className="material-symbols-outlined absolute right-3 top-4 text-[20px] text-text-muted pointer-events-none">arrow_drop_down</span>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-6 py-3.5 rounded-2xl font-black transition-all flex items-center gap-2.5 border shadow-sm active:scale-95 ${showSettings ? 'bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-xl shadow-[#8B5CF6]/20' : 'bg-white text-text-main border-[#E5E7EB] hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[22px]">{showSettings ? 'auto_fix' : 'psychology_alt'}</span>
            分析指令集
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#8B5CF6] text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-[#8B5CF6]/30 hover:bg-violet-700 transition-all active:scale-95 flex items-center gap-2.5"
          >
            <span className="material-symbols-outlined text-[22px]">upload_file</span>
            上传新试卷
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*"
        />
      </div>

      {/* Analysis Settings (Module Independent) */}
      {showSettings && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-300 p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-text-main flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary">auto_fix</span>
                试卷分析 Prompt 指令集
              </h3>
              <p className="text-xs text-text-muted font-medium">定制 AI 对试卷的研判维度，修改将仅影响“试卷分析”模块。</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">选择预设:</span>
              <select
                value={selectedPromptId}
                onChange={(e) => handlePromptChange(e.target.value)}
                className="text-xs font-semibold bg-background-light border border-[#E5E7EB] rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 min-w-[160px]"
              >
                {prompts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.id.length < 10 ? ' (内置)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={editingPrompt}
              onChange={(e) => setEditingPrompt(e.target.value)}
              className="w-full h-40 bg-background-light/30 border border-[#E5E7EB] rounded-2xl p-5 text-xs font-medium text-text-main leading-relaxed focus:ring-2 focus:ring-primary/20 outline-none resize-none no-scrollbar shadow-inner"
              placeholder="输入 AI 试卷分析指令..."
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={saveNewPromptVersion}
                className="px-4 py-2 bg-primary text-white rounded-lg text-[10px] font-semibold hover:bg-violet-700 shadow-lg shadow-primary/20 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                另存为新版本
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 py-2 border-t border-dashed border-[#E5E7EB]">
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted italic">
              <span className="material-symbols-outlined text-[16px] text-primary">info</span>
              当前指令集针对试卷 OCR 及教研研判进行了优化。
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Analysis Results or Upload Area */}
        <div className="lg:col-span-8 space-y-8">
          {isAnalyzing ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-20 flex flex-col items-center justify-center text-center space-y-6 shadow-sm">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-[#8B5CF6]/20 border-t-[#8B5CF6] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#8B5CF6] text-4xl animate-pulse">psychology</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-main mb-2">AI 正在深度研判...</h3>
                <p className="text-text-muted animate-pulse">{loadingMessage}</p>
                {selectedProviderId !== 'gemini' && (
                  <p className="text-xs text-text-muted mt-2 font-mono bg-gray-100 px-2 py-1 rounded inline-block">Provider: {customProviders.find(p => p.id === selectedProviderId)?.name}</p>
                )}
              </div>
            </div>
          ) : currentResult ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-primary/10 to-transparent p-8 border-b border-[#E5E7EB] flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-semibold rounded uppercase tracking-widest">{currentResult.subject}</span>
                      <span className="px-2 py-0.5 bg-background-light text-text-muted text-[10px] font-semibold rounded uppercase tracking-widest">{currentResult.grade}</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-text-main tracking-tight">{currentResult.title}</h2>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm font-bold text-text-main hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    重新上传
                  </button>
                </div>

                <div className="p-8 space-y-10">
                  {/* Interactive Image Previewer */}
                  {currentResult.imageUrl && (
                    <section>
                      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> 原始试卷影像预览
                      </h3>
                      <div className="relative bg-background-light rounded-xl overflow-hidden border border-[#E5E7EB] h-[500px] group touch-none">
                        <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex bg-white/90 backdrop-blur shadow-xl rounded-lg border border-[#E5E7EB] overflow-hidden">
                            <button onClick={zoomOut} className="p-2 hover:bg-gray-100 border-r border-[#E5E7EB]"><span className="material-symbols-outlined text-[20px]">zoom_out</span></button>
                            <button onClick={resetView} className="p-2 hover:bg-gray-100 border-r border-[#E5E7EB]"><span className="material-symbols-outlined text-[20px]">restart_alt</span></button>
                            <button onClick={zoomIn} className="p-2 hover:bg-gray-100"><span className="material-symbols-outlined text-[20px]">zoom_in</span></button>
                          </div>
                        </div>
                        <div
                          className={`w-full h-full flex items-center justify-center ${scale > 1 ? 'cursor-move' : 'cursor-default'}`}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerLeave={handlePointerUp}
                        >
                          <img
                            src={currentResult.imageUrl}
                            alt="试卷影像"
                            className="max-w-full max-h-full transition-transform duration-200 ease-out select-none"
                            style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
                            draggable={false}
                          />
                        </div>
                      </div>
                    </section>
                  )}

                  <section>
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> 核心考点分布
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {currentResult.knowledgePoints.map((kp, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-primary/5 text-primary rounded-lg text-xs font-bold border border-primary/10">
                          {kp}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> 总体研判报告
                    </h3>
                    <p className="text-text-muted leading-relaxed text-sm bg-background-light/50 p-6 rounded-2xl italic">
                      “{currentResult.summary}”
                    </p>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> 典型题目分析
                    </h3>
                    <div className="space-y-4">
                      {currentResult.itemAnalysis.map((item, idx) => (
                        <div key={idx} className="p-5 rounded-2xl border border-[#E5E7EB] hover:border-primary/30 transition-colors group">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-text-main group-hover:text-primary transition-colors text-sm">题目描述：{item.question}</h4>
                            <span className="text-[10px] font-semibold text-primary/60 uppercase">{item.point}</span>
                          </div>
                          <p className="text-xs text-text-muted leading-relaxed">{item.insight}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-violet-50 p-8 rounded-xl text-violet-900 border border-violet-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                      <h4 className="text-sm font-bold uppercase tracking-widest mb-3 text-violet-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">lightbulb</span>
                        教研专家建议
                      </h4>
                      <p className="text-base leading-relaxed font-medium text-violet-900">
                        {currentResult.teachingAdvice}
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-white rounded-[3rem] border-4 border-dashed border-[#E5E7EB] p-24 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/5 transition-all group min-h-[550px] shadow-sm hover:shadow-2xl hover:shadow-[#8B5CF6]/5"
            >
              <div className="w-24 h-24 rounded-3xl bg-background-light flex items-center justify-center text-text-muted group-hover:scale-110 group-hover:bg-[#8B5CF6]/10 group-hover:text-[#8B5CF6] transition-all mb-8 shadow-inner ring-8 ring-transparent group-hover:ring-[#8B5CF6]/5">
                <span className="material-symbols-outlined text-6xl">add_photo_alternate</span>
              </div>
              <h3 className="text-3xl font-black text-text-main mb-4 tracking-tight">开启 AI 教研分析</h3>
              <p className="text-sm font-bold text-text-muted max-w-sm mb-12 leading-relaxed">
                点击此处、拖拽文件或直接使用 <kbd className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-text-main mx-1">Ctrl+V</kbd> 粘贴试卷照片。
                <br />
                <span className="text-xs opacity-60 font-medium">支持 JPG, PNG 格式的高清试卷影像</span>
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="bg-[#8B5CF6] text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-[#8B5CF6]/30 hover:bg-violet-700 transition-all flex items-center gap-3 active:scale-95"
              >
                <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
                立即识别并分析
              </button>
            </div>
          )}
        </div>

        {/* Right: History */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
            <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              分析历史记录
            </h3>
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-10 opacity-30">
                  <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                  <p className="text-xs">暂无历史分析</p>
                </div>
              ) : (
                history.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setCurrentResult(item)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${currentResult?.id === item.id ? 'bg-primary/5 border-primary shadow-sm' : 'border-[#E5E7EB] hover:border-primary/50'}`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteRecord(item.id); }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-background-light flex-shrink-0 flex items-center justify-center text-text-muted">
                        <span className="material-symbols-outlined">{item.subject === '数学' ? 'function' : 'text_snippet'}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-text-main truncate group-hover:text-primary transition-colors">{item.title}</h4>
                        <p className="text-[10px] text-text-muted mt-1 uppercase tracking-tighter">
                          {new Date(item.timestamp).toLocaleDateString()} · {item.subject}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary rounded-full -mr-12 -mt-12 blur-3xl opacity-30"></div>
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">tips_and_updates</span>
              教研小贴士
            </h4>
            <p className="text-xs text-white/60 leading-relaxed">
              上传的图片清晰度越高，AI 对复杂数学公式和手写批注的识别准确率就越高。支持直接使用 <b>Ctrl+V</b> 粘贴剪贴板图片。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIExamAnalysis;