import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Seat, DepartmentConfig, TitleConfig } from '../types';
import { Floor5 } from '../components/Floor5';
import { Floor3 } from '../components/Floor3';
import { SouthCenter } from '../components/SouthCenter';
import { PhoneDirectory } from '../components/PhoneDirectory';
import { subscribeToSeats, subscribeToDepartments, subscribeToTitleConfigs } from '../services/firebaseService';

export default function PublicView() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [departments, setDepartments] = useState<DepartmentConfig[]>([]);
  const [titleConfigs, setTitleConfigs] = useState<TitleConfig[]>([]);
  const [currentFloor, setCurrentFloor] = useState<'3F' | '5F' | 'South' | 'PhoneDirectory'>('5F');
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);

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

  const getSeat = (id: string, defaultDept?: string, defaultSection?: string) => {
    return seats.find(s => s.Seat_ID === id) || { 
      Seat_ID: id, 
      Staff_Name: '', 
      Title: '', 
      Extension: '', 
      Port_ID: '', 
      Network_Jack: '', 
      Department: defaultDept || '', 
      Section: defaultSection || '',
      Is_Static: 1,
      isDefaultDept: !!defaultDept
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsPanning(true);
    setStartPanPos({ x: e.clientX, y: e.clientY });
    setScrollPos({
      left: scrollContainerRef.current.scrollLeft,
      top: scrollContainerRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !scrollContainerRef.current) return;
    const dx = e.clientX - startPanPos.x;
    const dy = e.clientY - startPanPos.y;
    scrollContainerRef.current.scrollLeft = scrollPos.left - dx;
    scrollContainerRef.current.scrollTop = scrollPos.top - dy;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <span className="text-indigo-600 font-bold text-xl">文策院</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">文策院分機座位圖</h1>
                <p className="text-xs text-gray-500">視覺化互動與硬體資產管理系統 (公開版)</p>
              </div>
            </div>

            <div className="h-8 w-px bg-gray-200 mx-2"></div>

            <div className="flex bg-gray-100 p-1 rounded-lg">
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
              <div className="w-px bg-gray-300 mx-1 my-1"></div>
              <button
                onClick={() => setCurrentFloor('South')}
                className={`px-4 py-1.5 rounded-md font-medium text-sm transition-colors ${currentFloor === 'South' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                南部營運中心
              </button>
              <div className="w-px bg-gray-300 mx-1 my-1"></div>
              <button
                onClick={() => setCurrentFloor('PhoneDirectory')}
                className={`px-4 py-1.5 rounded-md font-medium text-sm transition-colors ${currentFloor === 'PhoneDirectory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                電話總表
              </button>
            </div>
          </div>
          <div className="flex items-center">
            <Link to="/admin" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-md transition-colors">
              進入後台
            </Link>
          </div>
        </div>
      </header>

      <main 
        className="flex-1 overflow-auto bg-gray-100 relative"
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <div id="seat-map-container" className={`relative bg-white ${currentFloor === 'PhoneDirectory' ? 'w-full min-h-[900px]' : 'w-[1800px] h-[900px]'}`}>
          {currentFloor === '5F' && (
            <Floor5 
              seats={seats} 
              departments={departments}
              isHardwareUnlocked={false} 
              isEngineeringMode={false}
              onUpdateSeat={() => {}} 
              getSeat={getSeat} 
              onEditClick={() => {}}
              onMouseEnter={setHoveredSeatId}
              onMouseLeave={() => setHoveredSeatId(null)}
            />
          )}
          {currentFloor === '3F' && (
            <Floor3 
              seats={seats} 
              departments={departments}
              isHardwareUnlocked={false} 
              isEngineeringMode={false}
              onUpdateSeat={() => {}} 
              getSeat={getSeat} 
              onEditClick={() => {}}
              onMouseEnter={setHoveredSeatId}
              onMouseLeave={() => setHoveredSeatId(null)}
            />
          )}
          {currentFloor === 'South' && (
            <SouthCenter
              seats={seats} 
              departments={departments}
              isHardwareUnlocked={false} 
              isEngineeringMode={false}
              onUpdateSeat={() => {}} 
              getSeat={getSeat} 
              onEditClick={() => {}}
              onMouseEnter={setHoveredSeatId}
              onMouseLeave={() => setHoveredSeatId(null)}
            />
          )}
          {currentFloor === 'PhoneDirectory' && (
            <PhoneDirectory
              seats={seats}
              departments={departments}
              titleConfigs={titleConfigs}
            />
          )}
        </div>
      </main>
    </div>
  );
}
