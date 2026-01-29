import React, { useState, useEffect, useMemo } from 'react';

import { Certificate, HonorLevel, PromptTemplate, CustomProvider, User, UserRole } from '../types';
import { CertificateDatabase, PromptDatabase, AIProviderDatabase, UserDatabase } from '../db';
import { useToast } from '../components/ToastContext';

// Components
import { CertificateTable } from '../components/certificate/CertificateTable';
import { ExportStatsModal } from '../components/certificate/ExportStatsModal';
import { AIImportModal } from '../components/certificate/AIImportModal';
import { CertificateEditModal, CertificateFormData } from '../components/certificate/CertificateEditModal';
import { DeleteConfirmationModal } from '../components/certificate/DeleteConfirmationModal';
import { PromptSettingsPanel } from '../components/certificate/PromptSettingsPanel';
import { getLevelColor } from '../components/certificate/utils';

// Hooks
import { useCertificateExport } from '../hooks/useCertificateExport';

const CertificateList: React.FC<{ onCertSelect: (id: string) => void }> = ({ onCertSelect }) => {
  const { success, error, warning } = useToast();
  
  // Data State
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Certificate | null; direction: 'asc' | 'desc' }>({
    key: null, direction: 'asc',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Prompt State
  const [selectedPromptId, setSelectedPromptId] = useState<string>("cert-default");
  const [editingPrompt, setEditingPrompt] = useState("");
  const [showPromptSettings, setShowPromptSettings] = useState(false);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; certId: string | null; isBatch: boolean }>({
    isOpen: false, certId: null, isBatch: false
  });

  const { performExport } = useCertificateExport();

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const loadCerts = async () => {
          await CertificateDatabase.initialize();
          return await CertificateDatabase.getAll();
        };

        const loadPrompts = async () => {
          return await PromptDatabase.getAll("certificate");
        };

        const loadProviders = async () => {
          try {
            return await AIProviderDatabase.getAll();
          } catch (e) {
            console.error("Failed to load providers", e);
            return [];
          }
        };

        const loadUser = async () => {
          const userId = localStorage.getItem("helerix_auth_user_id");
          if (!userId) return { currentUser: null, allUsers: [] };
          
          const user = await UserDatabase.getById(userId);
          let allUsersList: User[] = [];
          if (user && user.roles.includes(UserRole.Admin)) {
            allUsersList = await UserDatabase.getAll();
          }
          return { currentUser: user, allUsers: allUsersList };
        };

        const [certs, pms, providers, userData] = await Promise.all([
          loadCerts(),
          loadPrompts(),
          loadProviders(),
          loadUser()
        ]);

        setCertificates(certs);

        setPrompts(pms);
        const def = pms.find(p => p.isDefault) || pms[0];
        if (def) {
          setSelectedPromptId(def.id);
          setEditingPrompt(def.content);
        }

        setCustomProviders(providers);
        setCurrentUser(userData.currentUser);
        setAllUsers(userData.allUsers);

      } catch (error) {
        console.error("加载证书失败", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Prompt Logic
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
    success("档案录入提示词已保存。");
  };

  // List Logic
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

  // CRUD
  const handleEditClick = (e: React.MouseEvent, cert: Certificate) => {
    e.stopPropagation();
    setEditingCertId(cert.id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, certId: id, isBatch: false });
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
      success(deleteConfirmation.isBatch ? `已成功删除 ${idsToDelete.length} 项记录` : "该记录已成功删除");
    } catch (e) {
      console.error(e);
      error("删除操作失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCertificate = async (formData: CertificateFormData) => {
    if (!formData.name || !formData.issuer || !formData.issueDate) {
      warning("请填写必要字段");
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
        timestamp: existing?.timestamp || Date.now(),
        // When adding new certs manually, we assume current user. 
        // Existing ID logic uses local storage in DB add method if not present, but here we construct explicitly.
        userId: existing?.userId
      };

      if (editingCertId) {
        updated = await CertificateDatabase.update(certData);
      } else {
        updated = await CertificateDatabase.add(certData);
      }
      setCertificates(updated);
      setIsModalOpen(false);
      setEditingCertId(null);
    } catch (e) {
      console.error(e);
      error("保存失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchExport = async () => {
    const selectedCerts = certificates.filter(c => selectedIds.has(c.id));
    await performExport(selectedCerts, allUsers, currentUser, "批量导出证书", () => setSelectedIds(new Set()));
  };
  
  const handleAIImportSuccess = (newCerts: Certificate[]) => {
      // Refresh list - currently newCerts isn't enough because we need full refresh
      CertificateDatabase.getAll().then(setCertificates);
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
          <h1 className="text-3xl font-bold text-text-main">证书管理</h1>
          <p className="text-text-muted text-sm mt-1">记录并管理您的获奖荣誉、课题结项、培训结业及职称资质。</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPromptSettings(!showPromptSettings)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold border transition-all active:scale-95 ${showPromptSettings ? 'bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/20' : 'bg-white text-text-muted border-[#E5E7EB] hover:bg-background-light'}`}
          >
            <span className="material-symbols-outlined text-[20px]">psychology</span>
            AI 录入指令
          </button>
          <button onClick={() => { setEditingCertId(null); setIsModalOpen(true); }} className="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-white shadow-lg shadow-[#8B5CF6]/20 hover:bg-violet-700 transition-all active:scale-95">
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
          <button
            onClick={() => setIsStatsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-white shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">table_chart</span>
            <span className="text-sm font-bold">统计导出</span>
          </button>
        </div>
      </div>

      <PromptSettingsPanel
        isOpen={showPromptSettings}
        prompts={prompts}
        selectedPromptId={selectedPromptId}
        editingPrompt={editingPrompt}
        onPromptChange={handlePromptChange}
        onEditingPromptChange={setEditingPrompt}
        onSaveNewVersion={saveNewPromptVersion}
      />

      <div className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm border border-[#E5E7EB] sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"><span className="material-symbols-outlined text-[20px]">search</span></div>
          <input className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-background-light pl-10 pr-4 text-sm focus:border-[#8B5CF6] outline-none transition-all" placeholder="搜索证书名称、级别、类别..." type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <span className="text-xs font-bold text-text-muted px-2 py-1">筛选级别:</span>
          {Object.values(HonorLevel).map(level => (
            <button key={level} onClick={() => setSearchTerm(level)} className={`px-3 py-1 text-[10px] font-bold border rounded-md hover:bg-white transition-colors ${getLevelColor(level)}`}>{level}</button>
          ))}
        </div>
      </div>

      <CertificateTable
        certificates={displayCertificates}
        selectedIds={selectedIds}
        sortConfig={sortConfig}
        onSort={handleSort}
        onSelect={toggleSelect}
        onSelectAll={toggleSelectAll}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onView={(id) => onCertSelect(id)}
      />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[40] animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-6 border border-white/10">
            <div className="flex items-center gap-3 pr-6 border-r border-white/20">
              <div className="w-8 h-8 rounded-full bg-[#8B5CF6] flex items-center justify-center text-sm font-bold shadow-inner">
                {selectedIds.size}
              </div>
              <span className="text-sm font-medium tracking-wide">项已选中</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all font-bold text-sm shadow-lg shadow-green-600/20 active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">archive</span>
                批量导出
              </button>

              <button
                onClick={() => setDeleteConfirmation({ isOpen: true, certId: null, isBatch: true })}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-all font-bold text-sm shadow-lg shadow-red-500/20 active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
                批量删除
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all font-bold text-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
                取消选择
              </button>
            </div>
          </div>
        </div>
      )}

      <ExportStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        currentUser={currentUser}
        allUsers={allUsers}
        certificates={certificates}
        onExport={(filteredCerts) => performExport(filteredCerts, allUsers, currentUser)}
      />

      <CertificateEditModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingCertId(null); }}
        editingCert={editingCertId ? certificates.find(c => c.id === editingCertId) || null : null}
        onSave={handleSaveCertificate}
      />

      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, certId: null, isBatch: false })}
        onConfirm={confirmDelete}
        isBatch={deleteConfirmation.isBatch}
        count={selectedIds.size}
      />

      <AIImportModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        customProviders={customProviders}
        promptContent={editingPrompt}
        onSuccess={handleAIImportSuccess}
      />
    </div>
  );
};

export default CertificateList;
