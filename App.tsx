
import React, { useState, useEffect, useRef } from 'react';
import { Snowflake, CloudRain, Sun, Menu, Globe, Download, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Theme, ChatSession, Message, Language } from './types';
import { Atmosphere } from './components/Atmosphere';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(Theme.DAYBREAK);
  const [language, setLanguage] = useState<Language>('zh');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [bgImage, setBgImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to create a session object (used in init and handler)
  const createSessionObject = (lang: Language) => ({
      id: Date.now().toString(),
      title: lang === 'zh' ? '✨ 新对话' : '✨ New Chat',
      messages: [],
      updatedAt: Date.now()
  });

  const createNewSession = () => {
    const newSession = createSessionObject(language);
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  // Initialize Sessions and Background from LocalStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('orion_sessions');
    const savedSessionId = localStorage.getItem('orion_current_session_id');
    const savedBg = localStorage.getItem('orion_bg_image');

    if (savedBg) {
        setBgImage(savedBg);
    }

    let loadedSessions: ChatSession[] = [];
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed)) {
            loadedSessions = parsed;
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }

    if (loadedSessions.length > 0) {
      setSessions(loadedSessions);
      // Restore selected session or default to first
      if (savedSessionId && loadedSessions.some(s => s.id === savedSessionId)) {
        setCurrentSessionId(savedSessionId);
      } else {
        setCurrentSessionId(loadedSessions[0].id);
      }
    } else {
      // No saved sessions, create a default one
      const newSession = createSessionObject('zh'); // Default language for init
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
    }

    setIsInitialized(true);
  }, []); // Run once on mount

  // Auto-save sessions whenever they change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('orion_sessions', JSON.stringify(sessions));
      } catch (e) {
        console.error("Failed to save sessions to localStorage (likely quota exceeded)", e);
      }
    }
  }, [sessions, isInitialized]);

  // Auto-save current session selection
  useEffect(() => {
    if (isInitialized && currentSessionId) {
        localStorage.setItem('orion_current_session_id', currentSessionId);
    }
  }, [currentSessionId, isInitialized]);

  // Update PWA Theme Color based on selected theme
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      let color = '#FFF8E7'; // Default Daybreak
      if (theme === Theme.WINTER) color = '#0f172a'; // Slate 900
      if (theme === Theme.MONSOON) color = '#334155'; // Slate 700
      metaThemeColor.setAttribute('content', color);
    }
  }, [theme]);

  const updateCurrentMessages = (newMessages: Message[]) => {
    if (!currentSessionId) return;

    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        let newTitle = session.title;
        // Auto-generate title from first message if title is default (or starts with default emoji)
        const isDefaultTitle = session.title === '✨ 新对话' || session.title === '✨ New Chat' || session.messages.length === 0;
        
        if (isDefaultTitle && newMessages.length > 0) {
            const firstMsg = newMessages[0].content;
            newTitle = firstMsg.slice(0, 20) + (firstMsg.length > 20 ? '...' : '');
        }

        return {
          ...session,
          messages: newMessages,
          title: newTitle,
          updatedAt: Date.now()
        };
      }
      return session;
    }));
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (newSessions.length === 0) {
        createNewSession();
    } else if (currentSessionId === id) {
        // If deleting current, switch to the first available
        setCurrentSessionId(newSessions[0].id);
    }
  };

  const getCurrentMessages = () => {
    const session = sessions.find(s => s.id === currentSessionId);
    return session ? session.messages : [];
  };
  
  const getCurrentSessionTitle = () => {
    const session = sessions.find(s => s.id === currentSessionId);
    return session ? session.title : '';
  };

  const toggleTheme = (selectedTheme: Theme) => {
    setTheme(selectedTheme);
  };

  const handleExportSession = () => {
    const messages = getCurrentMessages();
    if (messages.length === 0) return;
    
    const session = sessions.find(s => s.id === currentSessionId);
    const title = session?.title || (language === 'zh' ? '未命名对话' : 'Untitled Session');
    
    // Build Text Content
    let content = `Orion AI Chat Export\n`;
    content += `Session: ${title}\n`;
    content += `Date: ${new Date().toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}\n`;
    content += `----------------------------------------\n\n`;

    messages.forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
      const role = msg.role === 'user' ? 'User' : 'Orion';
      content += `[${time}] ${role}:\n${msg.content}\n\n`;
    });

    // Generate and Download File
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Orion-Chat-${title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').slice(0, 30)}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic size check (e.g. 2MB limit for localStorage safety)
      if (file.size > 2 * 1024 * 1024) {
        alert(language === 'zh' ? '图片太大，请上传小于 2MB 的图片' : 'Image too large. Please upload an image smaller than 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        try {
            localStorage.setItem('orion_bg_image', result);
            setBgImage(result);
        } catch (error) {
            console.error('Storage full:', error);
            alert(language === 'zh' ? '无法保存背景图片（存储空间不足）。' : 'Could not save background image (Storage full).');
        }
      };
      reader.readAsDataURL(file);
      
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
    }
  };

  const themeOptions = [
    { id: Theme.WINTER, icon: Snowflake, label: 'Winter' },
    { id: Theme.MONSOON, icon: CloudRain, label: 'Monsoon' },
    { id: Theme.DAYBREAK, icon: Sun, label: 'Daybreak' },
  ];

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans flex">
      
      {/* 1. Background Atmosphere Layer */}
      <Atmosphere theme={theme} />

      {/* 2. Sidebar */}
      <Sidebar 
        theme={theme}
        language={language}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewSession}
        onSelectSession={setCurrentSessionId}
        onDeleteSession={deleteSession}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* 3. Main Content Layer */}
      <div className="relative z-10 flex-1 h-full flex flex-col min-w-0">
        
        {/* Header / Controls */}
        <header className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-50 pointer-events-none">
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className={`md:hidden pointer-events-auto p-2 rounded-lg backdrop-blur-sm bg-white/10 ${theme === Theme.DAYBREAK ? 'text-slate-800' : 'text-white'}`}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Controls Pill */}
          <div className="pointer-events-auto flex items-center gap-1 backdrop-blur-md bg-black/5 rounded-full p-1 border border-white/10 shadow-lg ml-auto relative">
            
            {/* Background Image Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`relative z-10 p-2.5 rounded-full transition-colors duration-300 outline-none ${
                theme === Theme.DAYBREAK ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={language === 'zh' ? '设置背景图片' : 'Set Background Image'}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*"
            />

            <div className={`w-[1px] h-4 ${theme === Theme.DAYBREAK ? 'bg-slate-400' : 'bg-white'} opacity-20`} />

            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(l => l === 'zh' ? 'en' : 'zh')}
              className={`relative z-10 px-3 py-2 rounded-full transition-colors duration-300 outline-none text-[10px] font-bold tracking-widest uppercase ${
                theme === Theme.DAYBREAK ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={language === 'zh' ? 'Switch to English' : '切换到中文'}
            >
              {language === 'zh' ? 'EN' : '中'}
            </button>

            <div className={`w-[1px] h-4 ${theme === Theme.DAYBREAK ? 'bg-slate-400' : 'bg-white'} opacity-20`} />

            {themeOptions.map((option) => {
              const isActive = theme === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => toggleTheme(option.id)}
                  className={`relative z-10 p-2.5 rounded-full transition-colors duration-300 outline-none ${
                    isActive 
                      ? (theme === Theme.DAYBREAK ? 'text-slate-800' : 'text-white') 
                      : (theme === Theme.DAYBREAK ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200')
                  }`}
                  title={option.label}
                >
                  <Icon className="w-5 h-5 relative z-20" />
                  {isActive && (
                    <motion.div
                      layoutId="active-theme-pill"
                      className={`absolute inset-0 rounded-full -z-10 shadow-sm ${
                         theme === Theme.DAYBREAK ? 'bg-white' : 'bg-white/15'
                      }`}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {/* Chat Interface */}
        <main className="flex-1 w-full h-full pt-16 md:pt-0 relative">
          <ChatInterface 
            key={currentSessionId} 
            theme={theme} 
            language={language}
            messages={getCurrentMessages()}
            title={getCurrentSessionTitle()}
            onUpdateMessages={updateCurrentMessages}
            onExport={handleExportSession}
            backgroundImage={bgImage}
          />
        </main>
      </div>

    </div>
  );
};

export default App;
