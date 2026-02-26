
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, AlertCircle, Mic, Square, Copy, Check, ThumbsUp, ThumbsDown, Sparkles, Download, ArrowRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Theme, Message, Language } from '../types';
import { sendMessageToOrion } from '../services/orionService';

interface ChatInterfaceProps {
  theme: Theme;
  language: Language;
  messages: Message[];
  title?: string;
  onUpdateMessages: (newMessages: Message[]) => void;
  onExport?: () => void;
  backgroundImage?: string | null;
}

const TRANSLATIONS = {
  zh: {
    placeholder: "输入你的想法...",
    prompts: [
        "问我关于人生规划的问题...",
        "我可以帮你制定计划...",
        "我们可以聊聊你的目标...",
        "帮我分析现在的困境..."
    ],
    thinking: "思考中...",
    listening: "语音输入",
    stopListening: "停止录音",
    copy: "复制全部",
    helpful: "有帮助",
    notHelpful: "不认可",
    preview: "ORION AI PREVIEW",
    orionName: "Orion",
    welcomeTitle: "ORION",
    welcomeSubtitle: "AI Life Planning Interface",
    welcomeMessage: "我是您的个人 AI 规划助手。您可以问我关于人生规划的问题，或者让我帮您制定具体的行动计划。",
    errorGeneric: "Orion 迷失在太空中。请稍后重试。",
    errorSpeech: "语音识别失败，请重试",
    errorNoSpeech: "您的浏览器不支持语音输入功能。",
    export: "导出对话",
    suggestionsTitle: "你可以试着问我：",
    suggestions: [
      "制定一份年度成长计划",
      "如何寻找自己的人生使命？",
      "帮助我分解当前的目标",
      "面对焦虑该如何调整心态？"
    ]
  },
  en: {
    placeholder: "Type your thoughts...",
    prompts: [
        "Ask me about life planning...",
        "I can help you create a plan...",
        "Let's discuss your goals...",
        "Help me analyze my situation..."
    ],
    thinking: "Thinking...",
    listening: "Voice Input",
    stopListening: "Stop Recording",
    copy: "Copy All",
    helpful: "Helpful",
    notHelpful: "Not Helpful",
    preview: "ORION AI PREVIEW",
    orionName: "Orion",
    welcomeTitle: "ORION",
    welcomeSubtitle: "AI Life Planning Interface",
    welcomeMessage: "Your personal AI planning assistant. You can ask me about life planning, or let me help you create specific action plans.",
    errorGeneric: "Orion is lost in space. Please try again later.",
    errorSpeech: "Speech recognition failed, please try again.",
    errorNoSpeech: "Your browser does not support voice input.",
    export: "Export Chat",
    suggestionsTitle: "You can try asking:",
    suggestions: [
      "Create an annual growth plan",
      "How to find my life mission?",
      "Help me break down my goals",
      "How to deal with anxiety?"
    ]
  }
};

// Custom SVG Component for Orion Brain Logo
const OrionLogoSVG = ({ theme, size = "w-full h-full" }: { theme: Theme, size?: string }) => {
  const isDay = theme === Theme.DAYBREAK;
  const strokeColor = isDay ? "#334155" : "#E2E8F0"; 
  const nodeColor = isDay ? "#B45309" : "#FCD34D"; 
  
  return (
    <svg viewBox="0 0 100 100" className={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M50 88C38 88 28 82 22 72C16 62 16 50 22 40C25 35 32 32 38 32C40 22 48 16 58 16C68 16 76 22 80 30C88 32 92 40 92 50C92 65 82 80 68 86L64 88H50Z"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path 
        d="M32 52 C 42 42, 58 58, 68 48" 
        stroke={strokeColor} 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <circle cx="32" cy="52" r="5" fill={nodeColor} />
      <circle cx="50" cy="50" r="5" fill={nodeColor} />
      <circle cx="68" cy="48" r="5" fill={nodeColor} />
    </svg>
  );
};

// Processing Indicator Component (Bouncing Dots Bubble)
const ProcessingIndicator = ({ theme }: { theme: Theme }) => {
  const isDay = theme === Theme.DAYBREAK;
  const bubbleClass = isDay 
    ? 'bg-slate-100/80 border border-slate-200/50' 
    : 'bg-white/5 border border-white/5';
  const dotClass = isDay ? 'bg-slate-400' : 'bg-white/60';

  return (
    <div className={`px-4 py-3 rounded-2xl rounded-tl-none inline-flex items-center gap-1.5 backdrop-blur-sm ${bubbleClass}`}>
       {[0, 1, 2].map((i) => (
         <motion.div
           key={i}
           className={`w-1.5 h-1.5 rounded-full ${dotClass}`}
           initial={{ opacity: 0.4, y: 0 }}
           animate={{ 
             opacity: [0.4, 1, 0.4], 
             y: [0, -4, 0]
           }}
           transition={{
             duration: 1.2,
             repeat: Infinity,
             delay: i * 0.2,
             ease: "easeInOut"
           }}
         />
       ))}
    </div>
  );
};

interface MessageItemProps {
  msg: Message;
  theme: Theme;
  language: Language;
  onToggleFeedback: (id: string, type: 'like' | 'dislike') => void;
  getBubbleStyles: (role: 'user' | 'assistant') => string;
}

// --- Sub-component for individual messages ---
const MessageItem: React.FC<MessageItemProps> = ({ 
  msg, 
  theme,
  language,
  onToggleFeedback,
  getBubbleStyles 
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const isUser = msg.role === 'user';
  const t = TRANSLATIONS[language];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const formatTime = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Colors for text/icons based on theme
  const getTextColors = () => {
    if (theme === Theme.DAYBREAK) {
      return {
        body: 'text-slate-800',
        heading: 'text-slate-900',
        codeBg: 'bg-slate-100 border border-slate-200',
        link: 'text-blue-600',
        meta: 'text-slate-400 hover:text-slate-600',
        borderColor: 'border-slate-200'
      };
    } else {
      // Dark themes (Winter/Monsoon)
      return {
        body: 'text-slate-200',
        heading: 'text-white',
        codeBg: 'bg-black/30 border border-white/10',
        link: 'text-blue-300',
        meta: 'text-slate-500 hover:text-slate-300',
        borderColor: 'border-white/10'
      };
    }
  };

  const colors = getTextColors();

  // Custom Markdown Components for Styling - Optimized typography
  const MarkdownComponents = useMemo(() => ({
    // Adjusted line-height and margin for cleaner reading experience
    p: ({children}: any) => <p className={`mb-4 last:mb-0 leading-loose text-[16px] tracking-wide ${colors.body}`}>{children}</p>,
    strong: ({children}: any) => <strong className={`font-bold ${colors.heading}`}>{children}</strong>,
    em: ({children}: any) => <em className="italic opacity-90">{children}</em>,
    h1: ({children}: any) => <h1 className={`text-2xl font-bold mb-4 mt-6 first:mt-0 ${colors.heading} tracking-tight`}>{children}</h1>,
    h2: ({children}: any) => <h2 className={`text-xl font-bold mb-3 mt-5 ${colors.heading} tracking-tight`}>{children}</h2>,
    h3: ({children}: any) => <h3 className={`text-lg font-semibold mb-2 mt-4 ${colors.heading}`}>{children}</h3>,
    ul: ({children}: any) => <ul className={`list-disc pl-5 mb-4 space-y-2 ${colors.body}`}>{children}</ul>,
    ol: ({children}: any) => <ol className={`list-decimal pl-5 mb-4 space-y-2 ${colors.body}`}>{children}</ol>,
    li: ({children}: any) => <li className="pl-1 leading-loose">{children}</li>,
    
    // Improved code block styling
    pre: ({children}: any) => (
      <div className="relative group my-5">
        <pre className={`p-4 rounded-xl overflow-x-auto ${colors.codeBg} font-mono text-sm leading-6`}>
          {children}
        </pre>
      </div>
    ),
    code: ({children, className}: any) => {
        // Distinguish inline code vs block code via className presence usually, but ReactMarkdown structure handles pre > code.
        // This is primarily for inline code.
        return (
            <code className={`px-1.5 py-0.5 rounded text-[13px] font-mono ${colors.codeBg} ${colors.heading} ${className || ''}`}>
                {children}
            </code>
        );
    },

    blockquote: ({children}: any) => <blockquote className={`border-l-4 border-opacity-30 pl-4 italic my-4 ${theme === Theme.DAYBREAK ? 'border-slate-400' : 'border-white'} ${colors.body} opacity-80 py-1`}>{children}</blockquote>,
    a: ({href, children}: any) => <a href={href} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-4 decoration-1 ${colors.link} hover:opacity-80 transition-opacity`}>{children}</a>,
    
    // GFM Table Support
    table: ({children}: any) => <div className={`overflow-x-auto my-5 rounded-lg border ${colors.borderColor}`}><table className={`w-full text-left border-collapse ${colors.body}`}>{children}</table></div>,
    thead: ({children}: any) => <thead className={`${theme === Theme.DAYBREAK ? 'bg-slate-50' : 'bg-white/5'}`}>{children}</thead>,
    tbody: ({children}: any) => <tbody>{children}</tbody>,
    tr: ({children}: any) => <tr className={`border-b border-opacity-50 last:border-0 hover:bg-opacity-50 transition-colors ${colors.borderColor} ${theme === Theme.DAYBREAK ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}>{children}</tr>,
    th: ({children}: any) => <th className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider opacity-80 ${colors.heading}`}>{children}</th>,
    td: ({children}: any) => <td className="py-3 px-4 align-top opacity-90 text-sm leading-6">{children}</td>,
    del: ({children}: any) => <del className="opacity-60 decoration-current">{children}</del>,
    img: ({src, alt}: any) => <img src={src} alt={alt} className={`rounded-xl my-4 max-w-full shadow-md border ${colors.borderColor}`} />,
    hr: () => <hr className={`my-8 border-current opacity-10`} />,
  }), [theme, colors]);

  if (isUser) {
    // --- USER MESSAGE (Bubble Style) ---
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: 50, scale: 0.9 }} 
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="flex w-full justify-end group py-2"
      >
        <div className={`relative max-w-[85%] md:max-w-[70%] px-5 py-3.5 rounded-[2rem] rounded-tr-sm text-[15px] leading-7 tracking-wide whitespace-pre-wrap flex flex-col gap-1 shadow-sm ${getBubbleStyles('user')}`}>
          <div>{msg.content}</div>
          <div className={`text-[10px] text-right opacity-60 font-medium tracking-wider select-none flex items-center justify-end gap-2 mt-1`}>
             {/* Only Copy for User */}
             <button onClick={handleCopy} className="hover:opacity-100 transition-opacity" title="Copy">
                 {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
             </button>
             <span>{formatTime(msg.timestamp)}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // --- AI MESSAGE (Gemini Style) ---
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="flex w-full gap-4 md:gap-6 pr-2 md:pr-0 group py-4"
    >
      {/* Avatar Column - Sticky alignment for long messages */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center p-1.5 backdrop-blur-sm border shadow-sm transition-transform hover:scale-105
           ${theme === Theme.DAYBREAK ? 'bg-white/80 border-white/60 shadow-slate-200' : 'bg-white/10 border-white/10'}`}>
           <OrionLogoSVG theme={theme} />
        </div>
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Markdown Content Wrapper */}
        <div className="markdown-body w-full pt-0.5">
           <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
              {msg.content}
           </ReactMarkdown>
        </div>

        {/* Actions Footer - Gemini style: subtle icons below text */}
        <div className={`flex items-center gap-2 mt-3 select-none transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 translate-y-2 md:group-hover:translate-y-0`}>
          <button 
            onClick={handleCopy}
            className={`p-2 rounded-full transition-colors ${colors.meta} hover:bg-black/5 active:scale-95`}
            title={t.copy}
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={() => onToggleFeedback(msg.id, 'like')}
            className={`p-2 rounded-full transition-colors hover:bg-black/5 active:scale-95 ${msg.isLiked ? 'text-green-500 bg-green-500/10' : colors.meta}`}
            title={t.helpful}
          >
            <ThumbsUp className={`w-4 h-4 ${msg.isLiked ? 'fill-current' : ''}`} />
          </button>
          
          <button 
            onClick={() => onToggleFeedback(msg.id, 'dislike')}
            className={`p-2 rounded-full transition-colors hover:bg-black/5 active:scale-95 ${msg.isDisliked ? 'text-red-500 bg-red-500/10' : colors.meta}`}
            title={t.notHelpful}
          >
            <ThumbsDown className={`w-4 h-4 ${msg.isDisliked ? 'fill-current' : ''}`} />
          </button>

          <span className={`text-[10px] tracking-wider font-medium opacity-40 ml-2 ${colors.meta}`}>
            {formatTime(msg.timestamp)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  theme, 
  messages, 
  onUpdateMessages, 
  language, 
  backgroundImage,
  title,
  onExport
}) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const t = TRANSLATIONS[language];
  
  // Rotating Placeholder Logic
  const [placeholder, setPlaceholder] = useState(t.placeholder);

  useEffect(() => {
    // Reset immediately on language change
    setPlaceholder(t.placeholder);
    
    // Setup rotation
    const prompts = t.prompts;
    if (!prompts || prompts.length === 0) return;

    let index = 0;
    // Start with the first prompt after a delay, or rotate continuously
    const interval = setInterval(() => {
      setPlaceholder(prompts[index]);
      index = (index + 1) % prompts.length;
    }, 4000); // 4 seconds per prompt

    return () => clearInterval(interval);
  }, [language, t.placeholder, t.prompts]);


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (inputRef.current) {
        inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false; 
        recognition.lang = language === 'zh' ? 'zh-CN' : 'en-US'; 

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText((prev) => {
              const needsSpace = prev.length > 0 && !prev.endsWith(' ');
              return prev + (needsSpace ? ' ' : '') + transcript;
          });
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
             setError(t.errorSpeech);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [language, t.errorSpeech]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError(t.errorNoSpeech);
      return;
    }
    
    // Update language dynamically before starting
    recognitionRef.current.lang = language === 'zh' ? 'zh-CN' : 'en-US';

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Speech recognition already started");
      }
    }
  };

  const handleSend = async (manualInput?: string | React.MouseEvent | unknown) => {
    // Check if manualInput is a string (passed from chips)
    const isManualString = typeof manualInput === 'string';
    const textToUse = isManualString ? manualInput : inputText;
    
    if (!textToUse.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToUse,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMsg];
    onUpdateMessages(updatedMessages);
    
    // Only clear input if we sent FROM the input box
    if (!isManualString) {
        setInputText('');
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const responseText = await sendMessageToOrion(userMsg.content, updatedMessages);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      };
      
      onUpdateMessages([...updatedMessages, aiMsg]);
    } catch (err: any) {
      console.error("Orion Connection Error:", err);
      let displayError = err.message;
      if (language === 'en' && displayError.includes("服务器繁忙")) {
          displayError = t.errorGeneric;
      } else if (!displayError) {
          displayError = t.errorGeneric;
      }
      setError(displayError);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Likes/Dislikes
  const handleToggleFeedback = (id: string, type: 'like' | 'dislike') => {
    const updatedMessages = messages.map(msg => {
      if (msg.id !== id) return msg;

      // Toggle logic
      if (type === 'like') {
        return { 
          ...msg, 
          isLiked: !msg.isLiked, 
          isDisliked: false // mutually exclusive
        };
      } else {
        return { 
          ...msg, 
          isDisliked: !msg.isDisliked, 
          isLiked: false // mutually exclusive
        };
      }
    });
    onUpdateMessages(updatedMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Theme-specific styles
  const getBubbleStyles = (role: 'user' | 'assistant') => {
    if (role === 'user') {
      switch (theme) {
        case Theme.WINTER: return 'bg-slate-700/80 text-white';
        case Theme.MONSOON: return 'bg-slate-800/80 text-blue-50';
        case Theme.DAYBREAK: return 'bg-[#E5DCCA] text-slate-800 border border-[#D8Cebd]'; 
        default: return 'bg-gray-700 text-white';
      }
    }
    // Assistant uses full width markdown, this is mostly for user bubbles now or fallback
    return '';
  };

  const getTextColor = () => {
    switch (theme) {
      case Theme.DAYBREAK: return 'text-slate-800 placeholder-slate-500/50';
      default: return 'text-white placeholder-slate-400/50';
    }
  };

  const getInputStyles = () => {
    switch (theme) {
      case Theme.WINTER: return 'bg-white/10 border-white/20 focus:border-white/50 text-white';
      case Theme.MONSOON: return 'bg-slate-800/50 border-slate-600 focus:border-teal-400 text-white';
      case Theme.DAYBREAK: return 'bg-white/80 border-[#D1C7B7] focus:border-[#8B7E66] text-slate-800';
      default: return 'bg-gray-800 border-gray-700';
    }
  };

  const getMicActiveColor = () => {
    switch (theme) {
      case Theme.DAYBREAK: return 'text-red-500 bg-red-100/50';
      case Theme.MONSOON: return 'text-teal-300 bg-teal-900/50';
      default: return 'text-red-400 bg-red-900/30';
    }
  };

  const getRippleColor = () => {
    switch (theme) {
      case Theme.DAYBREAK: return 'bg-red-500';
      case Theme.MONSOON: return 'bg-teal-400';
      default: return 'bg-red-500';
    }
  };
  
  const getHeaderStyles = () => {
      switch(theme) {
          case Theme.DAYBREAK: return 'border-slate-300/30 bg-white/30 text-slate-800';
          default: return 'border-white/10 bg-black/10 text-white';
      }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto z-10 relative">
      
      {/* Background Layer */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 z-[-1] bg-cover bg-center transition-opacity duration-500 rounded-3xl overflow-hidden opacity-30 pointer-events-none" 
          style={{ backgroundImage: `url(${backgroundImage})` }} 
        >
            <div className={`absolute inset-0 ${theme === Theme.DAYBREAK ? 'bg-white/20' : 'bg-black/20'}`} />
        </div>
      )}

      {/* Chat Header */}
      <div className={`flex items-center justify-between px-4 py-3 md:px-6 backdrop-blur-md border-b ${getHeaderStyles()}`}>
         <div className="flex items-center gap-3 pl-10 md:pl-0 overflow-hidden">
             {/* Simple Title */}
             <span className="font-medium tracking-wide truncate max-w-[200px] md:max-w-md opacity-80 text-sm">
                {title || (language === 'zh' ? '新对话' : 'New Chat')}
             </span>
         </div>
         
         {onExport && (
             <button
               onClick={onExport}
               disabled={messages.length === 0}
               className={`p-2 rounded-lg transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed
                 ${theme === Theme.DAYBREAK ? 'hover:bg-slate-200/50 text-slate-600' : 'hover:bg-white/10 text-slate-300'}
               `}
               title={t.export}
             >
                <Download className="w-4 h-4" />
             </button>
         )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 no-scrollbar pb-36">
        {messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className={`flex flex-col items-center justify-center min-h-[60vh] transition-colors duration-500 ${theme === Theme.DAYBREAK ? 'text-slate-600' : 'text-slate-300'}`}
          >
            {/* Animated Welcome Emoji */}
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-7xl mb-6 select-none"
            >
                <motion.div
                    animate={{ rotate: [0, 14, -8, 14, -4, 10, 0, 0] }}
                    transition={{
                        duration: 2.5,
                        ease: "easeInOut",
                        times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1],
                        repeat: Infinity,
                        repeatDelay: 3
                    }}
                    style={{ originX: 0.7, originY: 0.7 }}
                >
                    👋
                </motion.div>
            </motion.div>

            <h1 className="text-5xl font-light tracking-[0.2em] mb-8 font-sans">{t.welcomeTitle}</h1>
            
            {/* Logo Container */}
            <div className={`p-8 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 backdrop-blur-sm shadow-2xl transition-all duration-500 group hover:scale-105 ${theme === Theme.DAYBREAK ? 'shadow-slate-400/20' : 'shadow-black/20'}`}>
                <div className="w-32 h-32 opacity-90 drop-shadow-lg">
                   <OrionLogoSVG theme={theme} />
                </div>
            </div>
            
            <p className="mt-10 text-xs tracking-[0.3em] opacity-40 font-light uppercase flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> {t.welcomeSubtitle}
            </p>

            <p className="mt-4 text-sm opacity-60 font-light max-w-xs text-center leading-6">
                {t.welcomeMessage}
            </p>

            {/* Suggestions Chips */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="mt-12 w-full max-w-2xl px-6"
            >
              <div className={`text-center mb-4 text-xs tracking-widest uppercase opacity-40 ${theme === Theme.DAYBREAK ? 'text-slate-500' : 'text-slate-300'}`}>
                {t.suggestionsTitle}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {t.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(suggestion)}
                    className={`group p-3 rounded-xl text-sm text-left transition-all duration-200 border backdrop-blur-sm flex items-center justify-between
                      ${theme === Theme.DAYBREAK 
                        ? 'bg-white/40 border-slate-200/50 hover:bg-white/60 text-slate-700 hover:shadow-sm' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white'
                      }
                    `}
                  >
                    <span>{suggestion}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0 transition-all duration-300" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
        
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageItem 
              key={msg.id} 
              msg={msg} 
              theme={theme}
              language={language}
              getBubbleStyles={getBubbleStyles}
              onToggleFeedback={handleToggleFeedback}
            />
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="flex w-full gap-4 md:gap-6 pr-2 md:pr-0 group py-4"
          >
            <div className="flex-shrink-0 flex flex-col items-center mt-0.5">
                 {/* Pulsing Aura */}
                 <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.5, 0], scale: [1, 1.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute inset-0 rounded-full ${theme === Theme.DAYBREAK ? 'bg-slate-400' : 'bg-white'}`}
                 />
                <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center p-1.5 backdrop-blur-sm border shadow-sm mt-1 z-10 relative
                   ${theme === Theme.DAYBREAK ? 'bg-white/80 border-white/60 shadow-slate-200' : 'bg-white/10 border-white/10'}`}>
                   <OrionLogoSVG theme={theme} />
                </div>
            </div>
            <div className="flex flex-col items-start gap-1">
               <ProcessingIndicator theme={theme} />
               <span className={`text-[10px] uppercase tracking-widest font-medium ml-1 opacity-40 ${theme === Theme.DAYBREAK ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t.thinking}
               </span>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="flex justify-center my-4"
          >
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm backdrop-blur-md">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </motion.div>
        )}
        
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-black/5 to-transparent">
        <div className="max-w-3xl mx-auto relative group">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full rounded-[1.5rem] pl-6 pr-24 py-4 resize-none outline-none border backdrop-blur-md shadow-2xl transition-all duration-300 ${getInputStyles()} ${getTextColor()} placeholder-opacity-50`}
            rows={1}
            style={{ minHeight: '64px', maxHeight: '200px' }}
          />
          
          <div className="absolute right-3 bottom-3 flex gap-2">
            {/* Voice Input Button */}
            <div className="relative flex items-center justify-center">
              <AnimatePresence>
                {isListening && (
                  <>
                    {[0, 1].map((index) => (
                      <motion.div
                        key={`ripple-${index}`}
                        initial={{ opacity: 0.6, scale: 1 }}
                        animate={{ opacity: 0, scale: 2.5 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: index * 0.6,
                          ease: "easeOut"
                        }}
                        className={`absolute inset-0 rounded-full ${getRippleColor()}`}
                        style={{ zIndex: 0 }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>

              <motion.button
                onClick={toggleListening}
                animate={isListening ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={isListening ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                className={`p-2.5 rounded-full transition-all duration-300 relative z-10 overflow-hidden flex items-center justify-center
                  ${isListening 
                    ? `${getMicActiveColor()} ring-1 ring-current shadow-lg`
                    : (theme === Theme.DAYBREAK ? 'bg-transparent text-slate-500 hover:bg-slate-200/50' : 'bg-transparent text-white/50 hover:bg-white/10')
                  }
                `}
                title={isListening ? t.stopListening : t.listening}
              >
                <AnimatePresence mode='wait'>
                  {isListening ? (
                      <motion.div
                          key="mic-listening"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                      >
                          <Square className="w-5 h-5 fill-current" />
                      </motion.div>
                  ) : (
                      <motion.div
                          key="mic-idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                      >
                          <Mic className="w-5 h-5" />
                      </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isLoading || !inputText.trim()}
              className={`p-2.5 rounded-full transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed
                ${theme === Theme.DAYBREAK ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-900 hover:bg-white/90'}
              `}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className={`text-center mt-2 text-[10px] tracking-widest opacity-30 ${theme === Theme.DAYBREAK ? 'text-black' : 'text-white'}`}>
            {t.preview}
        </div>
      </div>
    </div>
  );
};
