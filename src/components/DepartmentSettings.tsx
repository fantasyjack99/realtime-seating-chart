import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { DepartmentConfig } from '../types';

interface DepartmentSettingsProps {
  onClose: () => void;
  departments: DepartmentConfig[];
  onUpdate: (deps: DepartmentConfig[]) => void;
}

export function DepartmentSettings({ onClose, departments, onUpdate }: DepartmentSettingsProps) {
  const [localDeps, setLocalDeps] = useState<DepartmentConfig[]>([]);
  const [newDep, setNewDep] = useState({ department: '', section: '', color: '#e2e8f0' });

  useEffect(() => {
    setLocalDeps(departments);
  }, [departments]);

  const handleAdd = async () => {
    if (!newDep.department || !newDep.section) return;
    
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDep)
      });
      const added = await res.json();
      const updated = [...localDeps, added];
      setLocalDeps(updated);
      onUpdate(updated);
      setNewDep({ department: '', section: '', color: '#e2e8f0' });
    } catch (e) {
      console.error('Failed to add department', e);
    }
  };

  const handleUpdate = async (id: number, field: keyof DepartmentConfig, value: string) => {
    const depToUpdate = localDeps.find(d => d.id === id);
    if (!depToUpdate) return;
    
    const updatedDep = { ...depToUpdate, [field]: value };
    
    try {
      await fetch(`/api/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDep)
      });
      
      const updated = localDeps.map(d => d.id === id ? updatedDep : d);
      setLocalDeps(updated);
      onUpdate(updated);
    } catch (e) {
      console.error('Failed to update department', e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/departments/${id}`, { method: 'DELETE' });
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
                <input
                  type="text"
                  value={dep.department}
                  onChange={(e) => handleUpdate(dep.id, 'department', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={dep.section}
                  onChange={(e) => handleUpdate(dep.id, 'section', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                  type="color"
                  value={dep.color}
                  onChange={(e) => handleUpdate(dep.id, 'color', e.target.value)}
                  className="w-full h-9 p-1 border border-gray-300 rounded-lg cursor-pointer"
                />
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
