import React, { useState, useRef, useEffect } from 'react';
import { chatWithAssistant } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

interface ChatAssistantProps {
  currentMode: string;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ currentMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Merhaba! Ben Arkeoloji Asistanınızım. Buluntular, haritalar veya kazı planları hakkında size nasıl yardımcı olabilirim?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleTrigger = (e: any) => {
      setIsOpen(true);
      if (e.detail?.image) {
        setSelectedImage(e.detail.image);
      }
      if (e.detail?.message) {
        setInput(e.detail.message);
      }
    };

    window.addEventListener('OPEN_ASSISTANT_WITH_CONTEXT', handleTrigger);
    return () => window.removeEventListener('OPEN_ASSISTANT_WITH_CONTEXT', handleTrigger);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const currentImage = selectedImage;
    setSelectedImage(null);
    setLoading(true);

    try {
      const response = await chatWithAssistant(input, currentImage || undefined, currentMode);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Bir hata oluştu, lütfen tekrar deneyin.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-arch-clay text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform border-4 border-arch-paper"
      >
        {isOpen ? (
          <span className="text-2xl">✕</span>
        ) : (
          <span className="text-2xl">🏺</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[400px] h-[600px] bg-arch-paper rounded-lg shadow-2xl border-2 border-arch-sand flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-arch-clay p-4 text-white flex justify-between items-center">
            <h3 className="font-serif font-bold tracking-tight">ARKEOLOJİ ASİSTANI</h3>
            <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full">AI GÜÇLENDİRİLMİŞ</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg shadow-sm ${
                    m.role === 'user'
                      ? 'bg-arch-clay text-white rounded-br-none'
                      : 'bg-white text-arch-dark border border-arch-sand rounded-bl-none'
                  }`}
                >
                  {m.image && (
                    <img src={m.image} alt="User Context" className="w-full h-32 object-cover rounded mb-2 border border-white/20" />
                  )}
                  <div className="markdown-body font-sans text-sm leading-relaxed">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg border border-arch-sand animate-pulse flex gap-2">
                  <div className="w-2 h-2 bg-arch-clay rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-arch-clay rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-arch-clay rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-arch-sand bg-white">
            {selectedImage && (
              <div className="relative inline-block mb-2">
                <img src={selectedImage} alt="Selected" className="h-16 w-16 object-cover rounded border-2 border-arch-clay" />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 bg-arch-sand/30 text-arch-clay rounded flex items-center justify-center hover:bg-arch-sand/50"
                title="Görsel Yükle"
              >
                📷
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Bir soru sorun veya görsel yükleyin..."
                className="flex-1 bg-arch-sand/20 border border-arch-sand p-2 rounded text-sm focus:outline-none focus:border-arch-clay"
              />
              <button
                onClick={handleSend}
                disabled={loading}
                className="w-10 h-10 bg-arch-clay text-white rounded flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
              >
                ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;
