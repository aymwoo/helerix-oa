
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserStatus, User, UserRole } from '../types';
import { UserDatabase } from '../db';
import { AVATAR_ALICE, AVATAR_MARCUS, AVATAR_SARAH, AVATAR_DAVID, AVATAR_EMILY } from '../constants';
import { read, utils } from 'xlsx';

interface UserListProps {
  onUserSelect: (id: string) => void;
}

const UserList: React.FC<UserListProps> = ({ onUserSelect }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof User | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    roles: UserRole[];
    department: string;
    status: UserStatus;
  }>({
    name: '',
    email: '',
    roles: [],
    department: '',
    status: UserStatus.Active
  });

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        await UserDatabase.initialize();
        const loadedUsers = await UserDatabase.getAll();
        setUsers(loadedUsers);
      } catch (error) {
        console.error("加载教研员数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  // 为不同学科分配颜色主题
  const getSubjectColor = (role: string) => {
    if (role === UserRole.Admin) return 'bg-violet-100 text-violet-700 border-violet-200';
    if (role.includes('语文') || role.includes('历史') || role.includes('政治') || role.includes('道德')) 
        return 'bg-red-50 text-red-700 border-red-200';
    if (role.includes('数学') || role.includes('物理') || role.includes('化学') || role.includes('生物') || role.includes('信息')) 
        return 'bg-blue-50 text-blue-700 border-blue-200';
    if (role.includes('英语'))
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (role.includes('体育') || role.includes('艺术'))
        return 'bg-green-50 text-green-700 border-green-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const handleSort = (key: keyof User) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); 
    if (window.confirm(`确定要移除教研员 ${name} 吗？`)) {
      setIsLoading(true);
      try {
        const updatedUsers = await UserDatabase.delete(id);
        setUsers(updatedUsers);
      } catch (e) {
        console.error("删除失败", e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditClick = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      roles: user.roles || [],
      department: user.department,
      status: user.status
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
    setFormData({
      name: '',
      email: '',
      roles: [],
      department: '',
      status: UserStatus.Active
    });
  };

  const handleRoleToggle = (role: UserRole) => {
    const newRoles = formData.roles.includes(role)
      ? formData.roles.filter(r => r !== role)
      : [...formData.roles, role];
    setFormData({ ...formData, roles: newRoles });
  };

  const handleSaveUser = async () => {
    if (!formData.name || !formData.email || !formData.department || formData.roles.length === 0) {
      alert("请完整填写教研员信息并分配学科");
      return;
    }

    setIsSaving(true);
    try {
      let updatedUsers;
      if (editingUserId) {
        const existingUser = users.find(u => u.id === editingUserId);
        if (existingUser) {
           const updatedUser: User = {
             ...existingUser,
             name: formData.name,
             email: formData.email,
             roles: formData.roles,
             department: formData.department,
             status: formData.status
           };
           updatedUsers = await UserDatabase.update(updatedUser);
        }
      } else {
        const avatars = [AVATAR_ALICE, AVATAR_MARCUS, AVATAR_SARAH, AVATAR_DAVID, AVATAR_EMILY];
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
        const newUser: User = {
          id: Date.now().toString(),
          name: formData.name,
          email: formData.email,
          roles: formData.roles,
          department: formData.department,
          status: formData.status,
          avatarUrl: randomAvatar
        };
        updatedUsers = await UserDatabase.add(newUser);
      }
      setUsers(updatedUsers || []);
      handleCloseModal();
    } catch (error) {
      console.error("操作失败:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Bulk Import / Export Logic ---
  
  const downloadTemplate = () => {
    const headers = ['姓名', '邮箱', '科室', '负责学科(用逗号分隔)', '状态(在线/离线/未激活)'];
    const example = ['张三', 'zhang@edu.com', '数学教研组', '数学教研员,信息技术教研员', '在线'];
    const csvContent = "\uFEFF" + [headers.join(','), example.join(',')].join('\n'); // BOM for Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "教研员导入模板.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = utils.sheet_to_json(ws, { header: 1 });
        
        // Skip header row
        const rows = data.slice(1) as any[];
        let importedCount = 0;

        for (const row of rows) {
          if (!row[0]) continue; // Skip empty rows
          
          const name = row[0];
          const email = row[1];
          const department = row[2];
          const rolesStr = row[3] as string;
          const statusStr = row[4] as string;

          // Parse roles
          const mappedRoles: UserRole[] = [];
          if (rolesStr) {
            const roleNames = rolesStr.split(/[,，]/).map(s => s.trim());
            Object.values(UserRole).forEach(roleEnum => {
              if (roleNames.includes(roleEnum)) mappedRoles.push(roleEnum);
            });
          }

          // Parse status
          let status = UserStatus.Active;
          if (statusStr === '离线') status = UserStatus.Offline;
          if (statusStr === '未激活') status = UserStatus.Inactive;

          const avatars = [AVATAR_ALICE, AVATAR_MARCUS, AVATAR_SARAH, AVATAR_DAVID, AVATAR_EMILY];
          const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

          const newUser: User = {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            name,
            email,
            department,
            roles: mappedRoles.length > 0 ? mappedRoles : [UserRole.Math], // Fallback
            status,
            avatarUrl: randomAvatar
          };
          
          await UserDatabase.add(newUser);
          importedCount++;
        }

        const updatedUsers = await UserDatabase.getAll();
        setUsers(updatedUsers);
        alert(`成功导入 ${importedCount} 名教研员`);

      } catch (error) {
        console.error("Import failed", error);
        alert("文件解析失败，请检查格式是否正确");
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };


  const sortedUsers = useMemo(() => {
    const sortableItems = [...users];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = (a[sortConfig.key!] || "").toString();
        const bValue = (b[sortConfig.key!] || "").toString();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [users, sortConfig]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedUsers.length && sortedUsers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedUsers.map(u => u.id)));
    }
  };
  
  const isAllSelected = sortedUsers.length > 0 && selectedIds.size === sortedUsers.length;

  const getSortIcon = (columnKey: keyof User) => {
    if (sortConfig.key !== columnKey) return <span className="material-symbols-outlined text-[16px] opacity-30">arrow_drop_down</span>;
    return (
      <span className="material-symbols-outlined text-[16px] text-primary">
        {sortConfig.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'}
      </span>
    );
  };

  if (isLoading && users.length === 0) {
      return (
          <div className="flex items-center justify-center h-full text-text-muted gap-2">
              <span className="material-symbols-outlined animate-spin">sync</span>
              <span>正在载入教研员名录...</span>
          </div>
      );
  }

  return (
    <div className="space-y-6 relative animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-text-main leading-tight">教研员名录</h1>
          <p className="text-text-muted text-sm font-normal">管理跨学科教研专家库，配置任教学科与教研权限。</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={downloadTemplate}
                className="group flex items-center justify-center gap-2 rounded-lg bg-white border border-border-light px-4 py-2.5 text-text-muted hover:bg-gray-50 transition-all active:scale-95"
                title="下载 Excel/CSV 导入模板"
            >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span className="text-sm font-bold">模板</span>
            </button>
            
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="group flex items-center justify-center gap-2 rounded-lg bg-white border border-border-light px-4 py-2.5 text-text-muted hover:bg-gray-50 transition-all active:scale-95"
            >
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                <span className="text-sm font-bold">批量导入</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />

            <button 
                onClick={() => { setEditingUserId(null); setIsModalOpen(true); }}
                className="group flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-violet-600 px-5 py-2.5 text-white shadow-lg shadow-violet-200/50 hover:shadow-violet-300 transition-all active:scale-95"
            >
                <span className="material-symbols-outlined text-[20px]">person_add</span>
                <span className="text-sm font-bold tracking-wide">注册新教研员</span>
            </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm border border-border-light sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input
            className="h-10 w-full rounded-lg border border-border-light bg-background-light pl-10 pr-4 text-sm text-text-main placeholder-text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            placeholder="搜索教研员姓名、学科或邮箱..."
            type="text"
          />
        </div>
        <div className="flex items-center gap-2">
          {['文科', '理科', '综合'].map(cat => (
              <button key={cat} className="px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-background-light text-text-muted transition-colors">
                {cat}
              </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-light bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-light bg-background-light/50">
              <tr>
                <th className="px-6 py-4 w-4">
                    <input type="checkbox" className="w-4 h-4 accent-primary cursor-pointer rounded" checked={isAllSelected} onChange={toggleSelectAll} />
                </th>
                <th className="px-6 py-4 font-semibold text-text-muted">
                  <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('name')}>教研员姓名 {getSortIcon('name')}</div>
                </th>
                <th className="px-6 py-4 font-semibold text-text-muted">负责学科 (支持兼任)</th>
                <th className="px-6 py-4 font-semibold text-text-muted">所属科室</th>
                <th className="px-6 py-4 font-semibold text-text-muted">系统状态</th>
                <th className="px-6 py-4 font-semibold text-text-muted text-right">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {sortedUsers.map((user) => (
                <tr key={user.id} className={`group transition-colors cursor-pointer ${selectedIds.has(user.id) ? 'bg-primary/5' : 'hover:bg-background-light/50'}`} onClick={() => toggleSelection(user.id)}>
                  <td className="px-6 py-4"><input type="checkbox" className="w-4 h-4 accent-primary cursor-pointer rounded" checked={selectedIds.has(user.id)} readOnly /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3" onClick={(e) => { e.stopPropagation(); onUserSelect(user.id); }}>
                      <div className="w-10 h-10 rounded-full bg-cover border-2 border-white shadow-sm ring-1 ring-border-light" style={{ backgroundImage: `url(${user.avatarUrl})` }}></div>
                      <div>
                        <p className="font-semibold text-text-main group-hover:text-primary transition-colors flex items-center gap-1">
                          {user.name}
                          {user.roles.includes(UserRole.Admin) && <span className="material-symbols-outlined text-[14px] text-primary" title="系统管理员">verified_user</span>}
                        </p>
                        <p className="text-xs text-text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.map((role, idx) => (
                        <span key={idx} className={`px-2 py-0.5 text-[10px] font-bold border rounded-md whitespace-nowrap ${getSubjectColor(role)}`}>
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-main">{user.department}</td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold 
                        ${user.status === UserStatus.Active ? 'bg-green-50 text-green-700 border-green-100' : 
                          user.status === UserStatus.Offline ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-red-50 text-red-700 border-red-100'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === UserStatus.Active ? 'bg-green-500' : user.status === UserStatus.Offline ? 'bg-gray-400' : 'bg-red-500'}`}></span>
                      {user.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                      <button className="p-1.5 rounded-lg text-text-muted hover:bg-primary/10 hover:text-primary transition-colors" onClick={(e) => handleEditClick(e, user)} title="编辑配置"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                      <button className="p-1.5 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors" onClick={(e) => handleDelete(e, user.id, user.name)} title="移除"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-background-light/30">
              <div>
                <h3 className="text-xl font-bold text-text-main">{editingUserId ? '修改教研员配置' : '注册新成员'}</h3>
                <p className="text-xs text-text-muted mt-0.5">配置教研员的基础信息及负责的学科范围。</p>
              </div>
              <button onClick={handleCloseModal} className="text-text-muted hover:text-text-main p-2 hover:bg-gray-100 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-main">全名 <span className="text-red-500 font-normal">*</span></label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-border-light rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="例如：张老师" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-main">教研邮箱 <span className="text-red-500 font-normal">*</span></label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 border border-border-light rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="example@edu.com" />
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-bold text-text-main">负责学科与角色 <span className="text-red-500 font-normal">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2">
                  {Object.values(UserRole).map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleToggle(role)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-bold transition-all text-left ${
                        formData.roles.includes(role)
                          ? 'bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary/20'
                          : 'bg-white border-border-light text-text-muted hover:border-primary/50'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[16px] ${formData.roles.includes(role) ? 'text-primary' : 'text-gray-300'}`}>
                        {formData.roles.includes(role) ? 'check_circle' : 'circle'}
                      </span>
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-main">所在科室 <span className="text-red-500 font-normal">*</span></label>
                  <input type="text" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-2.5 border border-border-light rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="例如：中学英语组" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-main">账户状态</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as UserStatus})} className="w-full px-4 py-2.5 border border-border-light rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white">
                    {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 border-t bg-background-light/20 flex justify-end gap-3">
              <button onClick={handleCloseModal} className="px-6 py-2.5 border border-border-light rounded-xl text-text-muted hover:bg-white hover:text-text-main text-sm font-bold transition-all">取消</button>
              <button 
                onClick={handleSaveUser} 
                disabled={isSaving}
                className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-violet-700 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
              >
                {isSaving && <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>}
                {editingUserId ? '保存变更' : '确认注册'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
