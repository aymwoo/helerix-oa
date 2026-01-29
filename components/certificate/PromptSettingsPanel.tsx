import React from 'react';
import { PromptTemplate } from '../../types';

interface PromptSettingsPanelProps {
  isOpen: boolean;
  prompts: PromptTemplate[];
  selectedPromptId: string;
  editingPrompt: string;
  onPromptChange: (id: string) => void;
  onEditingPromptChange: (content: string) => void;
  onSaveNewVersion: () => void;
}

export const PromptSettingsPanel: React.FC<PromptSettingsPanelProps> = ({
  isOpen, prompts, selectedPromptId, editingPrompt,
  onPromptChange, onEditingPromptChange, onSaveNewVersion
}) => {
  if (!isOpen) return null;

  return (
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
            onChange={(e) => onPromptChange(e.target.value)}
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
          onChange={(e) => onEditingPromptChange(e.target.value)}
          className="w-full h-32 bg-background-light/30 border border-[#E5E7EB] rounded-xl p-5 text-xs font-medium text-text-main leading-relaxed focus:ring-2 focus:ring-[#8B5CF6]/20 outline-none resize-none no-scrollbar shadow-inner"
          placeholder="输入 AI 档案录入指令..."
        />
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={onSaveNewVersion}
            className="px-4 py-2 bg-[#8B5CF6] text-white rounded-lg text-[10px] font-semibold hover:bg-violet-700 shadow-lg shadow-[#8B5CF6]/20 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            另存为新版本
          </button>
        </div>
      </div>
    </div>
  );
};
