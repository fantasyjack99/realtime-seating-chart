import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { DndContext, DragEndEvent, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Seat } from './types';
import { SeatCard } from './components/SeatCard';
import { Lock, Unlock, Users, LogOut } from 'lucide-react';
import { Floor5 } from './components/Floor5';
import { Floor3 } from './components/Floor3';
import { Login } from './components/Login';

const socket = (window as any).__socket || io();
(window as any).__socket = socket;

export default function App() {
  const [user, setUser] = useState<string | null>(localStorage.getItem('auth_user'));
  const [seats, setSeats] = useState<Seat[]>([]);
  const [isHardwareUnlocked, setIsHardwareUnlocked] = useState(false);
  const [isEngineeringMode, setIsEngineeringMode] = useState(false);
  const [activeSeat, setActiveSeat] = useState<Seat | null>(null);
  const [currentFloor, setCurrentFloor] = useState<'3F' | '5F'>('5F');

  const [passwordModal, setPasswordModal] = useState<{ type: 'hardware' | 'engineering', isOpen: boolean }>({ type: 'hardware', isOpen: false });
  const [editModal, setEditModal] = useState<{ seat: Seat | null, type: 'hardware' | 'engineering' }>({ seat: null, type: 'hardware' });
  const [editError, setEditError] = useState<string | null>(null);

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
    fetch('/api/seats')
      .then(res => res.json())
      .then(data => setSeats(data));

    socket.on('seat_updated', (updatedSeat: Seat) => {
      setSeats(prev => {
        const exists = prev.some(s => s.Seat_ID === updatedSeat.Seat_ID);
        if (exists) {
          return prev.map(s => s.Seat_ID === updatedSeat.Seat_ID ? updatedSeat : s);
        } else {
          return [...prev, updatedSeat];
        }
      });
    });

    socket.on('seats_swapped', ({ seatA, seatB }: { seatA: Seat, seatB: Seat }) => {
      setSeats(prev => {
        let newSeats = [...prev];
        if (!newSeats.some(s => s.Seat_ID === seatA.Seat_ID)) newSeats.push(seatA);
        if (!newSeats.some(s => s.Seat_ID === seatB.Seat_ID)) newSeats.push(seatB);
        return newSeats.map(s => {
          if (s.Seat_ID === seatA.Seat_ID) {
            return { ...s, Staff_Name: seatA.Staff_Name, Title: seatA.Title, Extension: seatA.Extension };
          }
          if (s.Seat_ID === seatB.Seat_ID) {
            return { ...s, Staff_Name: seatB.Staff_Name, Title: seatB.Title, Extension: seatB.Extension };
          }
          return s;
        });
      });
    });

    return () => {
      socket.off('seat_updated');
      socket.off('seats_swapped');
    };
  }, []);

  const handleDragStart = (event: any) => {
    const { active } = event;
    const seat = seats.find(s => s.Seat_ID === active.id);
    if (seat) setActiveSeat(seat);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSeat(null);

    if (over && active.id !== over.id) {
      const seatA = seats.find(s => s.Seat_ID === active.id);
      const seatB = seats.find(s => s.Seat_ID === over.id);

      if (seatA && seatB && seatB.Is_Static === 0) {
        if (window.confirm(`確定要將 ${seatA.Staff_Name} (${seatA.Seat_ID}) 移動到 ${seatB.Seat_ID} 嗎？`)) {
          socket.emit('swap_seats', { seatA, seatB });
        }
      }
    }
  };

  const handleUpdateSeat = (updatedSeat: Seat): string | true => {
    const originalSeat = seats.find(s => s.Seat_ID === updatedSeat.Seat_ID);

    // Check for duplicates only if the value changed
    const ext = updatedSeat.Extension?.trim();
    if (ext && originalSeat && ext !== originalSeat.Extension?.trim()) {
      const duplicateExt = seats.find(s => s.Seat_ID !== updatedSeat.Seat_ID && s.Extension?.trim() === ext);
      if (duplicateExt) {
        return `分機號碼 ${ext} 已被 ${duplicateExt.Staff_Name || '其他座位'} (${duplicateExt.Seat_ID}) 使用，請重新輸入`;
      }
    }
    
    const port = updatedSeat.Port_ID?.trim();
    if (port && originalSeat && port !== originalSeat.Port_ID?.trim()) {
      const duplicatePort = seats.find(s => s.Seat_ID !== updatedSeat.Seat_ID && s.Port_ID?.trim() === port);
      if (duplicatePort) {
        return `Port 號碼 ${port} 已被 ${duplicatePort.Staff_Name || '其他座位'} (${duplicatePort.Seat_ID}) 使用，請重新輸入`;
      }
    }
    
    const jack = updatedSeat.Network_Jack?.trim();
    if (jack && originalSeat && jack !== originalSeat.Network_Jack?.trim()) {
      const duplicateJack = seats.find(s => s.Seat_ID !== updatedSeat.Seat_ID && s.Network_Jack?.trim() === jack);
      if (duplicateJack) {
        return `線號 ${jack} 已被 ${duplicateJack.Staff_Name || '其他座位'} (${duplicateJack.Seat_ID}) 使用，請重新輸入`;
      }
    }

    socket.emit('update_seat', {
      ...updatedSeat,
      Extension: ext || '',
      Port_ID: port || '',
      Network_Jack: jack || ''
    });
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
  };

  const handleSaveEdit = () => {
    if (!editModal.seat) return;
    
    let result: string | true = 'error';
    if (editModal.type === 'hardware') {
      const name = (document.getElementById('edit-name') as HTMLInputElement).value;
      const titleInput = document.getElementById('edit-title') as HTMLInputElement;
      const title = titleInput ? titleInput.value : (editModal.seat.Title || '');
      const ext = (document.getElementById('edit-ext') as HTMLInputElement).value;
      result = handleUpdateSeat({ ...editModal.seat, Staff_Name: name || '待補入', Title: title, Extension: ext });
    } else {
      const port = (document.getElementById('edit-port') as HTMLInputElement).value;
      const jack = (document.getElementById('edit-jack') as HTMLInputElement).value;
      result = handleUpdateSeat({ ...editModal.seat, Port_ID: port, Network_Jack: jack });
    }
    
    if (result === true) {
      setEditError(null);
      setEditModal({ seat: null, type: 'hardware' });
    } else {
      alert(result as string);
      setEditError(result as string);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return;
      handleSaveEdit();
    }
  };

  const getSeat = (id: string, defaultName = '待補入', dept = '') => {
    return seats.find(s => s.Seat_ID === id) || {
      Seat_ID: id,
      Staff_Name: defaultName,
      Extension: '',
      Port_ID: '',
      Network_Jack: '',
      Department: dept,
      Is_Static: 0
    };
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

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
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
                儲存
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
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">文策院分機座位圖</h1>
            <p className="text-xs text-gray-500 font-medium">視覺化互動與硬體資產管理系統</p>
          </div>
          
          <div className="flex items-center gap-2 ml-8 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setCurrentFloor('3F')}
              className={`px-4 py-1.5 rounded-md font-medium text-sm transition-colors ${currentFloor === '3F' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              3樓
            </button>
            <button
              onClick={() => setCurrentFloor('5F')}
              className={`px-4 py-1.5 rounded-md font-medium text-sm transition-colors ${currentFloor === '5F' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              5樓
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
          
          <div className="h-8 w-px bg-gray-200 mx-2" />
          
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
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="relative w-[1800px] h-[900px] bg-white">
            {currentFloor === '5F' ? (
              <Floor5 
                seats={seats} 
                isHardwareUnlocked={isHardwareUnlocked} 
                isEngineeringMode={isEngineeringMode}
                onUpdateSeat={handleUpdateSeat} 
                getSeat={getSeat} 
                onEditClick={handleEditClick}
              />
            ) : (
              <Floor3 
                seats={seats} 
                isHardwareUnlocked={isHardwareUnlocked} 
                isEngineeringMode={isEngineeringMode}
                onUpdateSeat={handleUpdateSeat} 
                getSeat={getSeat} 
                onEditClick={handleEditClick}
              />
            )}
          </div>

          <DragOverlay>
            {activeSeat ? (
              <div className="opacity-90 scale-105 shadow-2xl w-[56px] h-[48px]">
                <SeatCard 
                  seat={activeSeat} 
                  isHardwareUnlocked={isHardwareUnlocked}
                  isEngineeringMode={isEngineeringMode}
                  onUpdate={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}
