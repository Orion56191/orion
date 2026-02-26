
import React from 'react';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Theme, ChatSession, Language } from '../types';

interface SidebarProps {
  theme: Theme;
  language: Language;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  theme,
  language,
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  isOpen,
  onClose
}) => {
  const t = {
    zh: {
        history: "历史记录",
        newChat: "开启新对话",
        noHistory: "暂无历史记录",
        defaultTitle: "✨ 新对话"
    },
    en: {
        history: "HISTORY",
        newChat: "New Chat",
        noHistory: "No history yet",
        defaultTitle: "✨ New Chat"
    }
  }[language];

  const getSidebarStyles = () => {
    switch (theme) {
      case Theme.WINTER:
        return 'bg-slate-900/90 border-r border-white/10 text-white';
      case Theme.MONSOON:
        return 'bg-slate-800/90 border-r border-teal-500/10 text-blue-50';
      case Theme.DAYBREAK:
        return 'bg-[#FDF6E3]/95 border-r border-[#D1C7B7] text-slate-800';
      default:
        return 'bg-gray-900 text-white';
    }
  };

  const getItemStyles = (isActive: boolean) => {
    if (isActive) {
      switch (theme) {
        case Theme.WINTER: return 'bg-white/10 text-white';
        case Theme.MONSOON: return 'bg-teal-500/20 text-teal-100';
        case Theme.DAYBREAK: return 'bg-[#E5DCCA] text-slate-900';
        default: return 'bg-gray-700';
      }
    }
    return 'hover:bg-black/5 opacity-70 hover:opacity-100';
  };

  // Helper to generate a display title
  const getDisplayTitle = (session: ChatSession) => {
    // Check if the current title is a default placeholder or empty
    const defaultTitles = ['✨ 新对话', '✨ New Chat', '新对话', 'New Chat', 'Untitled Session', '未命名对话'];
    const isDefaultTitle = !session.title || defaultTitles.includes(session.title);

    if (isDefaultTitle) {
      // Try to find the first user message
      const firstUserMsg = session.messages.find(m => m.role === 'user');
      if (firstUserMsg && firstUserMsg.content && firstUserMsg.content.trim()) {
        const content = firstUserMsg.content.trim();
        // Truncate if longer than 20 characters
        return content.length > 20 ? content.slice(0, 20) + '...' : content;
      }
      // If no valid user message found, return localized default
      return t.defaultTitle;
    }

    return session.title;
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <motion.aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 h-full flex flex-col transition-colors duration-500 transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${getSidebarStyles()}`}
        initial={false}
      >
        <div className="p-4 flex flex-col gap-4 h-full">
          {/* Header */}
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 px-2">
                <span className="font-light tracking-widest text-lg">{t.history}</span>
             </div>
             <button onClick={onClose} className="md:hidden p-2">
               <X className="w-5 h-5" />
             </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-300 border ${
              theme === Theme.DAYBREAK 
                ? 'border-slate-300 hover:bg-white/50 bg-white/30' 
                : 'border-white/10 hover:bg-white/10 bg-white/5'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium tracking-wide">{t.newChat}</span>
          </button>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto space-y-2 mt-4 no-scrollbar">
            <AnimatePresence initial={false}>
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="group relative"
                >
                  <button
                    onClick={() => {
                        onSelectSession(session.id);
                        if (window.innerWidth < 768) onClose();
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 ${getItemStyles(session.id === currentSessionId)}`}
                  >
                    <MessageSquare className="w-4 h-4 opacity-50 flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">
                        {getDisplayTitle(session)}
                      </p>
                      <p className="text-xs opacity-50 truncate mt-0.5">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  
                  {/* Delete Button (visible on hover) */}
                  <button
                    onClick={(e) => onDeleteSession(e, session.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {sessions.length === 0 && (
                <div className="text-center mt-10 opacity-40 text-sm">
                    {t.noHistory}
                </div>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
};
