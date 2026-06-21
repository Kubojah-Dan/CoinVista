import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Terminal, Square, Sparkles, MessageSquare } from 'lucide-react';
import { getOrRefreshAccessToken } from '../services/api';

const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:8000';

const AgentChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your CoinVista AI Trading Assistant. Ask me to analyze a coin, check sentiment, view your paper trading portfolio, or set up trades!',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState('');
  const chatEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTool]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setActiveTool('');

    // Prepare message history formatted for langchain (excluding the last user message we just added)
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = await getOrRefreshAccessToken();
      const response = await fetch(`${AGENT_URL}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          message: userMessage,
          history: history,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned code ${response.status}`);
      }

      // Add a placeholder message for the assistant
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep the last partial line

        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(cleaned.slice(6));

            if (data.type === 'token') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + data.content,
                  };
                }
                return updated;
              });
            } else if (data.type === 'tool_start') {
              setActiveTool(data.tool);
            } else if (data.type === 'tool_end') {
              setActiveTool('');
            } else if (data.type === 'error') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: `Error: ${data.content}`,
                  };
                }
                return updated;
              });
            }
          } catch (err) {
            console.error('Error parsing token json', err);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            if (last.content === '') {
              return updated.slice(0, -1);
            }
            return [
              ...updated.slice(0, -1),
              { ...last, content: last.content + ' [Execution stopped by user]' }
            ];
          }
          return updated;
        });
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Connection error: ${err.message}. Make sure the AI agent backend is running.` },
        ]);
      }
    } finally {
      setIsLoading(false);
      setActiveTool('');
      abortControllerRef.current = null;
    }
  };

  const handleSuggestion = (text) => {
    setInput(text);
  };

  // Helper to parse markdown bold syntax (**text**)
  const parseBold = (text) => {
    if (!text) return '';
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-extrabold text-gray-950 dark:text-white">{part}</strong>;
      }
      return part;
    });
  };

  // Custom inline markdown renderer for chat bubbles
  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className="text-xs font-bold text-primary dark:text-primary-focus mt-3 mb-1 uppercase tracking-wider">
            {trimmed.replace('###', '').trim()}
          </h4>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={idx} className="text-sm font-bold text-secondary dark:text-secondary-focus mt-3.5 mb-1.5">
            {trimmed.replace('##', '').trim()}
          </h3>
        );
      }
      if (trimmed.startsWith('#')) {
        return (
          <h2 key={idx} className="text-md font-extrabold text-gray-900 dark:text-gray-100 mt-4 mb-2">
            {trimmed.replace('#', '').trim()}
          </h2>
        );
      }
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        const content = trimmed.substring(1).trim();
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-gray-700 dark:text-gray-300 mb-1">
            {parseBold(content)}
          </li>
        );
      }
      if (trimmed.startsWith('>')) {
        return (
          <blockquote key={idx} className="border-l-2 border-primary bg-primary/5 p-2.5 my-2 italic rounded-r text-xs text-gray-600 dark:text-gray-400">
            {parseBold(trimmed.substring(1).trim())}
          </blockquote>
        );
      }
      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-1.5">
          {parseBold(line)}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[9999] flex flex-col items-end">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="btn btn-circle btn-primary btn-lg shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center bg-gradient-to-tr from-primary to-secondary border-none"
          id="agent-chat-trigger"
        >
          <MessageSquare className="h-6 w-6 text-white animate-pulse" />
        </button>
      )}

      {/* Re-engineered Chat Window */}
      {isOpen && (
        <div className="card w-[calc(100vw-2rem)] sm:w-[460px] h-[580px] sm:h-[680px] glass-card shadow-2xl border border-white/20 dark:border-white/10 flex flex-col rounded-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-primary via-secondary/90 to-secondary text-primary-content p-4 flex justify-between items-center shrink-0 border-b border-white/10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="avatar placeholder">
                <div className="bg-white/20 backdrop-blur-md rounded-full w-10 h-10 flex items-center justify-center border border-white/20">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1.5">
                  CoinVista AI Agent <Sparkles className="h-3.5 w-3.5 text-accent animate-bounce" />
                </h3>
                <span className="text-[10px] text-green-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-ping"></span>
                  Llama 3.3 70B Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="btn btn-ghost btn-circle btn-sm text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Pane */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-200/10 dark:bg-black/5 scrollbar-thin">
            {messages.map((msg, index) => (
              <div key={index} className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-image avatar placeholder">
                  <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center text-xs border border-base-300 dark:border-white/10 font-bold shadow-sm">
                    {msg.role === 'user' ? 'U' : <Bot className="h-4 w-4 text-primary" />}
                  </div>
                </div>
                <div
                  className={`chat-bubble text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-primary/85 to-secondary/85 text-white rounded-2xl rounded-tr-none border border-primary/20'
                      : 'bg-white/80 dark:bg-dark-100/90 border border-white/40 dark:border-white/5 backdrop-blur-md text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-none'
                  } px-4 py-2.5 max-w-[85%]`}
                >
                  {msg.content ? (
                    msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="space-y-1.5">{renderMarkdown(msg.content)}</div>
                    )
                  ) : (
                    isLoading && index === messages.length - 1 ? (
                      <div className="flex items-center gap-1 py-1">
                        <span className="loading loading-dots loading-xs text-primary"></span>
                      </div>
                    ) : ''
                  )}
                </div>
              </div>
            ))}

            {/* Active Tool Run Status */}
            {activeTool && (
              <div className="chat chat-start">
                <div className="chat-bubble chat-bubble-accent text-[11px] font-mono flex items-center gap-2 max-w-[85%] bg-accent/15 text-accent border border-accent/20 rounded-2xl rounded-tl-none">
                  <Terminal className="h-3.5 w-3.5 animate-spin" />
                  <span>Executing tool: {activeTool}...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions Horizontal Carousel */}
          {!isLoading && (
            <div className="px-3 py-2.5 bg-base-100/40 dark:bg-dark-200/40 border-t border-base-200/20 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
              {[
                { label: '📊 Analyze BTC/USDT', text: 'Analyze BTC/USDT on the daily chart' },
                { label: '💼 Check Portfolio', text: 'What is my simulator portfolio state?' },
                { label: '📈 Backtest RSI Strategy', text: 'Backtest RSI on BTC/USDT daily' },
                { label: '🔥 Market Sentiment', text: 'Show me the top sentiment crypto coins right now' },
                { label: '💰 Check Cash Balance', text: 'What is my current paper cash balance?' }
              ].map((sugg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestion(sugg.text)}
                  className="flex-shrink-0 btn btn-xs rounded-full bg-white/50 dark:bg-dark-100/50 hover:bg-primary hover:text-white dark:hover:bg-primary border border-base-300 dark:border-white/5 text-[11px] text-gray-700 dark:text-gray-300 shadow-sm font-semibold transition-all px-3 py-1"
                >
                  {sugg.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-white/70 dark:bg-dark-100/70 backdrop-blur-md border-t border-base-200/30 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Agent is running tools..." : "Ask the AI agent..."}
              disabled={isLoading}
              className="input input-bordered input-sm flex-1 focus:input-primary text-sm dark:bg-dark-200"
            />
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                className="btn btn-sm btn-error flex items-center justify-center shadow-md"
                title="Stop Agent"
              >
                <Square className="h-4 w-4 fill-white text-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="btn btn-sm btn-primary flex items-center justify-center bg-gradient-to-tr from-primary to-secondary border-none text-white shadow-md"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default AgentChat;
