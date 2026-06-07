import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Terminal, Square } from 'lucide-react';
import { getOrRefreshAccessToken } from '../services/api';

const AGENT_URL = process.env.REACT_APP_AGENT_URL || 'http://localhost:8000';

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

  return (
    <div className="fixed bottom-28 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="btn btn-circle btn-primary btn-lg shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center gap-2"
          id="agent-chat-trigger"
        >
          <Bot className="h-6 w-6 text-white animate-pulse" />
        </button>
      )}

      {/* Chat Drawer */}
      {isOpen && (
        <div className="card w-[calc(100vw-2rem)] sm:w-[420px] h-[450px] sm:h-[550px] bg-base-100 shadow-2xl border border-base-200 flex flex-col rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="bg-primary text-primary-content p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <div className="avatar placeholder">
                <div className="bg-primary-focus text-neutral-content rounded-full w-8 h-8 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">CoinVista Trading AI</h3>
                <span className="text-xs text-green-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-ping"></span>
                  Llama 3 70B Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="btn btn-ghost btn-circle btn-sm text-white hover:bg-primary-focus"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-200/50">
            {messages.map((msg, index) => (
              <div key={index} className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                <div className={`chat-image avatar placeholder`}>
                  <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center text-xs">
                    {msg.role === 'user' ? 'U' : <Bot className="h-4 w-4" />}
                  </div>
                </div>
                <div
                  className={`chat-bubble text-sm ${
                    msg.role === 'user' ? 'chat-bubble-primary text-white' : 'chat-bubble-base'
                  } whitespace-pre-wrap`}
                >
                  {msg.content || (isLoading && index === messages.length - 1 ? 'Thinking...' : '')}
                </div>
              </div>
            ))}

            {/* Active Tool Run Status */}
            {activeTool && (
              <div className="chat chat-start">
                <div className="chat-bubble chat-bubble-accent text-xs font-mono flex items-center gap-2 max-w-[85%] bg-accent/15 text-accent border border-accent/20">
                  <Terminal className="h-3 w-3 animate-spin" />
                  <span>Invoking tool: {activeTool}...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length === 1 && (
            <div className="p-3 bg-base-100 flex flex-wrap gap-2 justify-center shrink-0 border-t border-base-200">
              <button
                onClick={() => handleSuggestion('Analyze BTC on the daily chart')}
                className="btn btn-xs btn-outline btn-neutral"
              >
                Analyze BTC Daily
              </button>
              <button
                onClick={() => handleSuggestion('What is my portfolio state?')}
                className="btn btn-xs btn-outline btn-neutral"
              >
                Check Portfolio
              </button>
              <button
                onClick={() => handleSuggestion('Show me top sentiment crypto')}
                className="btn btn-xs btn-outline btn-neutral"
              >
                Top Sentiment
              </button>
            </div>
          )}

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-base-100 border-t border-base-200 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Agent is processing..." : "Ask the AI agent..."}
              disabled={isLoading}
              className="input input-bordered input-sm flex-1"
            />
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                className="btn btn-sm btn-error flex items-center justify-center"
                title="Stop Agent"
              >
                <Square className="h-4 w-4 fill-white text-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="btn btn-sm btn-primary flex items-center justify-center"
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
