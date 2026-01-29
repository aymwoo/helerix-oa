import React, { useState } from 'react';
import { User, UserRole, Certificate, CertificateCategory } from '../../types';

interface StatsConfig {
  startDate: string;
  endDate: string;
  category: string;
  targetUserId: string;
}

interface ExportStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  allUsers: User[];
  certificates: Certificate[];
  onExport: (filteredCerts: Certificate[]) => void;
}

export const ExportStatsModal: React.FC<ExportStatsModalProps> = ({
  isOpen, onClose, currentUser, allUsers, certificates, onExport
}) => {
  const [statsConfig, setStatsConfig] = useState<StatsConfig>({
    startDate: '',
    endDate: '',
    category: 'all',
    targetUserId: 'me'
  });

  if (!isOpen) return null;

  const handleExportClick = () => {
    let filtered = certificates;

    // 1. Filter by User
    if (statsConfig.targetUserId === 'me') {
      if (currentUser) {
        filtered = filtered.filter(c => c.userId === currentUser.id || !c.userId);
      }
    } else if (statsConfig.targetUserId !== 'all') {
      filtered = filtered.filter(c => c.userId === statsConfig.targetUserId);
    }

    // 2. Filter by Date Range
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

    onExport(filtered);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-background-light/30">
          <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
            <span className="material-symbols-outlined text-green-600">table_view</span>
            证书统计导出
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-main"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-6 space-y-5">

          {/* User Scope Selection (Admin Only) */}
          {currentUser?.roles.includes(UserRole.Admin) && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-text-main">统计范围 (用户)</label>
              <select
                value={statsConfig.targetUserId}
                onChange={(e) => setStatsConfig({ ...statsConfig, targetUserId: e.target.value })}
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
                onChange={(e) => setStatsConfig({ ...statsConfig, startDate: e.target.value })}
                className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:border-green-500 transition-colors"
              />
              <span className="text-text-muted">-</span>
              <input
                data-testid="stats-end-date"
                type="date"
                value={statsConfig.endDate}
                onChange={(e) => setStatsConfig({ ...statsConfig, endDate: e.target.value })}
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
              onChange={(e) => setStatsConfig({ ...statsConfig, category: e.target.value })}
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
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-colors">取消</button>
          <button
            onClick={handleExportClick}
            className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg shadow-lg shadow-green-600/20 hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            生成 Excel
          </button>
        </div>
      </div>
    </div>
  );
};
