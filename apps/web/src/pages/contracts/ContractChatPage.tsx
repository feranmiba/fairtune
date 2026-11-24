import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { negotiationApi } from '../../api/negotiation.api';
import { documentsApi } from '../../api/documents.api';
import { AIConversationDto, AIMessageDto, DocumentDto, AIMessageSender } from '@fairtune/shared';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { Badge } from '../../design-system/Badge';
import { Alert } from '../../design-system/Alert';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  BookOpen,
  ArrowLeft,
  Loader2,
  Plus,
} from 'lucide-react';

export const ContractChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get('docId') || '';

  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId);
  const [conversations, setConversations] = useState<AIConversationDto[]>([]);
  const [activeConversation, setActiveConversation] = useState<
    (AIConversationDto & { messages: AIMessageDto[] }) | null
  >(null);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const docs = await documentsApi.list();
        setDocuments(docs);

        const convs = await negotiationApi.listConversations();
        setConversations(convs);

        if (convs.length > 0) {
          const first = await negotiationApi.getConversation(convs[0].id);
          setActiveConversation(first);
          if (first.documentId) setSelectedDocId(first.documentId);
        } else if (docs.length > 0) {
          const docId = initialDocId || docs[0].id;
          const newConv = await negotiationApi.createConversation(
            docId,
            `Contract Q&A: ${docs.find((d) => d.id === docId)?.title || 'Contract'}`,
          );
          setConversations([newConv]);
          const loaded = await negotiationApi.getConversation(newConv.id);
          setActiveConversation(loaded);
          setSelectedDocId(docId);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to initialize assistant');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [initialDocId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleSelectConversation = async (convId: string) => {
    setIsLoading(true);
    try {
      const full = await negotiationApi.getConversation(convId);
      setActiveConversation(full);
      if (full.documentId) setSelectedDocId(full.documentId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = async () => {
    if (!selectedDocId) {
      setError('Please select a contract document first.');
      return;
    }
    const doc = documents.find((d) => d.id === selectedDocId);
    try {
      const newConv = await negotiationApi.createConversation(
        selectedDocId,
        `Q&A: ${doc?.title || 'Contract'} (${new Date().toLocaleDateString()})`,
      );
      setConversations((prev) => [newConv, ...prev]);
      const loaded = await negotiationApi.getConversation(newConv.id);
      setActiveConversation(loaded);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create conversation');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversation || isSending) return;

    const content = messageInput.trim();
    setMessageInput('');
    setIsSending(true);
    setError(null);

    // Optimistic user message render
    const optimisticMsg: AIMessageDto = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversation.id,
      sender: AIMessageSender.USER,
      content,
      role: 'user',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      createdAt: new Date().toISOString(),
    };

    setActiveConversation((prev) =>
      prev ? { ...prev, messages: [...(prev.messages || []), optimisticMsg] } : null,
    );

    try {
      await negotiationApi.sendMessage(activeConversation.id, content);
      // Reload full conversation to get assistant response & citations
      const updated = await negotiationApi.getConversation(activeConversation.id);
      setActiveConversation(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/contracts">
            <Button size="sm" variant="ghost" className="p-2 h-auto">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-gold" />
              AI Contract Assistant
            </h1>
            <p className="text-xs text-slate-400">
              Ask specific questions about clauses, recoupment terms, and copyright ownership.
            </p>
          </div>
        </div>

        {/* Contract Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="bg-surface text-slate-200 border border-border-subtle rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:border-brand-stellar"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleNewConversation}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Thread
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Assistant Error">
          {error}
        </Alert>
      )}

      {/* Chat Workspace */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Thread History */}
        <div className="hidden md:flex flex-col w-64 border border-border-subtle rounded-xl bg-surface p-3 shrink-0 overflow-y-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Conversation Threads
          </span>
          <div className="space-y-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectConversation(c.id)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors truncate ${
                  activeConversation?.id === c.id
                    ? 'bg-brand-gold-subtle text-brand-gold font-semibold border border-brand-gold/20'
                    : 'text-slate-300 hover:bg-surface-elevated'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Message Stream */}
        <div className="flex-1 flex flex-col border border-border-subtle rounded-xl bg-surface overflow-hidden">
          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {!activeConversation?.messages || activeConversation.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Bot className="w-10 h-10 text-brand-gold mb-2 opacity-80" />
                <h4 className="text-sm font-semibold text-slate-200">
                  How can I help with this contract?
                </h4>
                <p className="text-xs max-w-sm mt-1">
                  Try asking: "Who owns the master recordings?", "What is the royalty rate?", or "Is
                  there an exclusivity clause?"
                </p>
              </div>
            ) : (
              activeConversation.messages.map((msg) => {
                const isAssistant =
                  msg.sender === AIMessageSender.ASSISTANT || msg.role === 'assistant';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAssistant && (
                      <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-brand-gold shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-2xl p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-surface-elevated border border-border-subtle text-slate-100'
                          : 'bg-brand-gold text-canvas font-medium'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Supporting Contract Citations */}
                      {isAssistant && msg.references && msg.references.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-border-subtle/80 space-y-1.5">
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-brand-stellar" /> Referenced Contract
                            Excerpts:
                          </span>
                          {msg.references.map((ref, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded bg-canvas/40 border border-border-subtle font-mono text-[11px] text-slate-300"
                            >
                              <div className="text-brand-stellar font-bold text-[10px]">
                                Page {ref.sourcePage ?? 'N/A'}:
                              </div>
                              <p className="italic mt-0.5 text-slate-300">"{ref.sourceExcerpt}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {!isAssistant && (
                      <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex gap-3 items-center text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-brand-gold" />
                <span>Analyzing contract text...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-border-subtle bg-surface-elevated/50 flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask a question about this contract..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={isSending}
              className="flex-1 bg-surface text-slate-100 placeholder:text-slate-500 border border-border-subtle rounded-lg text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-brand-stellar"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSending}
              disabled={!messageInput.trim()}
              rightIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
