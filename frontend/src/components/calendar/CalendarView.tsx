import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardCheck,
  PhoneCall,
  MapPin,
  Users,
  Plus
} from 'lucide-react';
import { api } from '../../services/api';
import { FollowUp, Survey } from '../../types';
import { getISTDateKey, formatISTTime, getISTTodayString } from '../../utils/date';

interface CalendarViewProps {
  onSelectLead: (id: number) => void;
  onOpenQuickAction: (action: 'lead' | 'followup' | 'survey' | 'quotation') => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onSelectLead,
  onOpenQuickAction
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const [fUps, srvs] = await Promise.all([
        api.getFollowups(),
        api.getSurveys()
      ]);
      setFollowups(fUps);
      setSurveys(srvs);
    } catch (e) {
      console.error('Error fetching calendar events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Combine follow-ups and surveys into events
  const events = [
    ...followups.map(f => ({
      id: `f-${f.id}`,
      lead_id: f.lead_id,
      title: `${f.follow_up_type.toUpperCase()}: ${f.lead_name}`,
      dateStr: getISTDateKey(f.scheduled_date),
      timeStr: formatISTTime(f.scheduled_date),
      type: 'followup',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      raw: f
    })),
    ...surveys.map(s => ({
      id: `s-${s.id}`,
      lead_id: s.lead_id,
      title: `SURVEY: ${s.lead_name} (${s.recommended_system_size}kW)`,
      dateStr: getISTDateKey(s.scheduled_date),
      timeStr: s.scheduled_date ? formatISTTime(s.scheduled_date) : '10:00 AM',
      type: 'survey',
      color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      raw: s
    }))
  ];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-amber-400" />
            <span>Solar Operations & Site Visit Calendar</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unified view of site surveys, rooftop engineer audits, customer demos, and sales calls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month / Week / Day toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 font-semibold rounded-lg ${
                viewMode === 'month' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 font-semibold rounded-lg ${
                viewMode === 'week' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 font-semibold rounded-lg ${
                viewMode === 'day' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Day
            </button>
          </div>

          <button
            onClick={() => onOpenQuickAction('followup')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={prevPeriod}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-base font-bold text-white font-display">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={nextPeriod}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">Follow-up Calls / Meetings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Rooftop Site Surveys</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid (Month View) */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 pb-3 border-b border-slate-800">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Month Day Cells */}
        <div className="grid grid-cols-7 gap-1 pt-2">
          {/* Empty prefix cells */}
          {[...Array(firstDay)].map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] p-2 bg-slate-950/20 rounded-xl" />
          ))}

          {/* Month day cells */}
          {[...Array(daysInMonth)].map((_, i) => {
            const dayNum = i + 1;
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.dateStr === dateKey);
            const isToday = getISTTodayString() === dateKey;

            return (
              <div
                key={dayNum}
                className={`min-h-[105px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  isToday
                    ? 'bg-amber-500/5 border-amber-500/40'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-semibold text-slate-500">
                      {dayEvents.length} events
                    </span>
                  )}
                </div>

                {/* Day events badges */}
                <div className="space-y-1 mt-1.5 flex-1">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => onSelectLead(ev.lead_id)}
                      className={`w-full p-1 text-[10px] font-semibold rounded-md border text-left truncate block transition-transform hover:scale-[1.02] ${ev.color}`}
                    >
                      {ev.timeStr} • {ev.title}
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-amber-400 font-bold block text-center">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
