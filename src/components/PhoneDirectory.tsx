import React, { useState, useEffect, useMemo } from 'react';
import { Seat, DepartmentConfig, TitleConfig } from '../types';
import { Plus, X, GripVertical } from 'lucide-react';
import { subscribeToPhoneDirectoryLayout, updatePhoneDirectoryLayout } from '../services/dataService';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface PhoneDirectoryProps {
  seats: Seat[];
  departments: DepartmentConfig[];
  titleConfigs: TitleConfig[];
  isEngineeringMode?: boolean;
}

interface LayoutModule {
  id: string;
  column_index: number;
  department: string;
  sort_order: number;
}

interface SortableModuleProps {
  module: LayoutModule;
  seats: Seat[];
  departments: DepartmentConfig[];
  titleConfigs: TitleConfig[];
  onRemove: (id: string) => void;
  isEngineeringMode?: boolean;
}

const SortableModule: React.FC<SortableModuleProps> = ({ module, seats, departments, titleConfigs, onRemove, isEngineeringMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  const deptName = module.department;
  const deptConfig = departments.find(d => d.department === deptName);
  const deptColor = deptConfig?.color || '#e5e7eb';

  const deptSeats = seats.filter(s => s.Department === deptName && s.Staff_Name);
  
  // Separate directors and sections
  const directors: Seat[] = [];
  const sectionsMap: Record<string, Seat[]> = {};
  
  deptSeats.forEach(seat => {
    if (seat.Title?.includes('處長')) {
      directors.push(seat);
    } else {
      const section = seat.Section || '';
      if (!sectionsMap[section]) sectionsMap[section] = [];
      sectionsMap[section].push(seat);
    }
  });

  const getWeight = (title?: string) => {
    const t = title?.trim() || '專員';
    const config = titleConfigs.find(c => c.title === t);
    return config ? config.weight : 99;
  };

  directors.sort((a, b) => getWeight(a.Title) - getWeight(b.Title));
  
  const sortedSections = Object.keys(sectionsMap).sort();
  sortedSections.forEach(sec => {
    sectionsMap[sec].sort((a, b) => getWeight(a.Title) - getWeight(b.Title));
  });

  const renderName = (seat: Seat) => {
    const t = seat.Title?.trim() || '專員';
    const config = titleConfigs.find(c => c.title === t);
    const showTitle = config?.showTitle || false;
    const isActing = seat.isActing || false;
    
    return (
      <div className="flex-1 py-0.5 px-2 border-r border-black truncate flex items-center justify-start text-xs" title={`${seat.Staff_Name} ${seat.Title || ''}`}>
        <span className="font-medium">{seat.Staff_Name}</span>
        {showTitle && <span className="ml-1">{t}</span>}
        {isActing && <span className="ml-0.5" style={{ fontSize: 'calc(100% - 2pt)' }}>代</span>}
      </div>
    );
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="mb-4 border border-black bg-white flex flex-col group relative"
    >
      {/* Drag Handle */}
      {isEngineeringMode && (
        <div 
          {...attributes} 
          {...listeners}
          className="absolute -left-6 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
        >
          <GripVertical size={20} />
        </div>
      )}

      {/* Remove button */}
      {isEngineeringMode && (
        <button
          onClick={() => onRemove(module.id)}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
          title="移除此處室"
        >
          <X size={12} />
        </button>
      )}

      {/* Department Header */}
      <div className="flex border-b border-black">
        <div 
          className="flex-1 py-1 px-2 font-bold text-center border-r border-black text-sm"
          style={{ backgroundColor: deptColor }}
        >
          {deptName}
        </div>
        <div 
          className="w-[60px] py-1 px-2 font-bold text-center text-sm"
          style={{ backgroundColor: deptColor }}
        >
          分機
        </div>
      </div>

      {/* Sections and Seats */}
      <div className="flex-1 flex flex-col">
        {/* Directors */}
        {directors.map((seat, idx) => (
          <div key={seat.Seat_ID} className={`flex ${idx < directors.length - 1 || sortedSections.length > 0 ? 'border-b border-black' : ''}`}>
            {renderName(seat)}
            <div className="w-[60px] py-0.5 px-2 text-center flex items-center justify-center text-xs">
              {seat.Extension}
            </div>
          </div>
        ))}

        {/* Sections */}
        {sortedSections.map((section, secIdx) => {
          const sectionSeats = sectionsMap[section];
          
          return (
            <React.Fragment key={section || 'no-section'}>
              {section && section !== deptName && (
                <div className="border-b border-black py-0.5 px-2 text-center font-medium bg-white text-xs">
                  {section}
                </div>
              )}
              
              {sectionSeats.map((seat, idx) => (
                <div key={seat.Seat_ID} className={`flex ${idx < sectionSeats.length - 1 || secIdx < sortedSections.length - 1 ? 'border-b border-black' : ''}`}>
                  {renderName(seat)}
                  <div className="w-[60px] py-0.5 px-2 text-center flex items-center justify-center text-xs">
                    {seat.Extension}
                  </div>
                </div>
              ))}
            </React.Fragment>
          );
        })}
        
        {deptSeats.length === 0 && (
          <div className="py-2 text-center text-gray-400 text-[10px] italic">
            尚無人員資料
          </div>
        )}
      </div>
    </div>
  );
};

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`bg-gray-50 border-2 border-dashed rounded-lg p-1.5 min-h-[700px] flex flex-col transition-colors ${isOver ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
    >
      {children}
    </div>
  );
};

export const PhoneDirectory: React.FC<PhoneDirectoryProps> = ({ seats, departments, titleConfigs, isEngineeringMode }) => {
  const [modules, setModules] = useState<LayoutModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const uniqueDepartments = useMemo(() => 
    Array.from(new Set(departments.map(d => d.department))).filter(Boolean).sort()
  , [departments]);

  useEffect(() => {
    const unsubscribe = subscribeToPhoneDirectoryLayout((data) => {
      // Sort by column_index and then sort_order
      const sorted = [...data].sort((a, b) => {
        if (a.column_index === b.column_index) {
          return a.sort_order - b.sort_order;
        }
        return a.column_index - b.column_index;
      });
      setModules(sorted);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddModule = async (columnIndex: number, department: string) => {
    try {
      const newModule = {
        id: Date.now().toString(), // Temporary ID until Firebase assigns one, or just let Firebase handle it by updating the whole layout
        column_index: columnIndex,
        department,
        sort_order: modules.filter(m => m.column_index === columnIndex).length
      };
      const updatedModules = [...modules, newModule];
      await updatePhoneDirectoryLayout(updatedModules);
    } catch (err) {
      console.error('Failed to add module:', err);
    }
  };

  const handleRemoveModule = async (id: string) => {
    try {
      const updatedModules = modules.filter(m => m.id !== id);
      await updatePhoneDirectoryLayout(updatedModules);
    } catch (err) {
      console.error('Failed to remove module:', err);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeModule = modules.find(m => m.id === activeId);
    if (!activeModule) return;

    // Is it over a module or a column?
    const overModule = modules.find(m => m.id === overId);
    const overColumnIndex = typeof overId === 'string' && overId.startsWith('col-') 
      ? parseInt(overId.replace('col-', ''), 10) 
      : overModule?.column_index;

    if (overColumnIndex !== undefined) {
      if (activeModule.column_index !== overColumnIndex) {
        setModules(prev => {
          const activeIndex = prev.findIndex(m => m.id === activeId);
          if (activeIndex === -1) return prev;

          const newModules = [...prev];
          newModules[activeIndex] = { ...activeModule, column_index: overColumnIndex };
          
          if (overModule) {
            const overIndex = prev.findIndex(m => m.id === overId);
            return arrayMove(newModules, activeIndex, overIndex);
          }
          
          return newModules;
        });
      } else if (overModule) {
        // Intra-column reordering for visual feedback
        setModules(prev => {
          const activeIndex = prev.findIndex(m => m.id === activeId);
          const overIndex = prev.findIndex(m => m.id === overId);
          if (activeIndex === -1 || overIndex === -1) return prev;
          return arrayMove(prev, activeIndex, overIndex);
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    saveReorder(modules);
  };

  const saveReorder = async (currentModules: LayoutModule[]) => {
    // Update sort_order based on current array position within each column
    const updatedModules = currentModules.map((m, index) => {
      // Find all modules in the same column and their relative order
      const columnModules = currentModules.filter(mod => mod.column_index === m.column_index);
      const sortOrder = columnModules.indexOf(m);
      return { ...m, sort_order: sortOrder };
    });

    try {
      await updatePhoneDirectoryLayout(updatedModules);
    } catch (err) {
      console.error('Failed to save reorder:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">載入中...</div>;
  }

  const columns = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="p-4 bg-white min-h-full overflow-x-auto">
      <h1 className="text-2xl font-bold text-center mb-6">文化內容策進院 電話表</h1>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2 min-w-max justify-start pb-8 px-2">
          {columns.map((colIndex) => {
            const columnModules = modules
              .filter(m => m.column_index === colIndex);

            return (
              <div 
                key={colIndex} 
                className="w-[180px] flex-shrink-0 flex flex-col gap-2"
              >
                {/* Column Drop Zone */}
                <DroppableColumn id={`col-${colIndex}`}>
                  <SortableContext
                    id={`col-${colIndex}`}
                    items={columnModules.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {columnModules.map((module) => (
                      <SortableModule
                        key={module.id}
                        module={module}
                        seats={seats}
                        departments={departments}
                        titleConfigs={titleConfigs}
                        onRemove={handleRemoveModule}
                        isEngineeringMode={isEngineeringMode}
                      />
                    ))}
                  </SortableContext>

                  {/* Add Module Button */}
                  {isEngineeringMode && (
                    <div className="mt-auto pt-4">
                      <div className="relative group">
                      <select
                        className="w-full appearance-none bg-white border border-gray-300 text-gray-600 py-1.5 px-3 pr-8 rounded text-xs leading-tight focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-center font-medium"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddModule(colIndex, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        value=""
                      >
                        <option value="" disabled>+ 新增處室</option>
                        {uniqueDepartments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                        <Plus size={14} />
                      </div>
                    </div>
                  </div>
                  )}
                </DroppableColumn>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="w-[180px] border border-black bg-white flex flex-col shadow-2xl opacity-90">
              {(() => {
                const module = modules.find(m => m.id === activeId);
                if (!module) return null;
                
                const deptName = module.department;
                const deptConfig = departments.find(d => d.department === deptName);
                const deptColor = deptConfig?.color || '#e5e7eb';
                const deptSeats = seats.filter(s => s.Department === deptName && s.Staff_Name);
                const sections = Array.from(new Set(deptSeats.map(s => s.Section || ''))).sort();

                return (
                  <>
                    <div className="flex border-b border-black">
                      <div className="flex-1 py-1 px-2 font-bold text-center border-r border-black text-sm" style={{ backgroundColor: deptColor }}>
                        {deptName}
                      </div>
                      <div className="w-[60px] py-1 px-2 font-bold text-center text-sm" style={{ backgroundColor: deptColor }}>
                        分機
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col">
                      {sections.slice(0, 3).map(section => (
                        <div key={section || 'no-section'} className="border-b border-black py-0.5 px-2 text-center font-medium bg-white text-xs">
                          {section || '...'}
                        </div>
                      ))}
                      {sections.length > 3 && <div className="py-1 text-center text-[10px]">...</div>}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
