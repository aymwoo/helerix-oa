
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ScheduleEvent, EventTypeTag } from '../types';
import { EventsDatabase, EventTypeDatabase } from '../db';

const COLORS_POOL = [
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'bg-lime-100 text-lime-700 border-lime-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-orange-100 text-orange-700 border-orange-200'
];

const Schedule: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection State
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [lastClickDate, setLastClickDate] = useState<string | null>(null);

  // View Controls
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [excludeWeekends, setExcludeWeekends] = useState(false);

  // Modal State - Add Event
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false); // Check if we are adding events for multiple days
  
  // Modal State - View Day Details
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  
  const [newEvent, setNewEvent] = useState<Partial<ScheduleEvent>>({
    type: '',
    startTime: '09:00',
    endTime: '11:00',
    participants: []
  });

  // Participant input state for the add form
  const [participantInput, setParticipantInput] = useState("");
  
  // Tag Input State
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await EventsDatabase.initialize();
        const eventData = await EventsDatabase.getAll();
        setEvents(eventData);

        await EventTypeDatabase.initialize();
        const typeData = await EventTypeDatabase.getAll();
        setEventTypes(typeData);

        // Set default type if available
        if (typeData.length > 0) {
            setNewEvent(prev => ({ ...prev, type: typeData[0].name }));
        }
      } catch (error) {
        console.error("Failed to load schedule data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const todayStr = new Date().toISOString().split('T')[0];

  const daysArray = useMemo(() => {
    const days = [];
    
    // Calculate padding for Monday start
    const firstDayStandard = new Date(year, month, 1).getDay();
    const padding = firstDayStandard === 0 ? 6 : firstDayStandard - 1;

    // Add Padding Slots
    for (let i = 0; i < padding; i++) {
        days.push({ type: 'padding', id: `pad-${i}` });
    }

    // Add Actual Days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay(); // 0-6
      
      const dayEvents = events.filter(e => e.date === dateStr);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      days.push({
        type: 'day',
        id: `day-${i}`,
        day: i,
        dateStr,
        events: dayEvents,
        isWeekend,
        isToday: dateStr === todayStr
      });
    }
    return days;
  }, [year, month, events, daysInMonth, todayStr]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // --- Advanced Selection Logic ---
  const handleDateSelect = (e: React.MouseEvent, dateStr: string) => {
      // Prevent text selection during shift-click
      if (e.shiftKey) {
          window.getSelection()?.removeAllRanges();
      }

      if (e.ctrlKey || e.metaKey) {
          // CTRL/CMD: Toggle selection
          const newSet = new Set(selectedDates);
          if (newSet.has(dateStr)) {
              newSet.delete(dateStr);
          } else {
              newSet.add(dateStr);
          }
          setSelectedDates(newSet);
          setLastClickDate(dateStr);
      } else if (e.shiftKey && lastClickDate) {
          // SHIFT: Range selection
          const start = new Date(lastClickDate);
          const end = new Date(dateStr);
          
          const low = start < end ? start : end;
          const high = start < end ? end : start;
          
          const newSet = new Set(selectedDates);
          // Loop through range
          for (let d = new Date(low); d <= high; d.setDate(d.getDate() + 1)) {
               const dStr = d.toISOString().split('T')[0];
               // Only add if it belongs to current month view (simplification for this UI)
               if (d.getMonth() === month) {
                   newSet.add(dStr);
               }
          }
          setSelectedDates(newSet);
      } else {
          // Normal Click: Clear others, select this one
          setSelectedDates(new Set([dateStr]));
          setLastClickDate(dateStr);
      }
  };
  
  const handleDateDoubleClick = (dateStr: string) => {
      setViewingDate(dateStr);
  };

  const clearSelection = () => {
      setSelectedDates(new Set());
      setLastClickDate(null);
  };

  // Click on the plus icon: Add Event (Single or Batch)
  const handleAddIconClick = (e: React.MouseEvent, dateStr: string | null = null) => {
    e.stopPropagation();
    
    // Determine if we are in batch mode (triggered from floating bar) or single mode
    const isBatch = dateStr === null && selectedDates.size > 0;
    
    setIsBatchMode(isBatch);
    setNewEvent({
        ...newEvent,
        date: isBatch ? Array.from(selectedDates)[0] : dateStr!, // Default date for form logic
        participants: []
    });
    setParticipantInput("");
    setIsAddModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) {
        alert("请填写完整的事件信息");
        return;
    }
    
    // Auto-add current input if not empty
    const finalParticipants = [...(newEvent.participants || [])];
    if (participantInput.trim()) {
        finalParticipants.push(participantInput.trim());
    }

    const targets = isBatchMode ? Array.from(selectedDates) : [newEvent.date!];
    
    // Batch Create
    const newEvents: ScheduleEvent[] = targets.map(dStr => ({
        id: Date.now().toString() + Math.random().toString().slice(2, 6),
        title: newEvent.title!,
        date: dStr,
        startTime: newEvent.startTime!,
        endTime: newEvent.endTime!,
        type: newEvent.type || (eventTypes.length > 0 ? eventTypes[0].name : '一般活动'),
        description: newEvent.description,
        participants: finalParticipants
    }));

    // Sequential add (to simulate batch DB op)
    for (const ev of newEvents) {
        await EventsDatabase.add(ev);
    }
    
    // Refresh
    const updated = await EventsDatabase.getAll();
    setEvents(updated);
    
    setIsAddModalOpen(false);
    setIsBatchMode(false);
    clearSelection(); // Clear selection after batch add
    setNewEvent({ type: eventTypes.length > 0 ? eventTypes[0].name : '', startTime: '09:00', endTime: '11:00', title: '', description: '', participants: [] });
    setParticipantInput("");
  };

  const handleDeleteEvent = async (id: string) => {
      if(confirm("确定删除此日程吗？")) {
          const updated = await EventsDatabase.delete(id);
          setEvents(updated);
      }
  }

  const addParticipant = () => {
      if(participantInput.trim()) {
          setNewEvent({
              ...newEvent,
              participants: [...(newEvent.participants || []), participantInput.trim()]
          });
          setParticipantInput("");
      }
  };

  const removeParticipant = (index: number) => {
      const updated = [...(newEvent.participants || [])];
      updated.splice(index, 1);
      setNewEvent({...newEvent, participants: updated});
  };

  // --- Dynamic Tag Management ---

  const handleAddNewTag = async () => {
      if (!newTagInput.trim()) {
          setIsAddingTag(false);
          return;
      }
      
      const exists = eventTypes.find(t => t.name === newTagInput.trim());
      if (exists) {
          setNewEvent({ ...newEvent, type: exists.name });
          setNewTagInput("");
          setIsAddingTag(false);
          return;
      }

      // Assign Random Color from Pool
      const randomColor = COLORS_POOL[Math.floor(Math.random() * COLORS_POOL.length)];
      
      const updatedTypes = await EventTypeDatabase.add(newTagInput.trim(), randomColor);
      setEventTypes(updatedTypes);
      
      // Select the new tag
      setNewEvent({ ...newEvent, type: newTagInput.trim() });
      setNewTagInput("");
      setIsAddingTag(false);
  };

  const handleDeleteTag = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("删除此标签？这不会影响已创建的日程，但无法再选择此类型。")) {
          const updated = await EventTypeDatabase.delete(id);
          setEventTypes(updated);
          // If deleted tag was selected, select first available
          if (updated.length > 0 && newEvent.type === eventTypes.find(t => t.id === id)?.name) {
              setNewEvent({ ...newEvent, type: updated[0].name });
          }
      }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleAddNewTag();
      } else if (e.key === 'Escape') {
          setIsAddingTag(false);
      }
  };

  // Helper to get styles from DB tags
  const getEventStyle = (typeName: string) => {
      const tag = eventTypes.find(t => t.name === typeName);
      return tag ? tag.colorClass : 'bg-gray-100 text-gray-700 border-gray-200';
  }

  const getEventDotColor = (typeName: string) => {
      const style = getEventStyle(typeName);
      // Rough heuristic to map bg color to a solid color for the dot
      if (style.includes('violet')) return 'bg-violet-500';
      if (style.includes('blue')) return 'bg-blue-500';
      if (style.includes('emerald')) return 'bg-emerald-500';
      if (style.includes('amber')) return 'bg-amber-500';
      if (style.includes('rose')) return 'bg-rose-500';
      if (style.includes('cyan')) return 'bg-cyan-500';
      if (style.includes('fuchsia')) return 'bg-fuchsia-500';
      if (style.includes('lime')) return 'bg-lime-500';
      if (style.includes('indigo')) return 'bg-indigo-500';
      if (style.includes('orange')) return 'bg-orange-500';
      return 'bg-gray-500';
  }

  // Filter grid items for UI
  const filteredGridItems = useMemo(() => {
     if (!excludeWeekends) return daysArray;
     return daysArray.filter((_, index) => {
         const colIndex = index % 7; 
         return colIndex < 5; 
     });
  }, [daysArray, excludeWeekends]);

  // Derived state for viewing modal
  const viewDayEvents = useMemo(() => {
      if (!viewingDate) return [];
      return events.filter(e => e.date === viewingDate);
  }, [viewingDate, events]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 h-full flex flex-col relative">
      {/* Header & Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-xl shadow border border-[#E5E7EB] shrink-0 select-none">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-background-light p-1.5 rounded-2xl border border-[#E5E7EB]">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                <div className="px-4 text-center min-w-[120px]">
                    <span className="block text-sm font-black text-text-main">{year}年</span>
                    <span className="block text-lg font-black text-primary">{month + 1}月</span>
                </div>
                <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
            </div>
            <div>
                <h1 className="text-2xl font-semibold text-text-main">教研排期</h1>
                <p className="text-xs text-text-muted mt-1">按住 <kbd className="font-mono bg-gray-100 px-1 rounded border">Ctrl</kbd> 或 <kbd className="font-mono bg-gray-100 px-1 rounded border">Shift</kbd> 可批量选择日期，双击日期查看详情。</p>
            </div>
         </div>

         <div className="flex items-center gap-3">
             <button 
                onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold transition-all border ${showAvailableOnly ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-200' : 'bg-white text-text-muted border-[#E5E7EB] hover:bg-gray-50'}`}
             >
                 <span className="material-symbols-outlined text-[18px]">{showAvailableOnly ? 'check_circle' : 'filter_alt'}</span>
                 仅显示可安排日期
             </button>
             
             <button 
                onClick={() => setExcludeWeekends(!excludeWeekends)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold transition-all border ${excludeWeekends ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-text-muted border-[#E5E7EB] hover:bg-gray-50'}`}
             >
                 <span className="material-symbols-outlined text-[18px]">{excludeWeekends ? 'event_busy' : 'weekend'}</span>
                 {excludeWeekends ? '已排除周末' : '包含周末'}
             </button>
         </div>
      </div>

      {/* Calendar Grid */}
      <div className={`flex-1 overflow-y-auto bg-white rounded-lg border border-[#E5E7EB] shadow p-6 ${showAvailableOnly ? 'bg-green-50/30' : ''} select-none`}>
         {/* Weekday Headers */}
         <div className={`grid mb-4 ${excludeWeekends ? 'grid-cols-5' : 'grid-cols-7'}`}>
            {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, index) => {
                if (excludeWeekends && index >= 5) return null;
                return (
                    <div key={day} className={`text-center text-xs font-bold uppercase tracking-widest py-2 ${index >= 5 ? 'text-red-400' : 'text-text-muted'}`}>
                        {day}
                    </div>
                );
            })}
         </div>

         {/* Days Grid */}
         <div className={`grid gap-4 auto-rows-fr min-h-[500px] ${excludeWeekends ? 'grid-cols-5' : 'grid-cols-7'}`}>
            {filteredGridItems.map((item) => {
                if (item.type === 'padding') {
                    return <div key={item.id} className="p-4"></div>;
                }
                
                const hasEvents = item.events && item.events.length > 0;
                const isBusySlot = hasEvents;
                const dayItem = item as { dateStr: string; day: number; events: any[]; type: string; isToday: boolean };
                const isSelected = selectedDates.has(dayItem.dateStr);

                if (showAvailableOnly && isBusySlot) {
                     return (
                        <div 
                            key={item.id}
                            className="relative p-3 rounded-2xl border border-gray-100 bg-gray-50/50 flex flex-col gap-2 opacity-50 cursor-not-allowed"
                            title="该日期已有安排"
                        >
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-bold text-gray-300">{item.day}</span>
                            </div>
                        </div>
                    );
                }

                return (
                    <div 
                        key={item.id}
                        onClick={(e) => handleDateSelect(e, dayItem.dateStr)}
                        onDoubleClick={() => handleDateDoubleClick(dayItem.dateStr)}
                        className={`
                            relative p-3 rounded-2xl border transition-all cursor-pointer group min-h-[100px] flex flex-col gap-2
                            ${item.isToday ? 'ring-2 ring-primary ring-offset-2 z-10' : ''}
                            ${isSelected ? 'ring-2 ring-primary bg-primary/5 shadow-inner' : ''}
                            ${hasEvents && !isSelected
                                ? 'bg-white border-purple-200 hover:border-purple-400 hover:shadow-md' 
                                : isSelected 
                                    ? 'border-primary' 
                                    : showAvailableOnly 
                                        ? 'bg-green-100 border-green-300 shadow-md transform scale-[1.02]' 
                                        : 'bg-green-50/50 border-green-100 hover:bg-green-100 hover:border-green-300 hover:shadow-md'
                            }
                        `}
                    >
                        {/* Header Row in Cell */}
                        <div className="flex justify-between items-start">
                             <span className={`
                                text-sm font-black 
                                ${item.isToday 
                                    ? 'bg-primary text-white w-6 h-6 flex items-center justify-center rounded-full shadow-sm -mt-1 -ml-1' 
                                    : (hasEvents ? 'text-text-main' : (showAvailableOnly ? 'text-green-800' : 'text-green-700'))
                                }
                             `}>{item.day}</span>
                             
                             {/* Plus Button - Single Add */}
                             <button
                                onClick={(e) => handleAddIconClick(e, dayItem.dateStr)}
                                className={`
                                    absolute top-2 right-2 p-1 rounded-full transition-all duration-200
                                    ${hasEvents 
                                        ? 'opacity-0 group-hover:opacity-100 bg-primary/10 text-primary hover:bg-primary hover:text-white' 
                                        : showAvailableOnly
                                            ? 'opacity-100 bg-green-200 text-green-700 hover:bg-green-600 hover:text-white'
                                            : 'opacity-0 group-hover:opacity-100 bg-green-200 text-green-700 hover:bg-green-600 hover:text-white'
                                    }
                                `}
                                title="添加日程"
                             >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                             </button>
                        </div>

                        {/* Hover Preview Card - Only show on single select or hover, not during multi-select ops potentially */}
                        {hasEvents && !isSelected && (
                            <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-[105%] w-64 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-border-light p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                                <div className="flex items-center justify-between border-b border-border-light pb-2 mb-2">
                                    <span className="text-xs font-bold text-text-main">{dayItem.dateStr}</span>
                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{item.events.length} 项日程</span>
                                </div>
                                <div className="space-y-2 max-h-[180px] overflow-hidden relative">
                                    {item.events.slice(0, 5).map((ev: any) => (
                                        <div key={ev.id} className="flex items-start gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${getEventDotColor(ev.type)}`}></div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex justify-between items-baseline">
                                                    <p className="text-[10px] font-bold text-text-main truncate leading-tight w-24">{ev.title}</p>
                                                    <span className="text-[9px] text-text-muted font-mono whitespace-nowrap">{ev.startTime}-{ev.endTime}</span>
                                                </div>
                                                <p className="text-[9px] text-text-muted/70 truncate">{ev.type}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {item.events.length > 5 && (
                                        <div className="text-[9px] text-center text-text-muted font-medium bg-background-light/50 rounded py-1">
                                            还有 {item.events.length - 5} 项更多日程...
                                        </div>
                                    )}
                                </div>
                                {/* Triangle Arrow */}
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/95 filter drop-shadow-sm"></div>
                            </div>
                        )}
                        
                        {/* Event List Summary */}
                        {hasEvents ? (
                            <div className="space-y-1 overflow-y-auto no-scrollbar flex-1 mt-1">
                                {item.events.map((ev: any) => (
                                    <div key={ev.id} className={`text-[9px] px-1.5 py-1 rounded border truncate flex items-center gap-1.5 transition-colors ${getEventStyle(ev.type)}`}>
                                        <span className="font-bold shrink-0">{ev.startTime}</span>
                                        <span className="shrink-0 opacity-70 border-l border-current pl-1.5 text-[8px] font-bold">{ev.type}</span>
                                        <span className="truncate">{ev.title}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${showAvailableOnly ? 'text-green-700' : 'text-green-600/40 group-hover:text-green-600/70'}`}>
                                    {showAvailableOnly ? '可安排' : '空闲'}
                                </span>
                            </div>
                        )}
                        
                        {/* Selected Indicator Check */}
                        {isSelected && (
                             <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center shadow-sm z-20">
                                 <span className="material-symbols-outlined text-[14px]">check</span>
                             </div>
                        )}
                    </div>
                );
            })}
         </div>
      </div>
      
      {/* Batch Action Bar */}
      {selectedDates.size > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[40] animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10">
              <div className="flex items-center gap-3 pr-6 border-r border-white/20">
                 <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold shadow-inner">
                   {selectedDates.size}
                 </div>
                 <span className="text-sm font-medium tracking-wide">天已选中</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => handleAddIconClick(e)} 
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-violet-600 rounded-xl transition-all font-bold text-sm shadow-lg shadow-primary/20 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                  批量添加日程
                </button>
                
                <button 
                  onClick={clearSelection} 
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-bold text-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                  取消
                </button>
              </div>
            </div>
          </div>
      )}

      {/* Add Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b border-border-light pb-4 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-text-main">{isBatchMode ? `批量新增日程 (${selectedDates.size}天)` : '新增教研日程'}</h3>
                        {isBatchMode && <p className="text-xs text-text-muted mt-1">此日程将同步应用至所有选定日期</p>}
                    </div>
                    <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-text-muted transition-colors"><span className="material-symbols-outlined">close</span></button>
                </div>
                
                <div className="space-y-4 overflow-y-auto pr-2">
                    <div className="space-y-1.5">
                         <label className="text-xs font-bold text-text-muted uppercase">日期</label>
                         {isBatchMode ? (
                             <div className="w-full px-4 py-3 bg-background-light border border-border-light rounded-xl font-bold text-sm text-text-muted flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">date_range</span>
                                已锁定 {selectedDates.size} 个日期
                             </div>
                         ) : (
                             <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full px-4 py-3 bg-background-light border border-border-light rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                         )}
                    </div>

                    <div className="space-y-1.5">
                         <label className="text-xs font-bold text-text-muted uppercase">日程标题</label>
                         <input type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="例如：初三数学备课组研讨" className="w-full px-4 py-3 bg-white border border-border-light rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase">开始时间</label>
                            <input type="time" value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} className="w-full px-4 py-3 bg-white border border-border-light rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase">结束时间</label>
                            <input type="time" value={newEvent.endTime} onChange={e => setNewEvent({...newEvent, endTime: e.target.value})} className="w-full px-4 py-3 bg-white border border-border-light rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                         </div>
                    </div>

                    <div className="space-y-1.5">
                         <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-text-muted uppercase">活动类型</label>
                            <span className="text-[10px] text-text-muted">可自定义添加标签</span>
                         </div>
                         <div className="flex flex-wrap gap-2">
                             {eventTypes.map(tag => (
                                 <div key={tag.id} className="relative group">
                                     <button 
                                        onClick={() => setNewEvent({...newEvent, type: tag.name})}
                                        className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-all flex items-center gap-1 ${newEvent.type === tag.name ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-text-muted border-border-light hover:bg-gray-50'}`}
                                     >
                                         <div className={`w-1.5 h-1.5 rounded-full ${newEvent.type === tag.name ? 'bg-white' : tag.colorClass.split(' ')[0].replace('100', '500')}`}></div>
                                         {tag.name}
                                     </button>
                                     <button 
                                        onClick={(e) => handleDeleteTag(e, tag.id)}
                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110"
                                        title="删除标签"
                                     >
                                        <span className="material-symbols-outlined text-[10px]">close</span>
                                     </button>
                                 </div>
                             ))}
                             
                             {/* Add New Tag Button/Input */}
                             {isAddingTag ? (
                                 <input 
                                     ref={tagInputRef}
                                     type="text" 
                                     autoFocus
                                     value={newTagInput} 
                                     onChange={(e) => setNewTagInput(e.target.value)}
                                     onBlur={handleAddNewTag}
                                     onKeyDown={handleTagInputKeyDown}
                                     placeholder="新标签..."
                                     className="px-3 py-1.5 text-xs border border-primary rounded-lg outline-none w-24 bg-white"
                                 />
                             ) : (
                                 <button 
                                     onClick={() => setIsAddingTag(true)}
                                     className="px-3 py-1.5 text-xs font-bold border border-dashed border-border-light rounded-lg text-text-muted hover:text-primary hover:border-primary transition-colors flex items-center gap-1"
                                 >
                                     <span className="material-symbols-outlined text-[14px]">add</span>
                                     新建
                                 </button>
                             )}
                         </div>
                    </div>

                    <div className="space-y-1.5">
                         <label className="text-xs font-bold text-text-muted uppercase">添加参与人员 (用户)</label>
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                value={participantInput} 
                                onChange={e => setParticipantInput(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && addParticipant()}
                                placeholder="输入姓名后回车..." 
                                className="flex-1 px-4 py-2 bg-white border border-border-light rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                             />
                             <button onClick={addParticipant} className="px-3 bg-background-light hover:bg-gray-200 rounded-xl text-text-main font-bold"><span className="material-symbols-outlined">add</span></button>
                         </div>
                         <div className="flex flex-wrap gap-2 mt-2">
                             {newEvent.participants?.map((p, idx) => (
                                 <span key={idx} className="px-2 py-1 bg-primary/5 text-primary border border-primary/20 rounded-lg text-xs font-bold flex items-center gap-1">
                                     {p}
                                     <button onClick={() => removeParticipant(idx)} className="hover:text-red-500"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                 </span>
                             ))}
                         </div>
                    </div>

                    <div className="space-y-1.5">
                         <label className="text-xs font-bold text-text-muted uppercase">备注详情</label>
                         <textarea value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} placeholder="输入活动详情..." className="w-full h-20 px-4 py-3 bg-white border border-border-light rounded-xl font-medium text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                    </div>
                </div>

                <div className="mt-8 flex gap-3 shrink-0">
                    <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 border border-border-light rounded-xl font-bold text-sm text-text-muted hover:bg-gray-50 transition-colors">取消</button>
                    <button onClick={handleSaveEvent} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-violet-700 transition-all active:scale-95">{isBatchMode ? '批量创建' : '确认添加'}</button>
                </div>
            </div>
        </div>
      )}

      {/* View Day Details Modal */}
      {viewingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-0 overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-primary p-6 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">{viewingDate.split('-')[0]}年 教研日程</p>
                            <h2 className="text-3xl font-black">{viewingDate.split('-')[1]}月{viewingDate.split('-')[2]}日</h2>
                            <p className="text-sm font-medium opacity-80 mt-1">当日共有 {viewDayEvents.length} 项教研活动</p>
                        </div>
                        <button onClick={() => setViewingDate(null)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-md">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-4">
                    {viewDayEvents.length === 0 ? (
                        <div className="text-center py-12 text-text-muted flex flex-col items-center">
                            <span className="material-symbols-outlined text-4xl opacity-20 mb-3">event_busy</span>
                            <p className="text-sm font-medium">今日暂无安排</p>
                            <button 
                                onClick={(e) => { setViewingDate(null); handleAddIconClick(e, viewingDate); }} 
                                className="mt-4 px-6 py-2 bg-primary/5 text-primary rounded-xl text-sm font-bold hover:bg-primary/10 transition-colors"
                            >
                                添加第一项日程
                            </button>
                        </div>
                    ) : (
                        viewDayEvents.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(ev => (
                            <div key={ev.id} className="group p-4 rounded-2xl border border-border-light hover:border-primary/30 hover:shadow-md transition-all bg-white relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getEventStyle(ev.type)}`}>
                                        {ev.type}
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteEvent(ev.id)}
                                        className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="删除日程"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center pt-1 min-w-[50px]">
                                        <span className="text-sm font-black text-text-main">{ev.startTime}</span>
                                        <div className="w-0.5 h-3 bg-border-light my-0.5"></div>
                                        <span className="text-xs font-bold text-text-muted">{ev.endTime}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-base font-bold text-text-main leading-tight mb-1">{ev.title}</h3>
                                        {ev.description && <p className="text-xs text-text-muted mb-3 line-clamp-2">{ev.description}</p>}
                                        
                                        {/* Participants Display */}
                                        {ev.participants && ev.participants.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {ev.participants.map((p, idx) => (
                                                    <div key={idx} className="flex items-center gap-1 bg-background-light px-2 py-0.5 rounded-full border border-border-light">
                                                        <span className="material-symbols-outlined text-[12px] text-text-muted">person</span>
                                                        <span className="text-[10px] font-bold text-text-main">{p}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {viewDayEvents.length > 0 && (
                     <div className="p-4 border-t border-border-light bg-background-light/30 shrink-0">
                         <button 
                            onClick={(e) => { setViewingDate(null); handleAddIconClick(e, viewingDate); }} 
                            className="w-full py-3 bg-white border border-border-light rounded-xl font-bold text-sm text-primary hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center gap-2"
                         >
                             <span className="material-symbols-outlined">add</span>
                             追加新日程
                         </button>
                     </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
