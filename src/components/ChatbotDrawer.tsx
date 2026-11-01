import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Leaf } from 'lucide-react';
import { EventDetails, ChatMessage } from '../types';
import { sendChatMessage } from '../services/api';

interface ChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventDetails;
}

export const ChatbotDrawer: React.FC<ChatbotDrawerProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `שלום וברוכים הבאים! אני שיר, העוזרת הדיגיטלית של בת המצווה של ${event.celebrantName} (משפחת קלזן). אשמח לסייע בכל שאלה לגבי הגעה לקרני שומרון, שעות, קוד לבוש או הצעות לניסוח ברכות חמות!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const formattedHistory = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await sendChatMessage(formattedHistory);

      const assistantMessage: ChatMessage = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: 'חלה שגיאה זמנית בתקשורת. אנא נסו לשאול שוב.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    'איך מגיעים לאולם בית הכנסת ישראל הצעיר?',
    'מה קוד הלבוש המומלץ?',
    'מה לוח הזמנים של האירוע?',
    'עזרה בניסוח ברכה יפה לאורי',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/50 backdrop-blur-xs flex justify-end">
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-r border-[#D5E1D3] animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-[#303B2E] p-4 text-white flex items-center justify-between border-b border-[#435240]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white border border-white/20">
              <Bot className="w-5 h-5 text-[#C4D7C1]" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5 font-['Rubik',sans-serif]">
                <span>שיר · עוזרת בת המצווה</span>
                <Leaf className="w-3.5 h-3.5 text-[#B6D1B2]" />
              </h3>
              <p className="text-[11px] text-[#C4D7C1]">
                מענה מהיר לשאלות המוזמנים
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="סגירה"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable messages thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF7F2]">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${
                  isUser ? 'mr-auto flex-row-reverse text-left' : 'ml-auto text-right'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isUser
                      ? 'bg-stone-800 text-white'
                      : 'bg-[#435940] text-white shadow-xs'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div>
                  <div
                    className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#2E362C] text-white rounded-tl-xs'
                        : 'bg-white text-stone-800 border border-[#E0EAE0] shadow-xs rounded-tr-xs'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="block text-[10px] text-stone-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-stone-500 text-xs py-2 px-3 bg-white rounded-xl w-fit border border-stone-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#435940]" />
              <span>שיר מקלידה תשובה...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions suggestion chips */}
        <div className="p-2.5 bg-white border-t border-[#E6EFE5] overflow-x-auto flex gap-1.5 no-scrollbar">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full bg-[#FAF7F2] hover:bg-[#EEF4EC] text-[#3B4D38] border border-[#D5E1D3] transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message Input Footer */}
        <div className="p-3 bg-white border-t border-stone-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="שאלו כל שאלה לגבי האירוע..."
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 focus:border-[#435940] focus:ring-2 focus:ring-[#435940]/20 outline-none transition-all text-right"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-[#435940] hover:bg-[#344732] text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer shrink-0"
              aria-label="שלח הודעה"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
