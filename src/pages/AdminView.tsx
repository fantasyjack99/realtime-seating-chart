import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core';
import { Seat, DepartmentConfig } from '../types';
import { SeatCard } from '../components/SeatCard';
import { Lock, Unlock, Users, LogOut, ClipboardList, X, Settings } from 'lucide-react';
import { Floor5 } from '../components/Floor5';
import { Floor3 } from '../components/Floor3';
import { SouthCenter } from '../components/SouthCenter';
import { PhoneDirectory } from '../components/PhoneDirectory';
import { Login } from '../components/Login';
import { DepartmentSettings } from '../components/DepartmentSettings';
import { TitleSettings } from '../components/TitleSettings';
import { subscribeToSeats, subscribeToDepartments, updateSeat, swapSeats, updateSeatsBulk, subscribeToTitleConfigs } from '../services/firebaseService';
import { TitleConfig } from '../types';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

function DroppableFloorButton({ id, currentFloor, onClick, children }: { id: string, currentFloor: string, onClick: () => void, children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <button
      id={id}
      ref={setNodeRef}
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md font-medium text-sm transition-colors ${currentFloor === id.replace('floor-', '') ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'} ${isOver ? 'ring-2 ring-indigo-500' : ''}`}
    >
      {children}
    </button>
  );
}

interface PendingChange {
  originalSeat: Seat;
  newSeat: Seat;
  groupId?: string;
  relatedSeatId?: string;
}

export default function AdminView() {
  const [user, setUser] = useState<string | null>(localStorage.getItem('auth_user'));
  const [seats, setSeats] = useState<Seat[]>([]);
  const [departments, setDepartments] = useState<DepartmentConfig[]>([]);
  const [isHardwareUnlocked, setIsHardwareUnlocked] = useState(false);
  const [isEngineeringMode, setIsEngineeringMode] = useState(false);
  const [isDeptSettingsOpen, setIsDeptSettingsOpen] = useState(false);
  const [isTitleSettingsOpen, setIsTitleSettingsOpen] = useState(false);
  const [titleConfigs, setTitleConfigs] = useState<TitleConfig[]>([]);
  const [activeSeat, setActiveSeat] = useState<Seat | null>(null);
  const [currentFloor, setCurrentFloor] = useState<'3F' | '5F' | 'South' | 'PhoneDirectory'>('5F');

  const [passwordModal, setPasswordModal] = useState<{ type: 'hardware' | 'engineering', isOpen: boolean }>({ type: 'hardware', isOpen: false });
  const [editModal, setEditModal] = useState<{ seat: Seat | null, type: 'hardware' | 'engineering' }>({ seat: null, type: 'hardware' });
  const [editDept, setEditDept] = useState<string>('');
  const [editSection, setEditSection] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [dragConfirmModal, setDragConfirmModal] = useState<{ seatA: Seat, seatB: Seat } | null>(null);
  const [dragExtAction, setDragExtAction] = useState<'keep' | 'update'>('keep');
  const [dragDeptAction, setDragDeptAction] = useState<'keep' | 'update'>('keep');
  const [dragDept, setDragDept] = useState<string>('');
  const [dragSection, setDragSection] = useState<string>('');
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [arrowCoords, setArrowCoords] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    const unsubscribeSeats = subscribeToSeats((data) => {
      setSeats(data);
    });

    const unsubscribeDepartments = subscribeToDepartments((data) => {
      setDepartments(data);
    });

    const unsubscribeTitleConfigs = subscribeToTitleConfigs((data) => {
      setTitleConfigs(data);
    });

    return () => {
      unsubscribeSeats();
      unsubscribeDepartments();
      unsubscribeTitleConfigs();
    };
  }, []);

  const updateArrowCoords = useCallback(() => {
    if (hoveredSeatId) {
      const change = pendingChanges.find(p => p.originalSeat.Seat_ID === hoveredSeatId);
      if (change && change.relatedSeatId) {
        // Determine source and destination based on whether the new seat is being cleared ('待補入')
        const isSource = change.newSeat.Staff_Name === '待補入';
        const sourceId = isSource ? hoveredSeatId : change.relatedSeatId;
        const destId = isSource ? change.relatedSeatId : hoveredSeatId;

        const elSource = document.getElementById(`seat-${sourceId}`);
        const elDest = document.getElementById(`seat-${destId}`);
        
        const container = document.getElementById('seat-map-container');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          
          let rectSource = elSource?.getBoundingClientRect();
          let rectDest = elDest?.getBoundingClientRect();

          // Map floor buttons for arrows when seats are on different floors
          const getFloorBtnId = (floor: string) => `floor-${floor}`;
          
          if (!elSource) {
            // Find which floor the source seat belongs to
            // For simplicity, we assume if it's not on current floor, it's on one of the others
            // In a more robust app, we'd have a mapping of seatId -> floor
            const otherFloors = ['3F', '5F', 'South'].filter(f => f !== currentFloor);
            for (const f of otherFloors) {
              const btn = document.getElementById(getFloorBtnId(f));
              if (btn) {
                rectSource = btn.getBoundingClientRect();
                break;
              }
            }
          }

          if (!elDest) {
            const otherFloors = ['3F', '5F', 'South'].filter(f => f !== currentFloor);
            for (const f of otherFloors) {
              const btn = document.getElementById(getFloorBtnId(f));
              if (btn) {
                rectDest = btn.getBoundingClientRect();
                break;
              }
            }
          }

          if (rectSource && rectDest) {
            setArrowCoords({
              x1: rectSource.left - containerRect.left + rectSource.width / 2,
              y1: rectSource.top - containerRect.top + rectSource.height / 2,
              x2: rectDest.left - containerRect.left + rectDest.width / 2,
              y2: rectDest.top - containerRect.top + rectDest.height / 2,
            });
            return;
          }
        }
      }
    }
    setArrowCoords(null);
  }, [hoveredSeatId, pendingChanges, currentFloor]);

  useEffect(() => {
    updateArrowCoords();
  }, [updateArrowCoords]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateArrowCoords);
      return () => container.removeEventListener('scroll', updateArrowCoords);
    }
  }, [updateArrowCoords]);

  const getSeat = (id: string, defaultName = '待補入', dept = '') => {
    let seat = seats.find(s => s.Seat_ID === id);
    
    if (!seat) {
      seat = {
        Seat_ID: id,
        Staff_Name: defaultName,
        Extension: '',
        Port_ID: '',
        Network_Jack: '',
        Department: dept,
        Is_Static: 0
      };
    } else if (!seat.Department && dept) {
      // If seat exists but has no department, use the default one passed from the floor layout
      seat = { ...seat, Department: dept, isDefaultDept: true };
    }
    
    const pendingChange = pendingChanges.find(p => p.originalSeat.Seat_ID === id);
    if (pendingChange) {
      seat = { ...seat, pendingNewSeat: pendingChange.newSeat, hasPendingChange: true };
    } else {
      seat = { ...seat, hasPendingChange: false };
    }
    
    return seat;
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const seat = seats.find(s => s.Seat_ID === active.id);
    if (seat) setActiveSeat(seat);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && activeSeat) {
      const isSouthPerson = activeSeat.Department === '南部營運中心';
      
      if (over.id === 'floor-3F') {
        if (isSouthPerson) return; // South person cannot go to 3F
        setCurrentFloor(prev => prev !== '3F' ? '3F' : prev);
      } else if (over.id === 'floor-5F') {
        if (isSouthPerson) return; // South person cannot go to 5F
        setCurrentFloor(prev => prev !== '5F' ? '5F' : prev);
      } else if (over.id === 'floor-South') {
        if (!isSouthPerson) return; // Non-South person cannot go to South
        setCurrentFloor(prev => prev !== 'South' ? 'South' : prev);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSeat(null);

    if (over && active.id !== over.id) {
      if (over.id === 'floor-3F' || over.id === 'floor-5F' || over.id === 'floor-South') {
        return;
      }

      const hasPendingA = pendingChanges.some(p => p.originalSeat.Seat_ID === active.id);
      const hasPendingB = pendingChanges.some(p => p.originalSeat.Seat_ID === over.id);
      
      if (hasPendingA || hasPendingB) {
        alert('請先確認或取消目前的暫存變更，再進行新的座位搬遷。');
        return;
      }

      const seatA = getSeat(active.id as string);
      const seatB = getSeat(over.id as string);

      // Restriction: South floor cannot drag to/from other floors
      const isSouthA = seatA.Department === '南部營運中心';
      const isSouthB = seatB.Department === '南部營運中心';
      
      if (isSouthA !== isSouthB) {
        alert('「南部營運中心」不支援跨樓層座位移轉。');
        return;
      }

      if (seatA && seatB && seatB.Is_Static === 0) {
        setDragConfirmModal({ seatA, seatB });
        setDragDeptAction('keep');
        setDragDept(seatA.Department || '');
        setDragSection(seatA.Section || '');
      }
    }
  };

  const handleDragConfirm = () => {
    if (!dragConfirmModal) return;
    const { seatA, seatB } = dragConfirmModal;
    
    let newExt = seatA.Extension;
    if (dragExtAction === 'update') {
      const input = document.getElementById('drag-new-ext') as HTMLInputElement;
      newExt = input ? input.value : '';
      
      if (newExt && newExt !== seatA.Extension?.trim()) {
        const duplicateExt = seats.find(s => s.Seat_ID !== seatA.Seat_ID && s.Seat_ID !== seatB.Seat_ID && s.Extension?.trim() === newExt);
        if (duplicateExt) {
          alert(`分機號碼 ${newExt} 已被 ${duplicateExt.Staff_Name || '其他座位'} (${duplicateExt.Seat_ID}) 使用，請重新輸入`);
          return;
        }
      }
    }

    const groupId = Date.now().toString();

    const changeA: PendingChange = {
      originalSeat: seatA,
      newSeat: {
        ...seatA,
        Staff_Name: '待補入',
        Extension: '',
        Title: '',
        Department: '',
        Section: '',
        isActing: false
      },
      groupId,
      relatedSeatId: seatB.Seat_ID
    };

    const changeB: PendingChange = {
      originalSeat: seatB,
      newSeat: {
        ...seatB,
        Staff_Name: seatA.Staff_Name,
        Extension: newExt,
        Title: seatA.Title,
        Department: dragDeptAction === 'update' ? dragDept : (seatA.Department || ''),
        Section: dragDeptAction === 'update' ? dragSection : (seatA.Section || ''),
        isActing: seatA.isActing || false
      },
      groupId,
      relatedSeatId: seatA.Seat_ID
    };

    setPendingChanges(prev => {
      const groupsToRemove = new Set<string>();
      prev.forEach(p => {
        if (p.originalSeat.Seat_ID === seatA.Seat_ID || p.originalSeat.Seat_ID === seatB.Seat_ID) {
          if (p.groupId) groupsToRemove.add(p.groupId);
        }
      });
      
      const filtered = prev.filter(p => 
        p.originalSeat.Seat_ID !== seatA.Seat_ID && 
        p.originalSeat.Seat_ID !== seatB.Seat_ID &&
        (!p.groupId || !groupsToRemove.has(p.groupId))
      );
      return [...filtered, changeA, changeB];
    });

    setDragConfirmModal(null);
    setDragExtAction('keep');
  };

  const handleUpdateSeat = (updatedSeat: Seat, ignoreDuplicateCheck = false): string | true => {
    const originalSeat = seats.find(s => s.Seat_ID === updatedSeat.Seat_ID);

    // Check for duplicates only if the value changed
    const ext = updatedSeat.Extension?.trim();
    if (!ignoreDuplicateCheck && ext && originalSeat && ext !== originalSeat.Extension?.trim()) {
      const duplicateExt = seats.find(s => s.Seat_ID !== updatedSeat.Seat_ID && s.Extension?.trim() === ext);
      if (duplicateExt) {
        return `分機號碼 ${ext} 已被 ${duplicateExt.Staff_Name || '其他座位'} (${duplicateExt.Seat_ID}) 使用，請重新輸入`;
      }
    }
    
    const port = updatedSeat.Port_ID?.trim();
    if (!ignoreDuplicateCheck && port && originalSeat && port !== originalSeat.Port_ID?.trim()) {
      const duplicatePort = seats.find(s => s.Seat_ID !== updatedSeat.Seat_ID && s.Port_ID?.trim() === port);
      if (duplicatePort) {
        return `Port 號碼 ${port} 已被 ${duplicatePort.Staff_Name || '其他座位'} (${duplicatePort.Seat_ID}) 使用，請重新輸入`;
      }
    }
    
    const jack = updatedSeat.Network_Jack?.trim();
    if (!ignoreDuplicateCheck && jack && originalSeat && jack !== originalSeat.Network_Jack?.trim()) {
      const duplicateJack = seats.find(s => s.Seat_ID !== updatedSeat.Seat_ID && s.Network_Jack?.trim() === jack);
      if (duplicateJack) {
        return `線號 ${jack} 已被 ${duplicateJack.Staff_Name || '其他座位'} (${duplicateJack.Seat_ID}) 使用，請重新輸入`;
      }
    }

    updateSeat({
      ...updatedSeat,
      Extension: ext || '',
      Port_ID: port || '',
      Network_Jack: jack || ''
    }).catch(err => console.error('Failed to update seat', err));
    return true;
  };

  const toggleHardwareLock = () => {
    if (!isHardwareUnlocked) {
      setIsHardwareUnlocked(true);
    } else {
      setIsHardwareUnlocked(false);
    }
  };

  const toggleEngineeringMode = () => {
    if (!isEngineeringMode) {
      setPasswordModal({ type: 'engineering', isOpen: true });
    } else {
      setIsEngineeringMode(false);
    }
  };

  const handlePasswordSubmit = (pwd: string) => {
    if (passwordModal.type === 'engineering') {
      if (pwd === '0000') {
        setIsEngineeringMode(true);
        setPasswordModal({ ...passwordModal, isOpen: false });
      } else {
        alert('密碼錯誤');
      }
    }
  };

  const handleEditClick = (seat: Seat, type: 'hardware' | 'engineering') => {
    setEditError(null);
    setEditModal({ seat, type });
    setEditDept(seat.isDefaultDept ? '' : (seat.Department || ''));
    setEditSection(seat.Section || '');
  };

  const handleSaveEdit = () => {
    if (!editModal.seat) return;
    
    if (editModal.type === 'hardware') {
      const name = (document.getElementById('edit-name') as HTMLInputElement).value;
      const titleInput = document.getElementById('edit-title') as HTMLInputElement;
      const title = titleInput ? titleInput.value : (editModal.seat.Title || '');
      const ext = (document.getElementById('edit-ext') as HTMLInputElement).value;
      const isActingInput = document.getElementById('edit-acting') as HTMLInputElement;
      const isActing = isActingInput ? isActingInput.checked : false;
      
      const newSeatData = { ...editModal.seat, Staff_Name: name || '待補入', Title: title, Extension: ext, Department: editDept, Section: editSection, isActing };
      
      // Check for duplicates before saving to pending
      if (ext && ext !== editModal.seat.Extension?.trim()) {
        const duplicateExt = seats.find(s => s.Seat_ID !== newSeatData.Seat_ID && s.Extension?.trim() === ext);
        if (duplicateExt) {
          setEditError(`分機號碼 ${ext} 已被 ${duplicateExt.Staff_Name || '其他座位'} (${duplicateExt.Seat_ID}) 使用，請重新輸入`);
          return;
        }
      }

      const newChange: PendingChange = {
        originalSeat: editModal.seat,
        newSeat: newSeatData
      };

      setPendingChanges(prev => {
        const groupsToRemove = new Set<string>();
        prev.forEach(p => {
          if (p.originalSeat.Seat_ID === editModal.seat!.Seat_ID && p.groupId) {
            groupsToRemove.add(p.groupId);
          }
        });

        const filtered = prev.filter(p => 
          p.originalSeat.Seat_ID !== editModal.seat!.Seat_ID &&
          (!p.groupId || !groupsToRemove.has(p.groupId))
        );
        
        return [...filtered, newChange];
      });
      
      setEditError(null);
      setEditModal({ seat: null, type: 'hardware' });
    } else {
      const port = (document.getElementById('edit-port') as HTMLInputElement).value;
      const jack = (document.getElementById('edit-jack') as HTMLInputElement).value;
      const result = handleUpdateSeat({ ...editModal.seat, Port_ID: port, Network_Jack: jack });
      
      if (result === true) {
        setEditError(null);
        setEditModal({ seat: null, type: 'hardware' });
      } else {
        alert(result as string);
        setEditError(result as string);
      }
    }
  };

  const handleConfirmChange = (change: PendingChange) => {
    if (change.groupId) {
      const relatedChanges = pendingChanges.filter(p => p.groupId === change.groupId);
      relatedChanges.forEach(c => handleUpdateSeat(c.newSeat, true));
      setPendingChanges(prev => prev.filter(p => p.groupId !== change.groupId));
    } else {
      handleUpdateSeat(change.newSeat, true);
      setPendingChanges(prev => prev.filter(p => p.originalSeat.Seat_ID !== change.originalSeat.Seat_ID));
    }
  };

  const handleCancelChange = (change: PendingChange) => {
    if (change.groupId) {
      setPendingChanges(prev => prev.filter(p => p.groupId !== change.groupId));
    } else {
      setPendingChanges(prev => prev.filter(p => p.originalSeat.Seat_ID !== change.originalSeat.Seat_ID));
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return;
      handleSaveEdit();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.cursor-grab') || target.closest('.cursor-pointer')) {
      return;
    }
    setIsPanning(true);
    setStartPanPos({ x: e.pageX, y: e.pageY });
    if (scrollContainerRef.current) {
      setScrollPos({
        left: scrollContainerRef.current.scrollLeft,
        top: scrollContainerRef.current.scrollTop
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !scrollContainerRef.current) return;
    e.preventDefault();
    const dx = e.pageX - startPanPos.x;
    const dy = e.pageY - startPanPos.y;
    scrollContainerRef.current.scrollLeft = scrollPos.left - dx;
    scrollContainerRef.current.scrollTop = scrollPos.top - dy;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleLogin = (email: string) => {
    setUser(email);
    localStorage.setItem('auth_user', email);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div 
        ref={scrollContainerRef}
        className={`min-h-screen bg-white text-black font-sans overflow-auto hide-scrollbar ${isPanning ? 'cursor-grabbing select-none' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
      {/* Password Modal */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
          <div className="bg-white p-6 rounded-lg shadow-xl w-80">
            <h2 className="text-lg font-bold mb-4">
              {passwordModal.type === 'engineering' ? '工程設置模式' : ''}
            </h2>
            <input
              type="password"
              autoFocus
              placeholder="請輸入密碼"
              className="w-full border border-gray-300 rounded p-2 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePasswordSubmit(e.currentTarget.value);
                }
              }}
              id="password-input"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setPasswordModal({ ...passwordModal, isOpen: false })}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  const val = (document.getElementById('password-input') as HTMLInputElement).value;
                  handlePasswordSubmit(val);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Settings Modal */}
      {isDeptSettingsOpen && (
        <DepartmentSettings
          departments={departments}
          onUpdate={setDepartments}
          onClose={() => setIsDeptSettingsOpen(false)}
        />
      )}

      {/* Title Settings Modal */}
      {isTitleSettingsOpen && (
        <TitleSettings
          seats={seats}
          titleConfigs={titleConfigs}
          onClose={() => setIsTitleSettingsOpen(false)}
        />
      )}

      {/* Edit Modal */}
      {editModal.seat && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
          <div className="bg-white p-6 rounded-lg shadow-xl w-80">
            <h2 className="text-lg font-bold mb-4">
              {editModal.type === 'hardware' ? '變更分機資訊' : '變更工程設置'}
            </h2>
            
            {editError && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 text-sm rounded border border-red-200">
                {editError}
              </div>
            )}
            
            {editModal.type === 'hardware' ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">人員姓名</label>
                  <input
                    type="text"
                    id="edit-name"
                    autoComplete="off"
                    defaultValue={editModal.seat.Staff_Name === '待補入' ? '' : editModal.seat.Staff_Name}
                    className="w-full border border-gray-300 rounded p-2"
                    onKeyDown={handleEditKeyDown}
                  />
                </div>
                {!editModal.seat.Staff_Name.includes('會議室') && !editModal.seat.Staff_Name.includes('討論室') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">職稱</label>
                    <input
                      type="text"
                      id="edit-title"
                      autoComplete="off"
                      defaultValue={editModal.seat.Title || ''}
                      className="w-full border border-gray-300 rounded p-2"
                      onKeyDown={handleEditKeyDown}
                    />
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">處室</label>
                  <select
                    value={editDept}
                    onChange={(e) => {
                      setEditDept(e.target.value);
                      setEditSection(''); // Reset section when department changes
                    }}
                    className="w-full border border-gray-300 rounded p-2"
                  >
                    <option value="">請選擇處室</option>
                    {Array.from(new Set(departments.map(d => d.department))).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">組別</label>
                  <select
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2"
                    disabled={!editDept}
                  >
                    <option value="">請選擇組別</option>
                    {departments
                      .filter(d => d.department === editDept)
                      .map(d => (
                        <option key={d.section} value={d.section}>{d.section}</option>
                      ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">分機號碼</label>
                  <input
                    type="text"
                    id="edit-ext"
                    autoComplete="off"
                    defaultValue={editModal.seat.Extension}
                    className="w-full border border-gray-300 rounded p-2"
                    onKeyDown={handleEditKeyDown}
                  />
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-acting"
                    defaultChecked={editModal.seat.isActing}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <label htmlFor="edit-acting" className="text-sm font-medium text-gray-700">代理</label>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port 號碼</label>
                  <input
                    type="text"
                    id="edit-port"
                    autoComplete="off"
                    defaultValue={editModal.seat.Port_ID}
                    className="w-full border border-gray-300 rounded p-2"
                    onKeyDown={handleEditKeyDown}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">線號</label>
                  <input
                    type="text"
                    id="edit-jack"
                    autoComplete="off"
                    defaultValue={editModal.seat.Network_Jack}
                    className="w-full border border-gray-300 rounded p-2"
                    onKeyDown={handleEditKeyDown}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setEditError(null);
                  setEditModal({ seat: null, type: 'hardware' });
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                取消
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editModal.type === 'hardware' ? '暫存' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 bg-white z-50 flex justify-between items-center p-4 border-b border-gray-300 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">文策院分機座位圖</h1>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">v1.2.0</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">視覺化互動與硬體資產管理系統</p>
          </div>
          
            <div className="flex items-center gap-2 ml-8 bg-gray-100 p-1 rounded-lg">
              <DroppableFloorButton
                id="floor-3F"
                currentFloor={currentFloor}
                onClick={() => setCurrentFloor('3F')}
              >
                3樓
              </DroppableFloorButton>
              <DroppableFloorButton
                id="floor-5F"
                currentFloor={currentFloor}
                onClick={() => setCurrentFloor('5F')}
              >
                5樓
              </DroppableFloorButton>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <DroppableFloorButton
                id="floor-South"
                currentFloor={currentFloor}
                onClick={() => setCurrentFloor('South')}
              >
                南部營運中心
              </DroppableFloorButton>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button
                onClick={() => setCurrentFloor('PhoneDirectory')}
                className={`px-4 py-1.5 rounded-md font-medium text-sm transition-colors ${currentFloor === 'PhoneDirectory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                電話總表
              </button>
            </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleHardwareLock}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors shadow-sm text-sm ${
              isHardwareUnlocked 
                ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isHardwareUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
            {isHardwareUnlocked ? '分機變更已解鎖' : '解鎖分機變更'}
          </button>
          
          <button
            onClick={() => setIsPendingModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors relative text-sm font-medium shadow-sm"
          >
            <ClipboardList size={16} />
            <span>暫存變更確認</span>
            {pendingChanges.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {pendingChanges.length}
              </span>
            )}
          </button>

          <button
            onClick={toggleEngineeringMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors shadow-sm text-sm ${
              isEngineeringMode 
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isEngineeringMode ? <Unlock size={16} /> : <Lock size={16} />}
            {isEngineeringMode ? '工程設置已解鎖' : '工程設置模式'}
          </button>
          
          <button
            onClick={() => setIsDeptSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors shadow-sm text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Settings size={16} />
            處室組別設定
          </button>
          
          <button
            onClick={() => setIsTitleSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors shadow-sm text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Settings size={16} />
            職稱權重設定
          </button>
          
          <div className="h-8 w-px bg-gray-200 mx-2" />
          
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 transition-colors text-sm"
          >
            返回公開前台
          </Link>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all text-sm"
            title="登出系統"
          >
            <LogOut size={16} />
            <span>登出</span>
          </button>
        </div>
      </header>

      <main className="pt-24 p-4 min-w-[1920px] min-h-[1080px] relative">
        {/* Drag Confirm Modal */}
        {dragConfirmModal && (
          <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">座位移動確認</h3>
              <p className="text-gray-600 mb-6">
                確定要將 <strong>{dragConfirmModal.seatA.Staff_Name}</strong> 從 <span className="text-blue-600 font-medium">{dragConfirmModal.seatA.Seat_ID}</span> 移動到 <span className="text-blue-600 font-medium">{dragConfirmModal.seatB.Seat_ID}</span> 嗎？
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">分機號碼處理方式</label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input 
                      type="radio" 
                      name="ext-action" 
                      value="keep" 
                      checked={dragExtAction === 'keep'} 
                      onChange={() => setDragExtAction('keep')} 
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">延用原分機 <span className="text-gray-500 font-mono">({dragConfirmModal.seatA.Extension || '無'})</span></span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input 
                      type="radio" 
                      name="ext-action" 
                      value="update" 
                      checked={dragExtAction === 'update'} 
                      onChange={() => setDragExtAction('update')} 
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">更新分機號碼</span>
                  </label>
                </div>
              </div>

              {dragExtAction === 'update' && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">新分機號碼</label>
                  <input 
                    type="text" 
                    id="drag-new-ext" 
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                    placeholder="請輸入新的分機號碼"
                    autoFocus
                  />
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">處室組別處理方式</label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input 
                      type="radio" 
                      name="dept-action" 
                      value="keep" 
                      checked={dragDeptAction === 'keep'} 
                      onChange={() => setDragDeptAction('keep')} 
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">延用原處室組別 <span className="text-gray-500 font-mono">({dragConfirmModal.seatA.Department || '無'}{dragConfirmModal.seatA.Section ? ` - ${dragConfirmModal.seatA.Section}` : ''})</span></span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input 
                      type="radio" 
                      name="dept-action" 
                      value="update" 
                      checked={dragDeptAction === 'update'} 
                      onChange={() => setDragDeptAction('update')} 
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">更新處室組別</span>
                  </label>
                </div>
              </div>

              {dragDeptAction === 'update' && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-2 flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">新處室</label>
                    <select
                      value={dragDept}
                      onChange={(e) => {
                        setDragDept(e.target.value);
                        setDragSection('');
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="">請選擇處室</option>
                      {Array.from(new Set(departments.map(d => d.department))).map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">新組別</label>
                    <select
                      value={dragSection}
                      onChange={(e) => setDragSection(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      disabled={!dragDept}
                    >
                      <option value="">請選擇組別</option>
                      {departments
                        .filter(d => d.department === dragDept)
                        .map(d => (
                          <option key={d.section} value={d.section}>{d.section}</option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8">
                <button 
                  onClick={() => {
                    setDragConfirmModal(null);
                    setDragExtAction('keep');
                  }} 
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  取消
                </button>
                <button 
                  onClick={handleDragConfirm} 
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  確認移動
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Changes Modal */}
        {isPendingModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">分機異動暫存單</h2>
                <button onClick={() => setIsPendingModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {pendingChanges.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">目前沒有暫存的變更</p>
                ) : (
                  <div className="space-y-4">
                    {Object.values(
                      pendingChanges.reduce((acc, change) => {
                        if (change.groupId) {
                          if (!acc[change.groupId]) acc[change.groupId] = [];
                          acc[change.groupId].push(change);
                        } else {
                          acc[change.originalSeat.Seat_ID] = [change];
                        }
                        return acc;
                      }, {} as Record<string, PendingChange[]>)
                    ).map((group) => (
                      <div key={group[0].groupId || group[0].originalSeat.Seat_ID} className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col gap-4">
                        {group.length > 1 && (
                          <div className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md self-start border border-blue-100">
                            【關聯異動 - 座位搬遷】
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex-1 flex flex-col gap-4">
                            {group.map(change => (
                              <div key={change.originalSeat.Seat_ID} className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                                <div>
                                  <span className="text-sm text-gray-500 block mb-1">Port號 <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 ml-1">{change.originalSeat.Seat_ID}</span></span>
                                  <span className="font-medium text-gray-800">{change.originalSeat.Port_ID || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-sm text-gray-500 block mb-1">刪除 (舊資料)</span>
                                  <div className="text-gray-500 text-sm">
                                    {change.originalSeat.Staff_Name} / {change.originalSeat.Extension || '無'}
                                    {(change.originalSeat.Department || change.originalSeat.Section) && (
                                      <div className="text-xs mt-0.5">
                                        {change.originalSeat.Department || ''} {change.originalSeat.Section ? `- ${change.originalSeat.Section}` : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-sm text-gray-500 block mb-1">變更 (新資料)</span>
                                  <div className="text-blue-600 font-medium text-sm">
                                    {change.newSeat.Staff_Name} / {change.newSeat.Extension || '無'}
                                    {(change.newSeat.Department || change.newSeat.Section) && (
                                      <div className="text-xs mt-0.5">
                                        {change.newSeat.Department || ''} {change.newSeat.Section ? `- ${change.newSeat.Section}` : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col gap-2 ml-6 pl-6 border-l border-gray-200">
                            <button
                              onClick={() => handleConfirmChange(group[0])}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium w-full"
                            >
                              確認
                            </button>
                            <button
                              onClick={() => handleCancelChange(group[0])}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium w-full"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div id="seat-map-container" className={`relative bg-white ${currentFloor === 'PhoneDirectory' ? 'w-full min-h-[900px]' : 'w-[1800px] h-[900px]'}`}>
          {arrowCoords && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[100]" style={{ overflow: 'visible' }}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="rgba(239, 68, 68, 0.5)" />
                </marker>
              </defs>
              <line 
                x1={arrowCoords.x1} 
                y1={arrowCoords.y1} 
                x2={arrowCoords.x2} 
                y2={arrowCoords.y2} 
                stroke="rgba(239, 68, 68, 0.5)" 
                strokeWidth="3" 
                strokeDasharray="8,8" 
                markerEnd="url(#arrowhead)" 
              />
            </svg>
          )}
          {currentFloor === '5F' && (
            <Floor5 
              seats={seats} 
              departments={departments}
              isHardwareUnlocked={isHardwareUnlocked} 
              isEngineeringMode={isEngineeringMode}
              onUpdateSeat={handleUpdateSeat} 
              getSeat={getSeat} 
              onEditClick={handleEditClick}
              onMouseEnter={setHoveredSeatId}
              onMouseLeave={() => setHoveredSeatId(null)}
            />
          )}
          {currentFloor === '3F' && (
            <Floor3 
              seats={seats} 
              departments={departments}
              isHardwareUnlocked={isHardwareUnlocked} 
              isEngineeringMode={isEngineeringMode}
              onUpdateSeat={handleUpdateSeat} 
              getSeat={getSeat} 
              onEditClick={handleEditClick}
              onMouseEnter={setHoveredSeatId}
              onMouseLeave={() => setHoveredSeatId(null)}
            />
          )}
          {currentFloor === 'South' && (
            <SouthCenter
              seats={seats} 
              departments={departments}
              isHardwareUnlocked={isHardwareUnlocked} 
              isEngineeringMode={isEngineeringMode}
              onUpdateSeat={handleUpdateSeat} 
              getSeat={getSeat} 
              onEditClick={handleEditClick}
              onMouseEnter={setHoveredSeatId}
              onMouseLeave={() => setHoveredSeatId(null)}
            />
          )}
          {currentFloor === 'PhoneDirectory' && (
            <PhoneDirectory
              seats={seats}
              departments={departments}
              titleConfigs={titleConfigs}
              isEngineeringMode={isEngineeringMode}
            />
          )}
        </div>

        <DragOverlay>
          {activeSeat ? (
            <div className="opacity-90 scale-105 shadow-2xl w-[56px] h-[48px]">
              <SeatCard 
                seat={activeSeat} 
                departments={departments}
                isHardwareUnlocked={isHardwareUnlocked}
                isEngineeringMode={isEngineeringMode}
                onUpdate={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </main>
    </div>
    </DndContext>
  );
}
