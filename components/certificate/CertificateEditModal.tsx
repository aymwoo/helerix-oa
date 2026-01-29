import React, { useState, useEffect } from 'react';
import { Certificate, HonorLevel, CertificateCategory } from '../../types';
import { FileManager } from '../../db';

interface CertificateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCert: Certificate | null;
  onSave: (formData: CertificateFormData) => Promise<void>;
}

export interface CertificateFormData {
  name: string;
  issuer: string;
  issueDate: string;
  level: HonorLevel;
  category: CertificateCategory;
  credentialUrl: string;
  hours: number;
}

export const CertificateEditModal: React.FC<CertificateEditModalProps> = ({
  isOpen, onClose, editingCert, onSave
}) => {
  const [formData, setFormData] = useState<CertificateFormData>({
    name: '',
    issuer: '',
    issueDate: '',
    level: HonorLevel.Municipal,
    category: CertificateCategory.Award,
    credentialUrl: '',
    hours: 0
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (editingCert) {
      setFormData({
        name: editingCert.name,
        issuer: editingCert.issuer,
        issueDate: editingCert.issueDate,
        level: editingCert.level,
        category: editingCert.category,
        credentialUrl: editingCert.credentialUrl || '',
        hours: editingCert.hours || 0
      });
    } else {
        // Reset for new entry
        setFormData({
            name: '',
            issuer: '',
            issueDate: '',
            level: HonorLevel.Municipal,
            category: CertificateCategory.Award,
            credentialUrl: '',
            hours: 0
        });
    }
  }, [editingCert, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const fileUri = await FileManager.saveFile(file);
        setFormData({ ...formData, credentialUrl: fileUri });
      } catch (err) {
        console.error("Upload failed", err);
        // Error handling typically done via toast in parent or context, 
        // but here we just log. The parent can pass an error handler if needed.
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = async () => {
      await onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
        <div className="px-6 py-5 border-b flex justify-between items-center bg-background-light/30">
          <h3 className="text-xl font-bold text-text-main">{editingCert ? '编辑荣誉成果' : '登记荣誉成果'}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-main p-1"><span className="material-symbols-outlined">close</span></button>
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
          <button onClick={onClose} className="px-6 py-2.5 border rounded-lg text-text-muted font-bold text-sm hover:bg-white transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={isUploading} className="px-6 py-2.5 bg-[#8B5CF6] text-white rounded-lg font-bold text-sm shadow-lg shadow-[#8B5CF6]/20 hover:bg-violet-700 transition-all active:scale-95 disabled:opacity-50">
            {editingCert ? '保存修改' : '提交登记'}
          </button>
        </div>
      </div>
    </div>
  );
};
