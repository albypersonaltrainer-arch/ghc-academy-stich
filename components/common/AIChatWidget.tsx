'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot } from 'lucide-react';

export const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy STITCH 2.0. ¿En qué puedo ayudarte con tu formación hoy?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    // Aquí se conectará con tu API de OpenAI más adelante
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Entendido. Estoy procesando tu consulta sobre biomecánica...' }]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-80 md:w-96 bg-[#1a1c1e] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header del Chat */}
            <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-600 rounded-lg">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-none">STITCH 2.0</h4>
                  <span className="text-[10px] text-orange-500 uppercase tracking-widest">AI Assistant</span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo del Chat */}
            <div className="h-80 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[#121415]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                    msg.role === 'user' 
                      ? 'bg-orange-600 text-white rounded-tr-none' 
                      : 'bg-zinc-800 text-zinc-300 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input del Chat */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800">
              <div className="relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Pregunta algo..."
                  className="w-full bg-[#121415] border border-zinc-800 rounded-xl py-2 px-4 text-xs text-white focus:outline-none focus:border-orange-600 transition-colors"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-1.5 p-1 text-orange-600 hover:text-orange-500"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón Flotante */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-orange-600 p-4 rounded-2xl shadow-lg hover:bg-orange-500 transition-colors flex items-center justify-center text-white"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </div>
  );
};
