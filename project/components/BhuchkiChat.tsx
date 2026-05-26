'use client';

import React, { useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { Sparkles, Send, Bot, User } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useAuth } from '@/lib/auth-context';

export default function BhuchkiChat({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { session } = useAuth();
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/bhuchki',
    headers: {
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] flex flex-col bg-slate-50 dark:bg-[#121212]">
        <DrawerHeader className="border-b bg-white dark:bg-[#1C1C1C]">
          <DrawerTitle className="flex items-center gap-2 text-[#2A4365] dark:text-blue-400">
            <Sparkles size={20} className="text-yellow-500" />
            Bhuchki - Your Family Companion
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto w-full p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-2 opacity-60">
              <Bot size={48} className="text-[#2A4365]" />
              <p>Hi, I am Bhuchki!</p>
              <p className="text-sm">I can help you navigate Aangan, manage memories, send messages, or find family connections.</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${m.role === 'user' ? 'bg-[#2A4365] text-white rounded-br-none' : 'bg-white dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-200 border shadow-sm rounded-bl-none'}`}>
                <p className="whitespace-pre-wrap text-[15px]">{m.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white dark:bg-[#1e1e1e] border shadow-sm rounded-bl-none text-gray-400">
                <Spinner />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white dark:bg-[#1c1c1c] border-t">
          <form onSubmit={handleSubmit} className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask Bhuchki something..."
              className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#2c2c2c] px-4 py-3 text-[15px] focus:outline-none focus:border-[#2A4365]"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[#2A4365] text-white p-3 rounded-full hover:bg-[#1e3450] disabled:opacity-50 transition-colors shrink-0"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Spinner() {
  return (
    <div className="flex gap-1 items-center justify-center h-4">
      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}