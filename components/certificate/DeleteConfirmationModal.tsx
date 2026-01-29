import React from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isBatch: boolean;
  count: number;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen, onClose, onConfirm, isBatch, count
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl">delete_forever</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-main">确认删除？</h3>
            <p className="text-sm text-text-muted mt-2">
              {isBatch
                ? `确定要永久删除选中的 ${count} 项记录吗？此操作不可撤销。`
                : "确定要永久删除这项荣誉记录吗？此操作不可撤销。"}
            </p>
          </div>
          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-border-light rounded-xl font-bold text-sm text-text-muted hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
