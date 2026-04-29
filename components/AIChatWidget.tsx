import React, { useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! ¿Tienes alguna duda sobre biomecánica o sobre nuestros cursos?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages([...messages, userMsg]);
    setInput('');
    
    // Aquí llamarías a tu endpoint de API /api/ai/chat
    // Simulamos respuesta
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo consulto con la base científica de GHC... Un momento.' }]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-orange-600 p-4 rounded-full shadow-2xl hover:scale-110 transition-transform text-black"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      ) : (
        <div className="w-80 h-[450px] bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center text-orange-600 font-black italic italic">
            <span>GHC AI ASSISTANT</span>
            <X className="w-4 h-4 cursor-pointer text-zinc-500" onClick={() => setIsOpen(false)} />
          </div>
          <div className="flex-1 p-4 overflow-y-auto text-xs space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`p-2 rounded-lg ${m.role === 'user' ? 'bg-zinc-800 ml-4' : 'bg-orange-600/10 mr-4 border border-orange-600/20'}`}>
                {m.content}
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-zinc-800 flex gap-2">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Haz una pregunta..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-600"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="bg-orange-600 p-2 rounded text-black"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
