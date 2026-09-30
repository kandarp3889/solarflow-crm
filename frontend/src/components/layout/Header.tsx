import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Plus,
  Sparkles,
  Bell,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  Phone,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { NotificationItem } from '../../types';

interface HeaderProps {
  setIsMobileOpen: (open: boolean) => void;
  onOpenQuickAction: (actionType: 'lead' | 'followup' | 'survey' | 'quotation') => void;
  onToggleAIDrawer: () => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  setIsMobileOpen,
  onOpenQuickAction,
  onToggleAIDrawer,
  globalSearch,
  setGlobalSearch
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n: NotificationItem) => !n.is_read).length);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      // ignore
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-[#0d1711]/90 backdrop-blur-md border-b border-[#1e3423]">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-slate-400 hover:text-white rounded-lg lg:hidden hover:bg-[#15271b]"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/70" />
          <input
            type="text"
            placeholder="Search leads, phone, customer, quotation ID..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs md:text-sm bg-[#132218] border border-[#233d2a] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#FEC426] focus:ring-1 focus:ring-[#FEC426] transition-all"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Center: True Sun Support Badge on wide screens */}
      <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-[#106828]/20 border border-[#106828]/40 text-xs text-slate-300">
        <Phone className="w-3 h-3 text-[#FEC426]" />
        <span>Hotline: <strong className="text-white font-mono">+91 99740 45095</strong></span>
        <span className="text-[#FEC426]">•</span>
        <span className="text-emerald-400 text-[11px]">Mangrol, Gujarat</span>
      </div>

      {/* Right: Quick Actions, AI, Notifications, User */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Action Buttons */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => onOpenQuickAction('lead')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FEC426] hover:bg-[#e5af1f] text-[#0a110c] shadow-sm shadow-[#FEC426]/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>

          <button
            onClick={() => onOpenQuickAction('followup')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#15271b] hover:bg-[#1e3423] text-slate-200 border border-[#233d2a] transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#FEC426]" />
            <span className="hidden md:inline">Follow-up</span>
          </button>

          <button
            onClick={() => onOpenQuickAction('quotation')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#15271b] hover:bg-[#1e3423] text-slate-200 border border-[#233d2a] transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Quotation</span>
          </button>
        </div>

        {/* AI Assistant Button */}
        <button
          onClick={onToggleAIDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-[#106828]/40 to-[#FEC426]/30 border border-[#FEC426]/40 text-[#FEC426] hover:bg-[#FEC426]/20 transition-all shadow-sm cursor-pointer"
          title="Open True Sun AI Solar Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FEC426] animate-pulse" />
          <span className="hidden sm:inline font-display">AI Assistant</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#15271b] transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FEC426] text-[10px] font-bold text-[#0a110c]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0d1711] border border-[#1e3423] shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3423] bg-[#09120b]">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#FEC426]/20 text-[#FEC426]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-[#FEC426] hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#1e3423]/50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 transition-colors ${
                        n.is_read ? 'opacity-60 bg-transparent' : 'bg-[#121e16]/60'
                      } hover:bg-[#15271b]`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1 rounded-lg bg-[#106828]/30 text-emerald-400 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[9px] text-slate-500 mt-1 block">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
