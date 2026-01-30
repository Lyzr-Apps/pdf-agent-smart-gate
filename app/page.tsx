'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Search,
  Upload,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  Brain,
  MessageSquare,
  File
} from 'lucide-react'
import { callAIAgent } from '@/lib/aiAgent'
import type { NormalizedAgentResponse } from '@/lib/aiAgent'
import { useRAGKnowledgeBase } from '@/lib/ragKnowledgeBase'
import type { RAGDocument } from '@/lib/ragKnowledgeBase'
import { cn } from '@/lib/utils'

// Agent Configuration
const AGENT_ID = "697cd6c0d36f070193f5c3d9"
const RAG_ID = "697cd6ad47177de38546d9dd"

// TypeScript interfaces based on REAL response schema
interface Source {
  title?: string
  page?: number
  content?: string
  document?: string
  [key: string]: any
}

interface AgentResult {
  answer: string
  sources: Source[]
  confidence: number
  follow_up_suggestions: string[]
}

interface KnowledgeSearchResponse {
  status: 'success' | 'error'
  result: AgentResult
  metadata?: {
    agent_name?: string
    timestamp?: string
    query_type?: string
  }
}

interface Message {
  id: string
  type: 'user' | 'agent'
  content: string
  timestamp: Date
  sources?: Source[]
  confidence?: number
  followUpSuggestions?: string[]
  error?: boolean
}

// Answer Card Component
function AnswerCard({ message }: { message: Message }) {
  const [sourcesExpanded, setSourcesExpanded] = useState(false)

  return (
    <div className="space-y-3">
      {/* Answer Text */}
      <div className="text-gray-100 leading-relaxed whitespace-pre-wrap">
        {message.content}
      </div>

      {/* Confidence Score */}
      {message.confidence !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Confidence:</span>
          <div className="flex-1 max-w-[200px]">
            <Progress value={message.confidence * 100} className="h-1.5" />
          </div>
          <span className="text-xs text-gray-400">{Math.round(message.confidence * 100)}%</span>
        </div>
      )}

      {/* Sources Section */}
      {message.sources && message.sources.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setSourcesExpanded(!sourcesExpanded)}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>{message.sources.length} {message.sources.length === 1 ? 'Source' : 'Sources'}</span>
            {sourcesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {sourcesExpanded && (
            <div className="mt-2 space-y-2">
              {message.sources.map((source, idx) => (
                <div
                  key={idx}
                  className="bg-[#1a1a2e]/50 border border-gray-700 rounded-lg p-3 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">
                      [{idx + 1}]
                    </Badge>
                    <div className="flex-1 space-y-1">
                      {source.document && (
                        <div className="font-medium text-gray-200">{source.document}</div>
                      )}
                      {source.page && (
                        <div className="text-xs text-gray-400">Page {source.page}</div>
                      )}
                      {source.content && (
                        <div className="text-gray-300 text-xs mt-1">{source.content}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Follow-up Suggestions */}
      {message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs text-gray-400 font-medium">You might also ask:</div>
          <div className="space-y-1.5">
            {message.followUpSuggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="text-sm text-gray-300 bg-[#1a1a2e]/30 rounded px-3 py-2 border border-gray-700/50"
              >
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Document Item Component
function DocumentItem({
  doc,
  onDelete
}: {
  doc: RAGDocument
  onDelete: (fileName: string) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 bg-white/5 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <File className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-200 truncate">{doc.fileName}</div>
          {doc.documentCount !== undefined && (
            <div className="text-xs text-gray-500 mt-0.5">
              {doc.documentCount} {doc.documentCount === 1 ? 'chunk' : 'chunks'}
            </div>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(doc.fileName)}
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}

// Upload Progress Component
function UploadProgressBar({ fileName }: { fileName: string }) {
  return (
    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-200 truncate">{fileName}</div>
          <div className="text-xs text-gray-400 mt-0.5">Uploading and indexing...</div>
        </div>
      </div>
      <Progress value={undefined} className="h-1 mt-2" />
    </div>
  )
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const {
    documents,
    loading: docsLoading,
    error: docsError,
    fetchDocuments,
    uploadDocument,
    removeDocuments,
  } = useRAGKnowledgeBase()

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments(RAG_ID)
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const query = inputValue
    setInputValue('')
    setLoading(true)
    setError(null)

    try {
      const result = await callAIAgent(query, AGENT_ID)

      if (result.success) {
        const response = result.response as KnowledgeSearchResponse

        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'agent',
          content: response.result.answer,
          timestamp: new Date(),
          sources: response.result.sources || [],
          confidence: response.result.confidence,
          followUpSuggestions: response.result.follow_up_suggestions || [],
          error: response.status === 'error',
        }

        setMessages(prev => [...prev, agentMessage])
      } else {
        setError(result.error || 'Failed to get response from agent')
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'agent',
          content: result.error || 'Failed to get response. Please try again.',
          timestamp: new Date(),
          error: true,
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (err) {
      setError('Network error occurred')
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: 'A network error occurred. Please check your connection and try again.',
        timestamp: new Date(),
        error: true,
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be under 50MB')
      return
    }

    setUploadingFile(file.name)
    setError(null)

    try {
      const result = await uploadDocument(RAG_ID, file)

      if (result.success) {
        setUploadingFile(null)
        await fetchDocuments(RAG_ID)
      } else {
        setError(result.error || 'Upload failed')
        setUploadingFile(null)
      }
    } catch (err) {
      setError('Upload failed')
      setUploadingFile(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (fileName: string) => {
    setError(null)
    const result = await removeDocuments(RAG_ID, [fileName])

    if (!result.success) {
      setError(result.error || 'Delete failed')
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleFileUpload(files[0])
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-gray-100">
      {/* Header */}
      <header className="bg-[#16213e] border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-[#4f46e5]" />
            <div>
              <h1 className="text-xl font-bold text-white">Knowledge Search Assistant</h1>
              <p className="text-xs text-gray-400">AI-powered document research</p>
            </div>
          </div>
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            variant="outline"
            className="border-gray-700 text-gray-200 hover:bg-[#4f46e5] hover:text-white hover:border-[#4f46e5]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Manage Documents
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="relative max-w-7xl mx-auto">
        {/* Main Chat Area */}
        <div className={cn(
          "transition-all duration-300",
          sidebarOpen ? "mr-[360px]" : ""
        )}>
          <div className="flex flex-col h-[calc(100vh-88px)]">
            {/* Messages Area */}
            <ScrollArea className="flex-1 px-6 py-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-gray-300 mb-2">
                      Welcome to Knowledge Search
                    </h2>
                    <p className="text-gray-500 max-w-md mx-auto">
                      Upload PDF documents and ask questions to get AI-powered answers with citations.
                    </p>
                    {(!documents || documents.length === 0) && (
                      <Button
                        onClick={() => setSidebarOpen(true)}
                        className="mt-6 bg-[#4f46e5] hover:bg-[#4338ca] text-white"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Your First Document
                      </Button>
                    )}
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.type === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-2xl rounded-2xl px-5 py-4",
                          message.type === 'user'
                            ? 'bg-[#4f46e5] text-white'
                            : message.error
                            ? 'bg-red-500/10 border border-red-500/30'
                            : 'bg-white/10 shadow-lg border border-gray-700/50'
                        )}
                      >
                        {message.type === 'user' ? (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        ) : (
                          <AnswerCard message={message} />
                        )}
                      </div>
                    </div>
                  ))
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-2xl px-5 py-4 border border-gray-700/50">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-[#4f46e5]" />
                        <span className="text-gray-300">Searching knowledge base...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-gray-800 bg-[#16213e] px-6 py-4">
              <div className="max-w-3xl mx-auto">
                {error && (
                  <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <div className="flex-1 bg-[#1a1a2e] rounded-xl border border-gray-700 focus-within:border-[#4f46e5] transition-colors">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask anything about your documents..."
                      disabled={loading}
                      className="border-0 bg-transparent text-base h-12 px-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={loading || !inputValue.trim()}
                    className="bg-[#4f46e5] hover:bg-[#4338ca] text-white h-12 px-6"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Document Management Sidebar */}
        <div
          className={cn(
            "fixed top-[88px] right-0 bottom-0 w-[360px] bg-[#16213e] border-l border-gray-800 transform transition-transform duration-300 overflow-hidden",
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="font-semibold text-white">Document Library</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Sidebar Content */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Upload Zone */}
                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
                    isDragging
                      ? "border-[#4f46e5] bg-[#4f46e5]/10"
                      : "border-gray-700 hover:border-gray-600 bg-[#1a1a2e]/50"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-1">
                    Drop PDF here or click to browse
                  </p>
                  <p className="text-xs text-gray-600">
                    Max 50MB per file
                  </p>
                </div>

                {/* Upload Progress */}
                {uploadingFile && <UploadProgressBar fileName={uploadingFile} />}

                {/* Error Display */}
                {docsError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {docsError}
                  </div>
                )}

                <Separator className="bg-gray-800" />

                {/* Document List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-300">
                      Uploaded Documents ({documents?.length || 0})
                    </h4>
                  </div>

                  {docsLoading && !documents ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Loading documents...</p>
                    </div>
                  ) : documents && documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <DocumentItem
                          key={doc.fileName}
                          doc={doc}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-700 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No documents yet</p>
                      <p className="text-xs text-gray-600 mt-1">Upload PDFs to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
