import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, AlertTriangle, Bookmark, Loader2, Trash2, MessageSquare } from 'lucide-react';
import { api } from '../../services/api';
import { CitationModal } from '../../components/CitationModal';

function formatTutorContent(text) {
  if (!text) return '';
  return String(text)
    .replace(/\[Source:[^\]]*\]/gi, '')
    .replace(/\(Source:[^)]*\)/gi, '')
    .replace(/^(\s*)[*-]\s+/gm, '$1• ')
    .replaceAll('**', '')
    .replace(/(^|[\s(])\*([^*\n]+)\*([\s),.:;!?]|$)/g, '$1$2$3')
    .replace(/\*/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

export const TutorTab = ({ projectId, project }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadConversation();
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async () => {
    try {
      setLoading(true);
      const conv = await api.getConversation(projectId);
      setMessages(conv.messages || []);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);

    try {
      const res = await api.sendTutorMessage(projectId, userMsg);
      setMessages(prev => [...prev, res.message]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
        isUnsupported: true,
        citations: []
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear conversation history for this project?')) return;
    await api.clearConversation(projectId);
    loadConversation();
  };

  const suggestions = [
    `Explain the core concepts from my uploaded material`,
    `What are the key principles I should focus on for: ${project?.learningGoal?.slice(0, 50)}...`,
    `Create a simple analogy for the hardest concept in my notes`,
    `What topics from this material are most likely to appear in assessments?`
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">AI Study Tutor</h3>
            <p className="text-[11px] text-slate-400">Grounded in your uploaded project materials</p>
          </div>
        </div>
        <button
          onClick={handleClear}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          title="Clear conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Suggestion chips if conversation is short */}
            {messages.length <= 1 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs text-slate-500 font-semibold">Try asking:</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(s); }}
                      className="text-left text-xs p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:border-indigo-500/40 hover:text-indigo-300 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-indigo-400'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-md'
                      : msg.isUnsupported
                        ? 'bg-amber-950/50 border border-amber-500/30 text-amber-100 rounded-tl-md'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-md'
                  }`}>
                    {msg.isUnsupported && (
                      <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs font-bold uppercase tracking-wide">
                        <AlertTriangle className="w-4 h-4" /> Insufficient Evidence in Project Materials
                      </div>
                    )}
                    {formatTutorContent(msg.content)}
                  </div>

                  {/* Citations */}
                  {msg.citations?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((cit, ci) => (
                        <button
                          key={ci}
                          onClick={() => setSelectedCitation(cit)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition"
                        >
                          <Bookmark className="w-3 h-3" />
                          {cit.materialName?.split('.')[0] || 'Source'} · Page {cit.pageNumber}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Sending indicator */}
            {sending && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-slate-900/90 border border-slate-800">
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                    <span className="text-xs text-slate-400 ml-1">Retrieving evidence & composing answer...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="mt-4 flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question grounded in your uploaded materials..."
            className="w-full resize-none px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-lg shadow-indigo-600/30 shrink-0"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>

      {selectedCitation && (
        <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
      )}
    </div>
  );
};
