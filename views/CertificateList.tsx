
import React, { useState, useEffect, useMemo, useRef } from 'react';

import { Certificate, HonorLevel, CertificateCategory, PromptTemplate, CustomProvider } from '../types';
import { CertificateDatabase, PromptDatabase, FileManager } from '../db';

interface CertificateListProps {
  onCertSelect: (id: string) => void;
}

const CertificateList: React.FC<CertificateListProps> = ({ onCertSelect }) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("cert-default");
  const [editingPrompt, setEditingPrompt] = useState("");
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Certificate | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; certId: string | null; isBatch: boolean }>({
    isOpen: false,
    certId: null,
    isBatch: false
  });

  const [formData, setFormData] = useState({
    name: '',
    issuer: '',
    issueDate: '',
    level: HonorLevel.Municipal,
    category: CertificateCategory.Award,
    credentialUrl: '',
    hours: 0
  });

  // AI Import State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiAttachments, setAiAttachments] = useState<{ type: 'image' | 'pdf'; data: string; name: string }[]>([]);
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<Partial<Certificate>[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await CertificateDatabase.initialize();
        const data = await CertificateDatabase.getAll();
        setCertificates(data);

        await PromptDatabase.initialize();
        const pms = await PromptDatabase.getAll("certificate");
        setPrompts(pms);
        const def = pms.find(p => p.isDefault) || pms[0];
        if (def) {
          setSelectedPromptId(def.id);
          setEditingPrompt(def.content);
        }

        // Load custom AI providers
        const savedProviders = localStorage.getItem('helerix_custom_providers');
        if (savedProviders) {
          try {
            const providers = JSON.parse(savedProviders);
            setCustomProviders(providers);
            if (providers.length > 0) setSelectedProviderId(providers[0].id);
          } catch (e) {
            console.error("Failed to load providers", e);
          }
        }
      } catch (error) {
        console.error("加载证书失败", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handlePromptChange = (id: string) => {
    const p = prompts.find(x => x.id === id);
    if (p) {
      setSelectedPromptId(id);
      setEditingPrompt(p.content);
    }
  };

  const saveNewPromptVersion = async () => {
    const name = prompt("请输入此档案录入提示词版本的名称：", `录入预设 ${prompts.length + 1}`);
    if (!name) return;

    const newPrompt: PromptTemplate = {
      id: Date.now().toString(),
      name,
      content: editingPrompt,
      isDefault: false,
      timestamp: Date.now(),
      category: "certificate"
    };

    const updated = await PromptDatabase.add(newPrompt);
    setPrompts(updated);
    setSelectedPromptId(newPrompt.id);
    alert("档案录入提示词已保存。");
  };

  const handleSort = (key: keyof Certificate) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const displayCertificates = useMemo(() => {
    let filtered = certificates.filter(cert => {
      const search = searchTerm.toLowerCase();
      return (
        cert.name.toLowerCase().includes(search) ||
        cert.issuer.toLowerCase().includes(search) ||
        cert.level.toLowerCase().includes(search) ||
        cert.category.toLowerCase().includes(search)
      );
    });

    if (sortConfig.key !== null) {
      filtered.sort((a, b) => {
        const aValue = (a[sortConfig.key!] || "").toString().toLowerCase();
        const bValue = (b[sortConfig.key!] || "").toString().toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [certificates, searchTerm, sortConfig]);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(displayCertificates.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, certId: id, isBatch: false });
  };

  const handleEditClick = (e: React.MouseEvent, cert: Certificate) => {
    e.stopPropagation();
    setEditingCertId(cert.id);
    setFormData({
      name: cert.name,
      issuer: cert.issuer,
      issueDate: cert.issueDate,
      level: cert.level,
      category: cert.category,
      credentialUrl: cert.credentialUrl || '',
      hours: cert.hours || 0
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCertId(null);
    setFormData({ name: '', issuer: '', issueDate: '', level: HonorLevel.Municipal, category: CertificateCategory.Award, credentialUrl: '', hours: 0 });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const fileUri = await FileManager.saveFile(file);
        setFormData({ ...formData, credentialUrl: fileUri });
      } catch (err) {
        console.error("Upload failed", err);
        alert("文件上传失败");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const confirmDelete = async () => {
    setIsLoading(true);
    const idsToDelete = deleteConfirmation.isBatch ? Array.from(selectedIds) : [deleteConfirmation.certId!];
    setDeleteConfirmation({ isOpen: false, certId: null, isBatch: false });
    try {
      for (const id of idsToDelete) await CertificateDatabase.delete(id);
      const updated = await CertificateDatabase.getAll();
      setCertificates(updated);
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCertificate = async () => {
    if (!formData.name || !formData.issuer || !formData.issueDate) {
      alert("请填写必要字段");
      return;
    }
    setIsLoading(true);
    try {
      let updated;
      const existing = editingCertId ? certificates.find(c => c.id === editingCertId) : null;
      const certData: Certificate = {
        id: editingCertId || Date.now().toString(),
        name: formData.name,
        issuer: formData.issuer,
        issueDate: formData.issueDate,
        level: formData.level,
        category: formData.category,
        credentialUrl: formData.credentialUrl,
        hours: Number(formData.hours) || 0,
        timestamp: existing?.timestamp || Date.now() // Preserve original timestamp on edit
      };

      if (editingCertId) {
        updated = await CertificateDatabase.update(certData);
      } else {
        updated = await CertificateDatabase.add(certData);
      }
      setCertificates(updated);
      closeModal();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // ========== AI Import Functions ==========
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

  const handleAIFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = [...aiAttachments];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await blobToBase64(file);
      const type = file.type.includes('pdf') ? 'pdf' : 'image';
      newAttachments.push({ type, data: base64, name: file.name });
    }
    setAiAttachments(newAttachments);
    if (aiFileInputRef.current) aiFileInputRef.current.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const newAttachments = [...aiAttachments];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const base64 = await blobToBase64(file);
          newAttachments.push({ type: 'image', data: base64, name: `粘贴图片_${Date.now()}.png` });
        }
      }
    }
    setAiAttachments(newAttachments);
  };

  const removeAIAttachment = (index: number) => {
    const newAttachments = [...aiAttachments];
    newAttachments.splice(index, 1);
    setAiAttachments(newAttachments);
  };

  const closeAIModal = () => {
    setIsAIModalOpen(false);
    setAiAttachments([]);
    setAiPreviewData([]);
    setAiError(null);
  };

  const parseLevel = (levelStr: string): HonorLevel => {
    const normalizedLevel = levelStr.toLowerCase();
    if (normalizedLevel.includes('国家') || normalizedLevel.includes('national')) return HonorLevel.National;
    if (normalizedLevel.includes('省') || normalizedLevel.includes('provincial')) return HonorLevel.Provincial;
    if (normalizedLevel.includes('市') || normalizedLevel.includes('municipal')) return HonorLevel.Municipal;
    if (normalizedLevel.includes('区') || normalizedLevel.includes('县') || normalizedLevel.includes('district')) return HonorLevel.District;
    if (normalizedLevel.includes('校') || normalizedLevel.includes('school')) return HonorLevel.School;
    return HonorLevel.Municipal;
  };

  const parseCategory = (categoryStr: string): CertificateCategory => {
    const normalizedCat = categoryStr.toLowerCase();
    if (normalizedCat.includes('荣誉') || normalizedCat.includes('表彰') || normalizedCat.includes('award')) return CertificateCategory.Award;
    if (normalizedCat.includes('课题') || normalizedCat.includes('project')) return CertificateCategory.Project;
    if (normalizedCat.includes('培训') || normalizedCat.includes('training')) return CertificateCategory.Training;
    if (normalizedCat.includes('职称') || normalizedCat.includes('资格') || normalizedCat.includes('qualification')) return CertificateCategory.Qualification;
    return CertificateCategory.Other;
  };

  const processAIImport = async () => {
    if (aiAttachments.length === 0) {
      setAiError("请先上传或粘贴证书图片/PDF");
      return;
    }

    setIsAIProcessing(true);
    setAiError(null);
    setAiPreviewData([]);

    // Get the active prompt for certificate category
    const systemInstruction = editingPrompt;

    try {
      let responseText = "";

      const provider = customProviders.find(p => p.id === selectedProviderId);
      if (!provider) throw new Error("请选择一个有效的 AI 提供商");

      let url = provider.baseUrl.replace(/\/$/, "");
      if (!url.endsWith('/chat/completions')) url = `${url}/chat/completions`;

      const contentParts: any[] = [];
      aiAttachments.forEach(att => {
        if (att.type === 'image') {
          contentParts.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${att.data}` } });
        } else {
          contentParts.push({ type: 'text', text: `[Attached PDF: ${att.name}]` });
        }
      });
      contentParts.push({ type: 'text', text: "请识别并提取图片/文档中的证书信息，严格按照要求的 JSON 格式返回。" });

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
            { role: 'user', content: contentParts }
          ],
          temperature: 0.2
        })
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`AI 请求失败: ${res.status} ${errText.slice(0, 100)}`);
      }

      const data = await res.json();
      responseText = data.choices?.[0]?.message?.content || "";

      // Parse JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("AI 返回的内容不包含有效的 JSON 数组");
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error("未能识别到证书信息，请尝试使用更清晰的图片");
      }

      // Convert to Certificate format
      const previewCerts: Partial<Certificate>[] = parsedData.map((item: any) => ({
        name: item.name || "",
        issuer: item.issuer || "",
        issueDate: item.issueDate || new Date().toISOString().split('T')[0],
        level: parseLevel(item.level || ""),
        category: parseCategory(item.category || ""),
        hours: parseInt(item.hours) || 0
      }));

      setAiPreviewData(previewCerts);

    } catch (error: any) {
      console.error("AI Import Error", error);
      setAiError(error.message || "AI 识别失败，请重试");
    } finally {
      setIsAIProcessing(false);
    }
  };

  const confirmAIImport = async () => {
    if (aiPreviewData.length === 0) return;

    setIsLoading(true);
    try {
      let updatedCerts = certificates;
      for (const previewCert of aiPreviewData) {
        const newCert: Certificate = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          name: previewCert.name || "",
          issuer: previewCert.issuer || "",
          issueDate: previewCert.issueDate || new Date().toISOString().split('T')[0],
          level: previewCert.level || HonorLevel.Municipal,
          category: previewCert.category || CertificateCategory.Other,
          credentialUrl: "",
          hours: previewCert.hours || 0,
          timestamp: Date.now()
        };
        updatedCerts = await CertificateDatabase.add(newCert);
      }
      setCertificates(updatedCerts);
      closeAIModal();
      alert(`成功导入 ${aiPreviewData.length} 条证书记录！`);
    } catch (e) {
      console.error("Import failed", e);
      setAiError("导入数据库失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelColor = (level: HonorLevel) => {
    switch (level) {
      case HonorLevel.National: return 'bg-amber-100 text-amber-700 border-amber-200';
      case HonorLevel.Provincial: return 'bg-purple-100 text-purple-700 border-purple-200';
      case HonorLevel.Municipal: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSortIcon = (columnKey: keyof Certificate) => {
    if (sortConfig.key !== columnKey) return <span className="material-symbols-outlined text-[16px] opacity-30">arrow_drop_down</span>;
    return <span className="material-symbols-outlined text-[16px] text-primary">{sortConfig.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'}</span>;
  };

  if (isLoading && certificates.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted gap-2">
        <span className="material-symbols-outlined animate-spin">sync</span>
        <span>正在载入证书...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 relative min-h-full">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main">证书登记</h1>
          <p className="text-text-muted text-sm mt-1">记录并管理您的获奖荣誉、课题结项、培训结业及职称资质。</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPromptSettings(!showPromptSettings)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold border transition-all active:scale-95 ${showPromptSettings ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-text-muted border-border-light hover:bg-background-light'}`}
          >
            <span className="material-symbols-outlined text-[20px]">psychology</span>
            AI 录入指令
          </button>
          <button onClick={() => { setEditingCertId(null); setIsModalOpen(true); }} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-violet-600 px-6 py-2.5 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add_task</span>
            <span className="text-sm font-bold">登记新成果</span>
          </button>
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            <span className="text-sm font-bold">AI 导入</span>
          </button>
        </div>
      </div>

      {/* Module-specific Prompt Settings */}
      {showPromptSettings && (
        <div className="bg-white rounded-[2rem] border border-border-light shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-300 p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-black text-text-main flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary">auto_fix</span>
                荣誉档案录入 Prompt 指令集
              </h3>
              <p className="text-xs text-text-muted font-medium">定制 AI 对荣誉档案的 OCR 提取规则，修改将仅影响“证书管理”模块。</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">选择预设:</span>
              <select
                value={selectedPromptId}
                onChange={(e) => handlePromptChange(e.target.value)}
                className="text-xs font-black bg-background-light border border-border-light rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 min-w-[160px]"
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
              className="w-full h-32 bg-background-light/30 border border-border-light rounded-2xl p-5 text-xs font-medium text-text-main leading-relaxed focus:ring-2 focus:ring-primary/20 outline-none resize-none no-scrollbar shadow-inner"
              placeholder="输入 AI 档案录入指令..."
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={saveNewPromptVersion}
                className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black hover:bg-violet-700 shadow-lg shadow-primary/20 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                另存为新版本
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm border border-border-light sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"><span className="material-symbols-outlined text-[20px]">search</span></div>
          <input className="h-10 w-full rounded-lg border border-border-light bg-background-light pl-10 pr-4 text-sm focus:border-primary outline-none transition-all" placeholder="搜索证书名称、级别、类别..." type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <span className="text-xs font-bold text-text-muted px-2 py-1">筛选级别:</span>
          {Object.values(HonorLevel).slice(0, 3).map(level => (
            <button key={level} onClick={() => setSearchTerm(level)} className="px-3 py-1 text-[10px] font-bold border rounded-md hover:bg-white transition-colors">{level}</button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-light bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-background-light/50">
            <tr>
              <th className="px-6 py-4 w-4">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary cursor-pointer rounded"
                  checked={displayCertificates.length > 0 && selectedIds.size === displayCertificates.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => handleSort('name')}>证书/成果名称 {getSortIcon('name')}</th>
              <th className="px-6 py-4 font-semibold text-text-muted">颁发单位</th>
              <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => handleSort('level')}>级别 {getSortIcon('level')}</th>
              <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => handleSort('hours')}>学时 {getSortIcon('hours')}</th>
              <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => handleSort('issueDate')}>取得日期 {getSortIcon('issueDate')}</th>
              <th className="px-6 py-4 font-semibold text-text-muted text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {displayCertificates.map((cert) => (
              <tr key={cert.id} className={`group transition-colors cursor-pointer ${selectedIds.has(cert.id) ? 'bg-primary/5' : 'hover:bg-background-light/50'}`} onClick={(e) => toggleSelect(e, cert.id)}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                    checked={selectedIds.has(cert.id)}
                    readOnly
                  />
                </td>
                <td className="px-6 py-4 font-bold text-text-main">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[20px]">award_star</span></div>
                    {cert.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-text-muted">{cert.issuer}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getLevelColor(cert.level)}`}>{cert.level}</span>
                </td>
                <td className="px-6 py-4">
                  {cert.hours ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black border border-blue-100">
                      {cert.hours} h
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-300">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-text-muted font-mono">{cert.issueDate}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-text-muted hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); onCertSelect(cert.id); }} title="查看详情"><span className="material-symbols-outlined text-[20px]">visibility</span></button>
                    <button className="p-1.5 text-text-muted hover:text-amber-600 transition-colors" onClick={(e) => handleEditClick(e, cert)} title="编辑"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                    <button className="p-1.5 text-text-muted hover:text-red-600 transition-colors" onClick={(e) => handleDeleteClick(e, cert.id)} title="删除"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayCertificates.length === 0 && (
          <div className="p-20 text-center text-text-muted">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-20">inventory_2</span>
            <p>未找到匹配的成果记录</p>
          </div>
        )}
      </div>

      {/* Bulk actions float bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[40] animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10">
            <div className="flex items-center gap-3 pr-6 border-r border-white/20">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold shadow-inner">
                {selectedIds.size}
              </div>
              <span className="text-sm font-medium tracking-wide">项已选中</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: true, certId: null, isBatch: true })}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl transition-all font-bold text-sm shadow-lg shadow-red-500/20 active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
                批量删除
              </button>

              <button
                onClick={clearSelection}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-bold text-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
                取消选择
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-background-light/30">
              <h3 className="text-xl font-bold text-text-main">{editingCertId ? '编辑荣誉成果' : '登记荣誉成果'}</h3>
              <button onClick={closeModal} className="text-text-muted hover:text-text-main p-1"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">成果名称 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="例如：2023年度省级教学能手" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">颁发/主管单位 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.issuer} onChange={(e) => setFormData({ ...formData, issuer: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="例如：省教育厅" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-main">荣誉级别</label>
                  <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value as HonorLevel })} className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none bg-white transition-all">
                    {Object.values(HonorLevel).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-main">成果类别</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as CertificateCategory })} className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none bg-white transition-all">
                    {Object.values(CertificateCategory).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">取得日期 <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl outline-none text-sm transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">获得学时 (仅限培训类)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-2.5 text-xs text-text-muted font-bold">h</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold">凭证/在线查验 URL</label>
                  <span className="text-[10px] text-text-muted">支持外部链接或上传本地图片/PDF</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.credentialUrl}
                    onChange={(e) => setFormData({ ...formData, credentialUrl: e.target.value })}
                    className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="https://... 或点击右侧按钮上传"
                  />
                  <label className={`flex items-center justify-center w-12 border border-dashed rounded-xl cursor-pointer hover:bg-primary/5 hover:border-primary transition-all text-primary ${isUploading ? 'opacity-50 cursor-wait' : ''}`} title="上传本地文档">
                    <span className={`material-symbols-outlined text-[22px] ${isUploading ? 'animate-spin' : ''}`}>{isUploading ? 'sync' : 'upload_file'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 border-t bg-background-light/20 flex justify-end gap-3">
              <button onClick={closeModal} className="px-6 py-2.5 border rounded-xl text-text-muted font-bold text-sm hover:bg-white transition-colors">取消</button>
              <button onClick={handleSaveCertificate} disabled={isUploading} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-violet-700 transition-all active:scale-95 disabled:opacity-50">
                {editingCertId ? '保存修改' : '提交登记'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Import Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <span className="material-symbols-outlined">auto_awesome</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-main">AI 智能导入</h3>
                  <p className="text-xs text-text-muted">上传或粘贴证书图片/PDF，AI 自动识别信息</p>
                </div>
              </div>
              <button onClick={closeAIModal} className="text-text-muted hover:text-text-main p-1"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Provider Selector */}
              <div className="flex items-center gap-4 p-4 bg-background-light rounded-xl border border-border-light">
                <span className="material-symbols-outlined text-primary">cloud</span>
                <div className="flex-1">
                  <label className="text-xs font-bold text-text-muted uppercase">AI 引擎</label>
                  <select
                    value={selectedProviderId}
                    onChange={(e) => setSelectedProviderId(e.target.value)}
                    className="w-full bg-white border border-border-light rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 mt-1"
                  >
                    {!customProviders.length && <option value="">无可用模型，请先去系统设置添加</option>}
                    {customProviders.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Area */}
              <div
                ref={pasteAreaRef}
                onPaste={handlePaste}
                className="border-2 border-dashed border-border-light rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer focus-within:border-primary focus-within:bg-primary/5"
                onClick={() => aiFileInputRef.current?.click()}
                tabIndex={0}
              >
                <input
                  type="file"
                  ref={aiFileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleAIFileSelect}
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-main">点击上传或拖拽文件到此处</p>
                    <p className="text-xs text-text-muted mt-1">也可以直接 <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono border">Ctrl+V</kbd> 粘贴图片</p>
                  </div>
                  <p className="text-[10px] text-text-muted">支持 JPG、PNG、PDF 格式</p>
                </div>
              </div>

              {/* Attachments Preview */}
              {aiAttachments.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {aiAttachments.map((att, idx) => (
                    <div key={idx} className="relative group">
                      <div className="h-20 w-24 bg-background-light border border-border-light rounded-xl flex flex-col items-center justify-center gap-1 overflow-hidden">
                        {att.type === 'image' ? (
                          <img src={`data:image/jpeg;base64,${att.data}`} alt={att.name} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-2xl text-red-500">picture_as_pdf</span>
                            <span className="text-[9px] text-text-muted font-bold truncate w-full text-center px-1">{att.name}</span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeAIAttachment(idx); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Error Message */}
              {aiError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                  <span className="material-symbols-outlined text-red-500">error</span>
                  <div>
                    <p className="text-sm font-bold text-red-700">识别失败</p>
                    <p className="text-xs text-red-600 mt-1">{aiError}</p>
                  </div>
                </div>
              )}

              {/* Preview Results */}
              {aiPreviewData.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                    <h4 className="text-sm font-bold text-text-main">识别结果预览 ({aiPreviewData.length} 条)</h4>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {aiPreviewData.map((cert, idx) => (
                      <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-text-main truncate">{cert.name}</h5>
                            <p className="text-xs text-text-muted mt-1">{cert.issuer}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getLevelColor(cert.level!)}`}>{cert.level}</span>
                            <span className="text-[10px] text-text-muted font-mono">{cert.issueDate}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-white rounded text-[10px] font-bold text-text-muted border">{cert.category}</span>
                          {cert.hours && cert.hours > 0 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100">{cert.hours}h</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-5 border-t bg-background-light/20 flex justify-between items-center gap-3">
              <p className="text-[10px] text-text-muted flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">info</span>
                提示词可在"系统设置 → 提示词工程"中自定义
              </p>
              <div className="flex gap-3">
                <button onClick={closeAIModal} className="px-6 py-2.5 border rounded-xl text-text-muted font-bold text-sm hover:bg-white transition-colors">取消</button>
                {aiPreviewData.length > 0 ? (
                  <button
                    onClick={confirmAIImport}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    确认导入 {aiPreviewData.length} 条
                  </button>
                ) : (
                  <button
                    onClick={processAIImport}
                    disabled={isAIProcessing || aiAttachments.length === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAIProcessing ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                        识别中...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                        开始识别
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateList;
