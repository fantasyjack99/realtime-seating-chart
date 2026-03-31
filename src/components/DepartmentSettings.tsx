import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { DepartmentConfig } from '../types';
import { addDepartment, updateDepartment, deleteDepartment } from '../services/dataService';

interface DepartmentSettingsProps {
  onClose: () => void;
  departments: DepartmentConfig[];
  onUpdate: (deps: DepartmentConfig[]) => void;
}

export function DepartmentSettings({ onClose, departments, onUpdate }: DepartmentSettingsProps) {
  const [localDeps, setLocalDeps] = useState<DepartmentConfig[]>([]);
  const [newDep, setNewDep] = useState({ department: '', section: '', color: '#e2e8f0' });

  useEffect(() => {
    // Group departments by name to keep them together
    const grouped: DepartmentConfig[] = [];
    const seen = new Set<string>();
    
    departments.forEach(dep => {
      if (!seen.has(dep.department)) {
        seen.add(dep.department);
        // Find all entries for this department and add them together
        const sameDept = departments.filter(d => d.department === dep.department);
        grouped.push(...sameDept);
      }
    });
    
    setLocalDeps(grouped);
  }, [departments]);

  const handleAdd = async () => {
    if (!newDep.department || !newDep.section) return;
    
    // Use existing color for the same department if available
    const existing = localDeps.find(d => d.department === newDep.department);
    const colorToUse = existing ? existing.color : newDep.color;
    
    try {
      const added = await addDepartment({ ...newDep, color: colorToUse });
      
      // Find the last index of the same department to insert after it
      const lastIndex = [...localDeps].reverse().findIndex(d => d.department === newDep.department);
      let updated;
      if (lastIndex === -1) {
        updated = [...localDeps, added as DepartmentConfig];
      } else {
        const actualIndex = localDeps.length - 1 - lastIndex;
        updated = [...localDeps];
        updated.splice(actualIndex + 1, 0, added as DepartmentConfig);
      }
      
      setLocalDeps(updated);
      onUpdate(updated);
      setNewDep({ department: '', section: '', color: '#e2e8f0' });
    } catch (e) {
      console.error('Failed to add department', e);
    }
  };

  const handleDuplicate = async (department: string) => {
    const existing = localDeps.find(d => d.department === department);
    const color = existing ? existing.color : '#e2e8f0';
    
    try {
      const added = await addDepartment({ department, section: '', color });
      
      // Find the last index of the same department to insert after it
      const lastIndex = [...localDeps].reverse().findIndex(d => d.department === department);
      const actualIndex = lastIndex === -1 ? localDeps.length - 1 : localDeps.length - 1 - lastIndex;
      
      const updated = [...localDeps];
      updated.splice(actualIndex + 1, 0, added as DepartmentConfig);
      
      setLocalDeps(updated);
      onUpdate(updated);
    } catch (e) {
      console.error('Failed to duplicate department', e);
    }
  };

  const handleLocalChange = (id: string, field: keyof DepartmentConfig, value: string) => {
    const depToUpdate = localDeps.find(d => d.id === id);
    if (!depToUpdate) return;
    
    let updatedDeps = localDeps.map(d => d.id === id ? { ...d, [field]: value } : d);
    
    // Synchronize department name for all entries of the same department
    if (field === 'department') {
      const oldDept = depToUpdate.department;
      updatedDeps = updatedDeps.map(d => d.department === oldDept ? { ...d, department: value } : d);
    }

    // Synchronize color for all entries of the same department
    if (field === 'color') {
      const department = depToUpdate.department;
      updatedDeps = updatedDeps.map(d => d.department === department ? { ...d, color: value } : d);
    }
    
    // If department name changes, inherit color from existing department if it exists
    if (field === 'department') {
      const existing = localDeps.find(d => d.department === value && d.id !== id);
      if (existing) {
        updatedDeps = updatedDeps.map(d => d.id === id ? { ...d, color: existing.color } : d);
      }
    }

    setLocalDeps(updatedDeps);
  };

  const handleBlur = async (id: string, field: keyof DepartmentConfig) => {
    const updatedDep = localDeps.find(d => d.id === id);
    const originalDep = departments.find(d => d.id === id);
    
    if (!updatedDep || !originalDep) return;
    
    // Only save if the value actually changed
    if (updatedDep[field] === originalDep[field]) return;

    try {
      if (field === 'color' || field === 'department') {
        const value = updatedDep[field];
        const affected = localDeps.filter(d => 
          field === 'color' ? d.department === updatedDep.department : d.department === value
        );
        
        const rowsToUpdate = field === 'department' 
          ? localDeps.filter(d => d.department === value) 
          : affected;

        await Promise.all(rowsToUpdate.map(d => 
          updateDepartment(d.id, d)
        ));
      } else {
        await updateDepartment(id, updatedDep);
      }
      
      onUpdate(localDeps);
    } catch (e) {
      console.error('Failed to update department', e);
    }
  };

  const isFirstOccurrence = (id: string, department: string) => {
    const first = localDeps.find(d => d.department === department);
    return first?.id === id;
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDepartment(id);
      const updated = localDeps.filter(d => d.id !== id);
      setLocalDeps(updated);
      onUpdate(updated);
    } catch (e) {
      console.error('Failed to delete department', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">處室組別設定</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-[1fr_1fr_100px_auto] gap-4 mb-4 font-medium text-gray-700">
            <div>處室</div>
            <div>組別</div>
            <div>底色</div>
            <div className="w-10"></div>
          </div>
          
          <div className="space-y-3">
            {localDeps.map(dep => (
              <div key={dep.id} className="grid grid-cols-[1fr_1fr_100px_auto] gap-4 items-center">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={dep.department}
                    onChange={(e) => handleLocalChange(dep.id, 'department', e.target.value)}
                    onBlur={() => handleBlur(dep.id, 'department')}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleDuplicate(dep.department)}
                    className="absolute right-2 p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="快速複製此處室"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <input
                  type="text"
                  value={dep.section}
                  onChange={(e) => handleLocalChange(dep.id, 'section', e.target.value)}
                  onBlur={() => handleBlur(dep.id, 'section')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {isFirstOccurrence(dep.id, dep.department) ? (
                  <input
                    type="color"
                    value={dep.color}
                    onChange={(e) => handleLocalChange(dep.id, 'color', e.target.value)}
                    onBlur={() => handleBlur(dep.id, 'color')}
                    className="w-full h-9 p-1 border border-gray-300 rounded-lg cursor-pointer"
                  />
                ) : (
                  <div 
                    className="w-full h-9 rounded-lg border border-gray-300" 
                    style={{ backgroundColor: dep.color }}
                  />
                )}
                <button
                  onClick={() => handleDelete(dep.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            
            <div className="grid grid-cols-[1fr_1fr_100px_auto] gap-4 items-center pt-4 border-t border-gray-100">
              <input
                type="text"
                placeholder="新增處室..."
                value={newDep.department}
                onChange={(e) => setNewDep({ ...newDep, department: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="新增組別..."
                value={newDep.section}
                onChange={(e) => setNewDep({ ...newDep, section: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                type="color"
                value={newDep.color}
                onChange={(e) => setNewDep({ ...newDep, color: e.target.value })}
                className="w-full h-9 p-1 border border-gray-300 rounded-lg cursor-pointer"
              />
              <button
                onClick={handleAdd}
                disabled={!newDep.department || !newDep.section}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
