
import React, { useState, useEffect, useMemo, useRef } from 'react';

import { Certificate, HonorLevel, CertificateCategory, PromptTemplate, CustomProvider, User, UserRole } from '../types';
import { CertificateDatabase, PromptDatabase, FileManager, AIProviderDatabase, UserDatabase } from '../db';

import { useToast } from '../components/ToastContext';

interface CertificateListProps {
  onCertSelect: (id: string) => void;
}

const CertificateList: React.FC<CertificateListProps> = ({ onCertSelect }) => {
  const { success, error, info, warning } = useToast();
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

  // Statistics & Export State
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [statsConfig, setStatsConfig] = useState({
    startDate: '',
    endDate: '',
    category: 'all',
    targetUserId: 'me' // 'me', 'all', or specific userId
  });
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
        const loadCerts = async () => {
          await CertificateDatabase.initialize();
          return await CertificateDatabase.getAll();
        };

        const loadPrompts = async () => {
          await PromptDatabase.initialize();
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
        if (providers.length > 0) setSelectedProviderId(providers[0].id);

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
        error("文件上传失败");
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
      success(deleteConfirmation.isBatch ? `已成功删除 ${idsToDelete.length} 项记录` : "该记录已成功删除");
    } catch (e) {
      console.error(e);
      error("删除操作失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCertificate = async () => {
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



  const performExport = async (certsToExport: Certificate[], filenamePrefix: string = "证书统计导出") => {
    if (certsToExport.length === 0) {
      warning("没有符合条件的记录可导出");
      return;
    }

    setIsLoading(true);
    
    // Dynamic import to reduce initial bundle size
    const XLSX = await import('xlsx');
    const JSZip = (await import('jszip')).default;
    const { saveAs } = await import('file-saver');

    const zip = new JSZip();
    const dateStr = new Date().toISOString().split('T')[0];
    const folderName = `${filenamePrefix}_${dateStr}`;
    const imgFolder = zip.folder(folderName + "/images");

    // Generate Excel Data
    const data = certsToExport.map(c => {
      const owner = allUsers.find(u => u.id === c.userId);
      return {
        "证书名称": c.name,
        "颁发单位": c.issuer,
        "级别": c.level,
        "类别": c.category,
        "取得日期": c.issueDate,
        "学时": c.hours || 0,
        "添加日期": formatDate(c.timestamp),
        "所属用户": owner ? owner.name : (c.userId === currentUser?.id ? currentUser?.name : "未知用户"),
        "图片文件名": ""
      };
    });

    const usedFilenames = new Set<string>();

    await Promise.all(certsToExport.map(async (c, index) => {
      if (!c.credentialUrl) return;

      try {
        let blob: Blob | null = null;
        let extension = "jpg";

        if (c.credentialUrl.startsWith("file://")) {
            const fileData = await FileManager.getFile(c.credentialUrl);
            if (fileData) {
                const byteCharacters = atob(fileData.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], { type: fileData.mimeType });
                if (fileData.mimeType === 'application/pdf') extension = 'pdf';
                else if (fileData.mimeType === 'image/png') extension = 'png';
                else if (fileData.mimeType === 'image/jpeg') extension = 'jpg';
            }
        } else {
             const res = await fetch(c.credentialUrl);
             if (res.ok) {
                 blob = await res.blob();
                 const mimeType = blob.type;
                 if (mimeType === 'application/pdf') extension = 'pdf';
                 else if (mimeType === 'image/png') extension = 'png';
                 else if (mimeType === 'image/jpeg') extension = 'jpg';
             }
        }

        if (blob && imgFolder) {
            const safeName = c.name.replace(/[\\/:*?"<>|]/g, "_");
            const dateStrClean = c.issueDate.replace(/-/g, "");
            let filename = `${dateStrClean}_${safeName}.${extension}`;
            
            let counter = 1;
            while (usedFilenames.has(filename)) {
                filename = `${dateStrClean}_${safeName}_${counter}.${extension}`;
                counter++;
            }
            usedFilenames.add(filename);

            imgFolder.file(filename, blob);
            data[index]["图片文件名"] = filename;
        }
      } catch (err) {
          console.error(`Failed to process image for certificate ${c.name}`, err);
      }
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "证书统计");
    
    // Auto-width columns
    const maxWidth = data.reduce((w, r) => Math.max(w, r["证书名称"].length), 10);
    worksheet['!cols'] = [
      { wch: maxWidth + 5 }, // Name
      { wch: 20 }, // Issuer
      { wch: 10 }, // Level
      { wch: 10 }, // Category
      { wch: 12 }, // Date
      { wch: 8 },  // Hours
      { wch: 12 }, // Add Date
      { wch: 15 }, // User
      { wch: 30 }  // Image Filename
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    zip.file(`${folderName}/证书统计表.xlsx`, excelBuffer);

    try {
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `${folderName}.zip`);
        success(`成功导出 ${certsToExport.length} 条记录及相应附件`);
    } catch (err) {
        console.error("Failed to generate zip", err);
        error("导出压缩包失败");
    } finally {
        setIsLoading(false);
        setIsStatsModalOpen(false);
    }
  };

  const handleExport = async () => {
    let filtered = certificates;

    // 1. Filter by User
    if (statsConfig.targetUserId === 'me') {
      if (currentUser) {
        filtered = filtered.filter(c => c.userId === currentUser.id || !c.userId);
      }
    } else if (statsConfig.targetUserId !== 'all') {
      filtered = filtered.filter(c => c.userId === statsConfig.targetUserId);
    } 

    // 2. Filter by Date Range (Issue Date)
    if (statsConfig.startDate) {
      filtered = filtered.filter(c => c.issueDate >= statsConfig.startDate);
    }
    if (statsConfig.endDate) {
      filtered = filtered.filter(c => c.issueDate <= statsConfig.endDate);
    }

    // 3. Filter by Category
    if (statsConfig.category !== 'all') {
      filtered = filtered.filter(c => c.category === statsConfig.category);
    }

    await performExport(filtered);
  };

  const handleBatchExport = async () => {
    const selectedCerts = certificates.filter(c => selectedIds.has(c.id));
    await performExport(selectedCerts, "批量导出证书");
    setSelectedIds(new Set()); // Clear selection after export
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

  // ========== Camera Functions ==========
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      error("无法访问摄像头，请检查权限 (需 HTTPS 或 localhost)。");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(async (blob) => {
        if (blob) {
          const base64 = await blobToBase64(blob);
          setAiAttachments(prev => [...prev, {
            type: 'image',
            data: base64,
            name: `camera_capture_${Date.now()}.jpg`
          }]);
        }
      }, 'image/jpeg');
    }
    stopCamera();
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
      // Save images to FileManager
      const savedFileUris: string[] = [];
      for (const att of aiAttachments) {
          try {
             // Convert base64 to Blob -> File
             const byteChars = atob(att.data);
             const byteNumbers = new Array(byteChars.length);
             for (let i=0; i<byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
             const byteArray = new Uint8Array(byteNumbers);
             const blob = new Blob([byteArray], {type: att.type === 'pdf' ? 'application/pdf' : 'image/jpeg'});
             const file = new File([blob], att.name, {type: blob.type});
             // UPLOAD
             const uri = await FileManager.saveFile(file);
             savedFileUris.push(uri);
          } catch(e) { console.error("Failed to save attachment", e); }
      }
      const primaryCredentialUrl = savedFileUris.length > 0 ? savedFileUris[0] : "";

      let updatedCerts = certificates;
      for (const previewCert of aiPreviewData) {
        const newCert: Certificate = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          name: previewCert.name || "",
          issuer: previewCert.issuer || "",
          issueDate: previewCert.issueDate || new Date().toISOString().split('T')[0],
          level: previewCert.level || HonorLevel.Municipal,
          category: previewCert.category || CertificateCategory.Other,
          credentialUrl: primaryCredentialUrl,
          hours: previewCert.hours || 0,
          timestamp: Date.now()
        };
        updatedCerts = await CertificateDatabase.add(newCert);
      }
      setCertificates(updatedCerts);
      closeAIModal();
      success(`成功导入 ${aiPreviewData.length} 条证书记录！`);
    } catch (e) {
      console.error("Import failed", e);
      setAiError("导入数据库失败，请重试");
      error("导入失败");
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
    return <span className="material-symbols-outlined text-[16px] text-[#8B5CF6]">{sortConfig.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'}</span>;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
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

      {/* Module-specific Prompt Settings */}
      {showPromptSettings && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-300 p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-text-main flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[#8B5CF6]">auto_fix</span>
                证书识别录入 Prompt 指令集
              </h3>
              <p className="text-xs text-text-muted font-medium">定制 AI 对荣誉档案的 OCR 提取规则，修改将仅影响“证书登记”模块。</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">选择预设:</span>
              <select
                value={selectedPromptId}
                onChange={(e) => handlePromptChange(e.target.value)}
                className="text-xs font-semibold bg-background-light border border-[#E5E7EB] rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 min-w-[160px]"
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
              className="w-full h-32 bg-background-light/30 border border-[#E5E7EB] rounded-xl p-5 text-xs font-medium text-text-main leading-relaxed focus:ring-2 focus:ring-[#8B5CF6]/20 outline-none resize-none no-scrollbar shadow-inner"
              placeholder="输入 AI 档案录入指令..."
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={saveNewPromptVersion}
                className="px-4 py-2 bg-[#8B5CF6] text-white rounded-lg text-[10px] font-semibold hover:bg-violet-700 shadow-lg shadow-[#8B5CF6]/20 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                另存为新版本
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm border border-[#E5E7EB] sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"><span className="material-symbols-outlined text-[20px]">search</span></div>
          <input className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-background-light pl-10 pr-4 text-sm focus:border-[#8B5CF6] outline-none transition-all" placeholder="搜索证书名称、级别、类别..." type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <span className="text-xs font-bold text-text-muted px-2 py-1">筛选级别:</span>
          {Object.values(HonorLevel).map(level => (
            <button key={level} onClick={() => setSearchTerm(level)} className="px-3 py-1 text-[10px] font-bold border rounded-md hover:bg-white transition-colors">{level}</button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-background-light/50">
            <tr>
              <th className="px-6 py-4 w-4">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#8B5CF6] cursor-pointer rounded"
                  checked={displayCertificates.length > 0 && selectedIds.size === displayCertificates.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => handleSort('name')}>证书/成果名称 {getSortIcon('name')}</th>
              <th className="px-6 py-4 font-semibold text-text-muted">颁发单位</th>
              <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => handleSort('level')}>级别 {getSortIcon('level')}</th>
              <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => handleSort('hours')}>学时 {getSortIcon('hours')}</th>
              <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => handleSort('issueDate')}>取得日期 {getSortIcon('issueDate')}</th>
              <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => handleSort('timestamp')}>添加日期 {getSortIcon('timestamp')}</th>
              <th className="px-6 py-4 font-semibold text-text-muted text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {displayCertificates.map((cert) => (
              <tr key={cert.id} className={`group transition-colors cursor-pointer ${selectedIds.has(cert.id) ? 'bg-[#8B5CF6]/5' : 'hover:bg-background-light/50'}`} onClick={(e) => toggleSelect(e, cert.id)}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                    checked={selectedIds.has(cert.id)}
                    readOnly
                  />
                </td>
                <td className="px-6 py-4 font-bold text-text-main">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/5 flex items-center justify-center text-[#8B5CF6]"><span className="material-symbols-outlined text-[20px]">award_star</span></div>
                    {cert.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-text-muted">{cert.issuer}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getLevelColor(cert.level)}`}>{cert.level}</span>
                </td>
                <td className="px-6 py-4">
                  {cert.hours ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-semibold border border-blue-100">
                      {cert.hours} h
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-300">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-text-muted font-mono">{cert.issueDate}</td>
                <td className="px-6 py-4 text-text-muted font-mono">{formatDate(cert.timestamp || Date.now())}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-text-muted hover:text-[#8B5CF6] transition-colors" onClick={(e) => { e.stopPropagation(); onCertSelect(cert.id); }} title="查看详情"><span className="material-symbols-outlined text-[20px]">visibility</span></button>
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
                onClick={clearSelection}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all font-bold text-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
                取消选择
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Statistics Modal */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-background-light/30">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600">table_view</span>
                证书统计导出
              </h3>
              <button onClick={() => setIsStatsModalOpen(false)} className="text-text-muted hover:text-text-main"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-5">
              
              {/* User Scope Selection (Admin Only) */}
              {currentUser?.roles.includes(UserRole.Admin) && (
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-main">统计范围 (用户)</label>
                  <select 
                    value={statsConfig.targetUserId} 
                    onChange={(e) => setStatsConfig({...statsConfig, targetUserId: e.target.value})}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500/20 outline-none"
                  >
                    <option value="me">仅统计我自己</option>
                    <option value="all">所有用户</option>
                    <hr />
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-main">取得日期范围</label>
                <div className="flex items-center gap-2">
                  <input 
                    data-testid="stats-start-date"
                    type="date" 
                    value={statsConfig.startDate} 
                    onChange={(e) => setStatsConfig({...statsConfig, startDate: e.target.value})}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-500 transition-colors" 
                  />
                  <span className="text-text-muted">-</span>
                  <input 
                    data-testid="stats-end-date"
                    type="date" 
                    value={statsConfig.endDate} 
                    onChange={(e) => setStatsConfig({...statsConfig, endDate: e.target.value})}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-500 transition-colors" 
                  />
                </div>
                <p className="text-[10px] text-text-muted">留空则不限制日期范围</p>
              </div>

              {/* Category Filter */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-main">证书类别</label>
                <select 
                  data-testid="stats-category-select"
                  value={statsConfig.category} 
                  onChange={(e) => setStatsConfig({...statsConfig, category: e.target.value})}
                  className="w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500/20 outline-none"
                >
                  <option value="all">所有类别</option>
                  {Object.values(CertificateCategory).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setIsStatsModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-colors">取消</button>
              <button 
                onClick={handleExport}
                className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg shadow-lg shadow-green-600/20 hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                生成 Excel
              </button>
            </div>
          </div>
        </div>
      )}



      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-background-light/30">
              <h3 className="text-xl font-bold text-text-main">{editingCertId ? '编辑荣誉成果' : '登记荣誉成果'}</h3>
              <button onClick={closeModal} className="text-text-muted hover:text-text-main p-1"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">成果名称 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#8B5CF6]/20 outline-none transition-all" placeholder="例如：2023年度省级教学能手" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">颁发/主管单位 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.issuer} onChange={(e) => setFormData({ ...formData, issuer: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#8B5CF6]/20 outline-none transition-all" placeholder="例如：省教育厅" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-main">荣誉级别</label>
                  <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value as HonorLevel })} className="w-full px-4 py-2.5 border rounded-lg text-sm outline-none bg-white transition-all">
                    {Object.values(HonorLevel).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-main">成果类别</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as CertificateCategory })} className="w-full px-4 py-2.5 border rounded-lg text-sm outline-none bg-white transition-all">
                    {Object.values(CertificateCategory).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">取得日期 <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg outline-none text-sm transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">获得学时 (仅限培训类)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#8B5CF6]/20 outline-none transition-all"
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
                    className="flex-1 px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#8B5CF6]/20 outline-none transition-all"
                    placeholder="https://... 或点击右侧按钮上传"
                  />
                  <label className={`flex items-center justify-center w-12 border border-dashed rounded-lg cursor-pointer hover:bg-[#8B5CF6]/5 hover:border-[#8B5CF6] transition-all text-[#8B5CF6] ${isUploading ? 'opacity-50 cursor-wait' : ''}`} title="上传本地文档">
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
              <button onClick={closeModal} className="px-6 py-2.5 border rounded-lg text-text-muted font-bold text-sm hover:bg-white transition-colors">取消</button>
              <button onClick={handleSaveCertificate} disabled={isUploading} className="px-6 py-2.5 bg-[#8B5CF6] text-white rounded-lg font-bold text-sm shadow-lg shadow-[#8B5CF6]/20 hover:bg-violet-700 transition-all active:scale-95 disabled:opacity-50">
                {editingCertId ? '保存修改' : '提交登记'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl">delete_forever</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-main">确认删除？</h3>
                <p className="text-sm text-text-muted mt-2">
                  {deleteConfirmation.isBatch 
                    ? `确定要永久删除选中的 ${selectedIds.size} 项记录吗？此操作不可撤销。` 
                    : "确定要永久删除这项荣誉记录吗？此操作不可撤销。"}
                </p>
              </div>
              <div className="flex gap-3 w-full mt-4">
                <button 
                  onClick={() => setDeleteConfirmation({ isOpen: false, certId: null, isBatch: false })}
                  className="flex-1 py-3 border border-border-light rounded-xl font-bold text-sm text-text-muted hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Import Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white shadow-lg">
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
              <div className="flex items-center gap-4 p-4 bg-background-light rounded-lg border border-[#E5E7EB]">
                <span className="material-symbols-outlined text-[#8B5CF6]">cloud</span>
                <div className="flex-1">
                  <label className="text-xs font-bold text-text-muted uppercase">AI 引擎</label>
                  <select
                    value={selectedProviderId}
                    onChange={(e) => setSelectedProviderId(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 mt-1"
                  >
                    {!customProviders.length && <option value="">无可用模型，请先去系统设置添加</option>}
                    {customProviders.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Area */}
              {/* Upload Area or Camera View */}
              {isCameraOpen ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-[#8B5CF6] shadow-lg animate-in fade-in zoom-in duration-300">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  
                  <div className="absolute bottom-6 flex gap-6 z-10">
                    <button 
                      onClick={stopCamera} 
                      className="px-6 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold hover:bg-white/30 transition-all"
                    >
                      取消
                    </button>
                    <button 
                      onClick={takePhoto} 
                      className="w-16 h-16 rounded-full bg-white border-4 border-[#8B5CF6]/50 shadow-[0_0_20px_rgba(139,92,246,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                      title="拍摄照片"
                    >
                       <div className="w-12 h-12 rounded-full bg-[#8B5CF6]"></div>
                    </button>
                  </div>
                  
                  <div className="absolute top-4 right-4 bg-red-500/80 text-white text-[10px] px-2 py-0.5 rounded animate-pulse">
                    REC
                  </div>
                </div>
              ) : (
                <div
                  ref={pasteAreaRef}
                  onPaste={handlePaste}
                  className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-8 text-center hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/5 transition-all cursor-pointer focus-within:border-[#8B5CF6] focus-within:bg-[#8B5CF6]/5 group relative"
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
                    <div className="w-16 h-16 bg-[#8B5CF6]/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <span className="material-symbols-outlined text-4xl text-[#8B5CF6]">cloud_upload</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main">点击上传或拖拽证书图片/PDF</p>
                      <p className="text-xs text-text-muted mt-1">支持 Ctrl+V 粘贴内容</p>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full justify-center">
                       <span className="h-px bg-gray-200 w-12"></span>
                       <span className="text-[10px] text-text-muted">或者</span>
                       <span className="h-px bg-gray-200 w-12"></span>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); startCamera(); }}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-text-main shadow-sm hover:bg-[#8B5CF6] hover:text-white hover:border-[#8B5CF6] transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      调用摄像头拍照
                    </button>
                  </div>
                </div>
              )}

              {/* Attachments Preview */}
              {aiAttachments.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {aiAttachments.map((att, idx) => (
                    <div key={idx} className="relative group">
                      <div className="h-20 w-24 bg-background-light border border-[#E5E7EB] rounded-lg flex flex-col items-center justify-center gap-1 overflow-hidden">
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
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2">
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
                      <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
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
                <button onClick={closeAIModal} className="px-6 py-2.5 border rounded-lg text-text-muted font-bold text-sm hover:bg-white transition-colors">取消</button>
                {aiPreviewData.length > 0 ? (
                  <button
                    onClick={confirmAIImport}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    确认导入 {aiPreviewData.length} 条
                  </button>
                ) : (
                  <button
                    onClick={processAIImport}
                    disabled={isAIProcessing || aiAttachments.length === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
