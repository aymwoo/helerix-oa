import React from 'react';
import { Certificate } from '../../types';
import { getLevelColor, formatDate } from './utils';

interface CertificateTableProps {
  certificates: Certificate[];
  selectedIds: Set<string>;
  sortConfig: { key: keyof Certificate | null; direction: 'asc' | 'desc' };
  onSort: (key: keyof Certificate) => void;
  onSelect: (e: React.MouseEvent, id: string) => void;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEdit: (e: React.MouseEvent, cert: Certificate) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onView: (id: string) => void;
}

export const CertificateTable: React.FC<CertificateTableProps> = ({
  certificates,
  selectedIds,
  sortConfig,
  onSort,
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onView
}) => {
  const getSortIcon = (columnKey: keyof Certificate) => {
    if (sortConfig.key !== columnKey) return <span className="material-symbols-outlined text-[16px] opacity-30">arrow_drop_down</span>;
    return <span className="material-symbols-outlined text-[16px] text-[#8B5CF6]">{sortConfig.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'}</span>;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-background-light/50">
          <tr>
            <th className="px-6 py-4 w-4">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#8B5CF6] cursor-pointer rounded"
                checked={certificates.length > 0 && selectedIds.size === certificates.length}
                onChange={onSelectAll}
              />
            </th>
            <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => onSort('name')}>证书/成果名称 {getSortIcon('name')}</th>
            <th className="px-6 py-4 font-semibold text-text-muted">颁发单位</th>
            <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => onSort('level')}>级别 {getSortIcon('level')}</th>
            <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => onSort('hours')}>学时 {getSortIcon('hours')}</th>
            <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => onSort('issueDate')}>取得日期 {getSortIcon('issueDate')}</th>
            <th className="px-6 py-4 font-semibold text-text-muted cursor-pointer select-none" onClick={() => onSort('timestamp')}>添加日期 {getSortIcon('timestamp')}</th>
            <th className="px-6 py-4 font-semibold text-text-muted text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {certificates.map((cert) => (
            <tr key={cert.id} className={`group transition-colors cursor-pointer ${selectedIds.has(cert.id) ? 'bg-[#8B5CF6]/5' : 'hover:bg-background-light/50'}`} onClick={(e) => onSelect(e, cert.id)}>
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
                  <button className="p-1.5 text-text-muted hover:text-[#8B5CF6] transition-colors" onClick={(e) => { e.stopPropagation(); onView(cert.id); }} title="查看详情"><span className="material-symbols-outlined text-[20px]">visibility</span></button>
                  <button className="p-1.5 text-text-muted hover:text-amber-600 transition-colors" onClick={(e) => onEdit(e, cert)} title="编辑"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                  <button className="p-1.5 text-text-muted hover:text-red-600 transition-colors" onClick={(e) => onDelete(e, cert.id)} title="删除"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {certificates.length === 0 && (
        <div className="p-20 text-center text-text-muted">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-20">inventory_2</span>
          <p>未找到匹配的成果记录</p>
        </div>
      )}
    </div>
  );
};
