import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot, User, Loader2, Sparkles, MessageSquarePlus, History, Menu, X, Plus, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Message } from './types';
import ReactMarkdown from 'react-markdown';
import CodeBlock from './CodeBlock';
import UserDropdown from './UserDropdown';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const ModernChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messageImages, setMessageImages] = useState<{[key: string]: string[]}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error loading conversations:', error);
          return;
        }

        setConversations(data || []);
        
        // Always start with a fresh conversation instead of loading previous one
        // Don't auto-select any conversation - let user start fresh
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    };

    loadConversations();
  }, [user]);

  // Load messages for selected conversation
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversationId || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading messages:', error);
          return;
        }

        const formattedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role as 'user' | 'assistant',
          timestamp: new Date(msg.created_at)
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
  }, [conversationId, user]);

  const createNewConversation = () => {
    // Simply reset to fresh state without creating DB record until user sends message
    setConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
    return null;
  };

  const createConversationInDB = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({ 
          title: 'New Chat',
          user_id: user.id 
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        toast({
          title: "Error",
          description: "Failed to create new chat",
          variant: "destructive",
        });
        return null;
      }

      // Update conversations list
      setConversations(prev => [data, ...prev]);
      
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error", 
        description: "Failed to create new chat",
        variant: "destructive",
      });
      return null;
    }
  };

  const selectConversation = (id: string) => {
    setConversationId(id);
    setSidebarOpen(false);
  };

  const updateConversationTitle = async (conversationId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    
    try {
      await supabase
        .from('conversations')
        .update({ 
          title,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
        
      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title, updated_at: new Date().toISOString() }
            : conv
        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  // Auto-scroll to bottom with smooth animation
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    };
    
    // Delay scroll to allow message animation to complete
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  const sendMessage = async () => {
    // Allow sending if there's either a message or files (for image-only prompts)
    if ((inputMessage.trim() === '' && selectedFiles.length === 0) || isLoading || !user) return;

    // Create conversation if none exists (only when user actually sends a message)
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      currentConversationId = await createConversationInDB();
      if (!currentConversationId) return;
      setConversationId(currentConversationId);
    }

    // Create image URLs for display
    const imageUrls: string[] = [];
    for (const file of selectedFiles) {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        imageUrls.push(url);
      }
    }

    let messageContent = inputMessage;
    if (selectedFiles.length > 0) {
      const fileNames = selectedFiles.map(f => f.name).join(', ');
      if (inputMessage.trim()) {
        messageContent = `${inputMessage}\n\n[Attached files: ${fileNames}]`;
      } else {
        messageContent = `[Attached files: ${fileNames}]`;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: 'user',
      timestamp: new Date()
    };

    // Store images for this message
    if (imageUrls.length > 0) {
      setMessageImages(prev => ({
        ...prev,
        [userMessage.id]: imageUrls
      }));
    }

    const currentInput = inputMessage;
    const currentFiles = [...selectedFiles];
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      // Get the current session to ensure we have a valid JWT
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session. Please sign in again.');
      }

      console.log('Sending message with session:', session.access_token ? 'Token present' : 'No token');
      
      // Convert files to base64 if any
      const fileData = [];
      for (const file of currentFiles) {
        if (file.type.startsWith('image/')) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          fileData.push({
            name: file.name,
            type: file.type,
            data: base64
          });
        }
      }

      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: currentInput,
          conversationId: currentConversationId,
          files: fileData
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      };

      // Add message with animation delay
      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage]);
      }, 200);

      // Update conversation title if this is the first message
      if (messages.length === 0) {
        updateConversationTitle(currentConversationId, currentInput);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      // Remove the user message if the request failed
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };


  return (
    <div className="flex h-screen relative">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 glass-card border-r border-border/50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              Chat History
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            onClick={() => createNewConversation()}
            className="w-full mt-3 glow-button"
            size="sm"
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.map((conversation) => (
              <Button
                key={conversation.id}
                variant={conversationId === conversation.id ? "secondary" : "ghost"}
                className={`w-full justify-start text-left p-3 mb-2 h-auto ${
                  conversationId === conversation.id 
                    ? 'bg-primary/10 border-primary/20 border' 
                    : 'hover:bg-secondary/10'
                }`}
                onClick={() => selectConversation(conversation.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {conversation.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(conversation.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </Button>
            ))}
            {conversations.length === 0 && (
              <div className="text-center text-muted-foreground p-4 text-sm">
                No conversations yet. Start a new chat!
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col page-transition">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Header */}
        <div className="relative z-10 glass-card border-b border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="relative">
                <Avatar className="w-12 h-12 glow-button">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                    <Bot className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <Sparkles className="w-4 h-4 text-secondary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  IKnowEverything
                </h1>
                <p className="text-sm text-muted-foreground">Your Intelligent AI Assistant</p>
              </div>
            </div>
            
            <UserDropdown />
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 relative z-10">
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.length === 0 && (
              <div className="text-center py-20">
                <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                <p className="text-muted-foreground">Ask me anything! I'm here to help with any questions or topics you'd like to explore.</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-4 message-slide-in ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {message.role === 'assistant' && (
                  <Avatar className="w-10 h-10 glow-button flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                      <Bot className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <Card className={`p-4 max-w-[80%] relative transition-all duration-300 hover:scale-[1.02] ${
                  message.role === 'user' 
                    ? 'glass-card bg-gradient-to-br from-primary to-secondary text-white border-primary/20' 
                    : 'glass-card border-border/50 hover:border-primary/30'
                }`}>
                  {/* Display images for this message */}
                  {messageImages[message.id] && messageImages[message.id].length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {messageImages[message.id].map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`Uploaded image ${index + 1}`}
                          className="max-w-48 max-h-48 rounded-lg object-cover border border-white/20"
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-code:text-foreground prose-pre:text-foreground">
                    <ReactMarkdown
                      components={{
                        // Headings
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 text-current border-b border-current/20 pb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 text-current">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-md font-semibold mb-2 mt-3 text-current">{children}</h3>,
                        h4: ({ children }) => <h4 className="text-sm font-semibold mb-1 mt-2 text-current">{children}</h4>,
                        
                        // Lists with proper spacing and bullets
                        ul: ({ children }) => <ul className="list-disc list-outside ml-6 space-y-1 my-3">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-outside ml-6 space-y-1 my-3">{children}</ol>,
                        li: ({ children }) => <li className="text-current leading-relaxed">{children}</li>,
                        
                        // Paragraphs with proper spacing
                        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                        
                        // Text formatting
                        strong: ({ children }) => <strong className="font-bold text-current">{children}</strong>,
                        em: ({ children }) => <em className="italic text-current">{children}</em>,
                        
                        // Code blocks with terminal styling
                        code: ({ children, className, ...props }) => {
                          const isInline = !className;
                          const language = className?.replace('language-', '') || '';
                          
                          if (isInline) {
                            return (
                              <code className="bg-muted/30 px-1.5 py-0.5 rounded text-sm font-mono text-current">
                                {children}
                              </code>
                            );
                          }
                          
                          return (
                            <CodeBlock language={language}>
                              {String(children).replace(/\n$/, '')}
                            </CodeBlock>
                          );
                        },
                        pre: ({ children, ...props }) => {
                          // Extract code content from pre > code structure
                          const codeElement = React.Children.toArray(children).find(
                            (child: any) => child?.type === 'code'
                          );
                          
                          if (codeElement && React.isValidElement(codeElement)) {
                            const className = codeElement.props?.className || '';
                            const language = className.replace('language-', '') || '';
                            const codeContent = String(codeElement.props?.children || '').replace(/\n$/, '');
                            
                            return <CodeBlock language={language}>{codeContent}</CodeBlock>;
                          }
                          
                          return <pre className="bg-muted/20 p-3 rounded-lg overflow-x-auto my-3">{children}</pre>;
                        },
                        
                        // Tables
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-3">
                            <table className="min-w-full border-collapse border border-current/20">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-muted/20">{children}</thead>,
                        th: ({ children }) => (
                          <th className="border border-current/20 px-3 py-2 text-left font-semibold text-current">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-current/20 px-3 py-2 text-current">
                            {children}
                          </td>
                        ),
                        
                        // Blockquotes
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-primary/50 pl-4 italic my-3 text-current/90">
                            {children}
                          </blockquote>
                        ),
                        
                        // Horizontal rules
                        hr: () => <hr className="border-current/20 my-4" />
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  <div className={`text-xs mt-3 flex items-center gap-2 ${
                    message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                  }`}>
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.role === 'assistant' && (
                      <Sparkles className="w-3 h-3 animate-pulse" />
                    )}
                  </div>
                </Card>
                
                {message.role === 'user' && (
                  <Avatar className="w-10 h-10 glow-button flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-white">
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 justify-start message-slide-in">
                <Avatar className="w-10 h-10 glow-button flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                    <Bot className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <Card className="p-4 glass-card border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-typing-pulse typing-dots"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-typing-pulse typing-dots"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-typing-pulse typing-dots"></div>
                    </div>
                    <span className="text-sm text-muted-foreground">IKnowEverything is thinking...</span>
                  </div>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="relative z-10 glass-card border-t border-border/50 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-secondary/20 rounded-lg px-3 py-2 text-sm">
                    <Paperclip className="w-4 h-4" />
                    <span className="truncate max-w-32">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-auto p-0 w-4 h-4 hover:bg-destructive/20"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="hover:bg-secondary/20"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4" />
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask IKnowEverything anything..."
                disabled={isLoading}
                className="flex-1 input-glow bg-background/50 backdrop-blur-sm transition-all duration-300"
              />
              <Button 
                onClick={sendMessage} 
                disabled={isLoading || (!inputMessage.trim() && selectedFiles.length === 0)}
                className="glow-button transition-all duration-300 hover:scale-105"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernChatInterface;