import React, { useState, useRef } from 'react';
import { Certificate, CustomProvider, HonorLevel, CertificateCategory } from '../../types';
import { FileManager, CertificateDatabase } from '../../db';
import { useToast } from '../ToastContext';
import { parseLevel, parseCategory, getLevelColor } from './utils';

const JSON_ARRAY_REGEX = /\[[\s\S]*\]/;

interface AIImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  customProviders: CustomProvider[];
  promptContent: string;
  onSuccess: (newCerts: Certificate[]) => void;
}

export const AIImportModal: React.FC<AIImportModalProps> = ({
  isOpen, onClose, customProviders, promptContent, onSuccess
}) => {
  const { error, success } = useToast();
  
  const [aiAttachments, setAiAttachments] = useState<{ type: 'image' | 'pdf'; data: string; name: string }[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(customProviders.length > 0 ? customProviders[0].id : '');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<Partial<Certificate>[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Initialize selectedProviderId when providers change
  React.useEffect(() => {
    if (customProviders.length > 0 && !selectedProviderId) {
        setSelectedProviderId(customProviders[0].id);
    }
  }, [customProviders, selectedProviderId]);

  if (!isOpen) return null;

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

  const processAIImport = async () => {
    if (aiAttachments.length === 0) {
      setAiError("请先上传或粘贴证书图片/PDF");
      return;
    }

    setIsAIProcessing(true);
    setAiError(null);
    setAiPreviewData([]);

    const systemInstruction = promptContent;

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
      const jsonMatch = responseText.match(JSON_ARRAY_REGEX);
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

  const confirmImport = async () => {
    if (aiPreviewData.length === 0) return;

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

      let newCerts: Certificate[] = [];
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
        await CertificateDatabase.add(newCert); // Ideally batch add, but one by one for now
        newCerts.push(newCert);
      }
      
      onSuccess(newCerts);
      success(`成功导入 ${aiPreviewData.length} 条证书记录！`);
      onClose();
      
      // Reset state
      setAiAttachments([]);
      setAiPreviewData([]);
      setAiError(null);
      
    } catch (e) {
      console.error("Import failed", e);
      setAiError("导入数据库失败，请重试");
      error("导入失败");
    }
  };

  return (
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
          <button onClick={onClose} className="text-text-muted hover:text-text-main p-1"><span className="material-symbols-outlined">close</span></button>
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
            <button onClick={onClose} className="px-6 py-2.5 border rounded-lg text-text-muted font-bold text-sm hover:bg-white transition-colors">取消</button>
            {aiPreviewData.length > 0 ? (
              <button
                onClick={confirmImport}
               // disabled={isLoading} // Loading internal to this component now? Or prop? The original code had isLoading for parent.
               // Let's assume parent will refetch, but here we can just disable.
               // Actually we should probably have local loading state for save.
               // But for now keeping simple.
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
  );
};
