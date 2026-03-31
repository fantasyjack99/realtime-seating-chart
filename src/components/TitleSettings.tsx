import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Seat, TitleConfig } from '../types';
import { updateTitleConfig } from '../services/dataService';

interface TitleSettingsProps {
  onClose: () => void;
  seats: Seat[];
  titleConfigs: TitleConfig[];
}

export function TitleSettings({ onClose, seats, titleConfigs }: TitleSettingsProps) {
  const [configs, setConfigs] = useState<TitleConfig[]>([]);

  useEffect(() => {
    const uniqueTitles = Array.from(new Set(seats.map(s => s.Title?.trim() || '專員'))).filter(Boolean);
    
    const merged = uniqueTitles.map(title => {
      const existing = titleConfigs.find(c => c.title === title);
      return existing || { id: title, title, weight: 99, showTitle: false };
    });
    
    // Sort by weight then title
    merged.sort((a, b) => {
      if (a.weight !== b.weight) return a.weight - b.weight;
      return a.title.localeCompare(b.title);
    });
    
    setConfigs(merged);
  }, [seats, titleConfigs]);

  const handleChange = (index: number, field: keyof TitleConfig, value: any) => {
    const newConfigs = [...configs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setConfigs(newConfigs);
  };

  const handleSave = async (config: TitleConfig) => {
    try {
      await updateTitleConfig(config);
    } catch (e) {
      console.error('Failed to save title config', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">職稱權重設定</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left border">職稱</th>
                <th className="p-2 text-center border w-24">權重值</th>
                <th className="p-2 text-center border w-24">顯示職稱</th>
                <th className="p-2 text-center border w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config, idx) => (
                <tr key={config.title} className="hover:bg-gray-50">
                  <td className="p-2 border">{config.title}</td>
                  <td className="p-2 border text-center">
                    <input 
                      type="number" 
                      value={config.weight}
                      onChange={(e) => handleChange(idx, 'weight', parseInt(e.target.value) || 0)}
                      className="w-16 p-1 border rounded text-center"
                    />
                  </td>
                  <td className="p-2 border text-center">
                    <input 
                      type="checkbox" 
                      checked={config.showTitle}
                      onChange={(e) => handleChange(idx, 'showTitle', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="p-2 border text-center">
                    <button 
                      onClick={() => handleSave(config)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="儲存"
                    >
                      <Save size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-4">
            * 權重值越小，在電話總表排序越前面。<br/>
            * 預設職稱為「專員」。<br/>
            * 處長層級會固定顯示在處室下方第一列。
          </p>
        </div>
      </div>
    </div>
  );
}
