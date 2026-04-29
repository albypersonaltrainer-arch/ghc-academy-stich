/*
  ARCHIVO: /components/common/AIChatWidget.tsx
  DESCRIPCIÓN: Widget flotante de IA con estilo industrial GHC Academy.
  FUNCIONALIDAD: Persuasión de ventas y resolución de dudas 24/7.
*/

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Zap } from 'lucide-react';

export const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: '¡Hola! Soy tu asistente de rendimiento en GHC Academy. Veo que estás explorando nuestros protocolos. ¿Sabías que los alumnos del NIVEL AVANZADO están logrando un 25% más de eficiencia en sus picos de potencia? ¿Te gustaría saber cómo desbloquear el acceso élite hoy mismo?' 
    }
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages([...messages, userMsg]);
    setInput('');

    // Simulación de respuesta de IA Persuasiva
    setTimeout(() => {
      const aiMsg = { 
        role: 'assistant', 
        content: 'Entiendo perfectamente. Basado en tu perfil, la integración de VBT y el análisis de HRV del nivel PRO es lo que marcará la diferencia. Tenemos una oferta limitada: si te unes ahora, incluimos el taller de Bioenergética Aplicada gratis.' 
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[10000] font-['Space_Grotesk']">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 md:w-96 h-[500px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
          >
            {/* HEADER INDUSTRIAL */}
            <div className="p-4 bg-orange-600 flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-2 text-black font-black uppercase text-xs italic tracking-widest">
                <div className="bg-black p-1 rounded-sm">
                  <Sparkles size={14} className="text-orange-600" />
                </div>
                IA ASISTENTE 24/7
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-black/70 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* ZONA DE MENSAJES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0c0e0f] custom-scrollbar">
              {messages.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 text-xs leading-relaxed font-medium ${
                    msg.role === 'user' 
                    ? 'bg-zinc-800 text-white rounded-2xl rounded-tr-none border border-zinc-700' 
                    : 'bg-zinc-900/50 border border-orange-600/20 text-zinc-300 rounded-2xl rounded-tl-none relative overflow-hidden'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="absolute top-0 right-0 p-1 opacity-10">
                        <Zap size={40} className="text-orange-600" />
                      </div>
                    )}
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* INPUT DE CHAT */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 backdrop-blur-sm flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Pregunta sobre el Método GHC..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-orange-600 transition-all placeholder:text-zinc-600"
              />
              <button 
                onClick={sendMessage} 
                className="bg-orange-600 p-3 rounded-xl text-black hover:bg-orange-500 transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,95,0,0.2)]"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTÓN FLOTANTE */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'bg-zinc-800 text-orange-600' : 'bg-orange-600 text-black'
        }`}
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-black shadow-md"
        >
          1
        </motion.div>
      </motion.button>
    </div>
  );
};
