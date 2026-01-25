
import React, { useEffect, useState } from 'react';
import { ScheduleEvent } from '../types';
import { EventsDatabase } from '../db';

const Dashboard: React.FC = () => {
  const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await EventsDatabase.initialize();
        const eventData = await EventsDatabase.getAll();
        
        // Filter and sort for upcoming events
        const todayStr = new Date().toISOString().split('T')[0];
        const futureEvents = eventData
            .filter(e => e.date >= todayStr)
            .sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return a.startTime.localeCompare(b.startTime);
            })
            .slice(0, 3); // Take top 3
            
        setUpcomingEvents(futureEvents);

      } catch (error) {
        console.error("加载数据失败", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return { month, day: day < 10 ? `0${day}` : day };
  };

  return (
    <div className="space-y-8">
      {/* 欢迎区域 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-primary/5 text-primary text-xs font-bold px-3 py-1 rounded-full mb-3">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
          <h1 className="text-3xl font-bold text-text-main">欢迎回来，陈老师 👋</h1>
          <p className="text-text-muted mt-2">“学而不思则罔，思而不学则殆。” 今天有 3 份教学质量报告待您审阅。</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface-light p-5 rounded-xl border border-border-light shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">description</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-main">12</p>
                <p className="text-sm text-text-muted">待审阅资料</p>
              </div>
            </div>
            <div className="bg-surface-light p-5 rounded-xl border border-border-light shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">menu_book</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-main">342</p>
                <p className="text-sm text-text-muted">本月新增资源</p>
              </div>
            </div>
            <div className="bg-surface-light p-5 rounded-xl border border-border-light shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">record_voice_over</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-main">{upcomingEvents.length}</p>
                <p className="text-sm text-text-muted">近期教研会议</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧列 */}
        <div className="space-y-6 lg:space-y-8">
          {/* 日历 */}
          <div className="bg-surface-light rounded-xl border border-border-light shadow-sm p-6">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-text-main">教研排期</h3>
                <span className="text-xs text-text-muted font-medium bg-background-light px-2 py-1 rounded">近期日程</span>
             </div>
             
             <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-4 text-xs text-text-muted">加载日程...</div>
                ) : upcomingEvents.length === 0 ? (
                    <div className="text-center py-8 text-text-muted flex flex-col items-center">
                        <span className="material-symbols-outlined text-3xl opacity-20 mb-2">event_busy</span>
                        <p className="text-xs">暂无近期教研安排</p>
                    </div>
                ) : (
                    upcomingEvents.map(event => {
                        const dateObj = formatDate(event.date);
                        return (
                            <div key={event.id} className="flex gap-4 items-center p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-border-light group cursor-default">
                                <div className="bg-white group-hover:bg-primary/5 w-10 h-10 rounded flex flex-col items-center justify-center text-text-main group-hover:text-primary border border-border-light group-hover:border-primary/20 shadow-sm transition-colors">
                                    <span className="text-[10px] font-bold">{dateObj.month}月</span>
                                    <span className="text-lg font-bold leading-none">{dateObj.day}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-bold text-text-muted">{event.startTime} - {event.endTime}</p>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-background-light text-text-muted truncate max-w-[60px]">{event.type}</span>
                                    </div>
                                    <p className="text-sm font-bold text-text-main truncate mt-0.5" title={event.title}>{event.title}</p>
                                </div>
                            </div>
                        );
                    })
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
