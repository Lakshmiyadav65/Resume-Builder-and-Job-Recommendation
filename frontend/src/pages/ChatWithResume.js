import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FcSupport, FcDocument, FcBusinessContact, FcSms } from 'react-icons/fc';
import { FaPaperPlane, FaTrash } from 'react-icons/fa';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { useApp } from '../context/AppContext';
import { initChat, sendChatMessage, getChatHistory, clearChat } from '../services/api';
import Sidebar from '../components/Sidebar';
import ReactMarkdown from 'react-markdown';
import './ChatWithResume.css';

const ChatWithResume = () => {
  const { sessionId, setSessionId } = useApp();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatInitialized, setChatInitialized] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (sessionId) {
      loadChatHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const loadChatHistory = async () => {
    try {
      const response = await getChatHistory(sessionId);
      if (response.success) {
        setMessages(response.messages);
        setChatInitialized(true);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setError('');

      // Initialize chat with resume
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('sessionId', sessionId || `chat_${Date.now()}`);

        const response = await initChat(formData);
        if (response.success) {
          setSessionId(response.sessionId);
          setChatInitialized(true);

          // Add welcome message from AI
          const welcomeMessage = {
            role: 'assistant',
            content: `Hello! 👋 I've successfully analyzed your resume **${file.name}**. I'm your AI Resume Assistant, and I'm here to help you explore and understand your professional profile better.

**Here's what I can help you with:**

• **Resume Analysis** - Ask me about your skills, experience, or education
• **Strengths & Weaknesses** - Get insights into what stands out in your resume
• **Career Guidance** - Discuss potential career paths based on your background
• **Interview Prep** - Practice common interview questions related to your experience
• **Resume Improvements** - Get suggestions on how to enhance specific sections
• **Skills Mapping** - Understand how your skills align with different roles

**Try asking me:**
- "What are my key strengths?"
- "Which skills should I highlight for a [job role]?"
- "How can I improve my resume?"
- "What career paths suit my background?"

Feel free to ask me anything about your resume! I'm here to provide personalized, insightful answers. 🚀`,
            timestamp: new Date(),
          };

          setMessages([welcomeMessage]);
        }
      } catch (err) {
        setError('Failed to initialize chat. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !chatInitialized) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);
    setError('');

    // Add user message to UI immediately
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await sendChatMessage(sessionId, userMessage);
      if (response.success) {
        // Add assistant response
        const assistantMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error(err);
      // Remove the user message if sending failed
      setMessages(prev => prev.filter(msg => msg !== newUserMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      try {
        await clearChat(sessionId);
        setMessages([]);
      } catch (err) {
        setError('Failed to clear chat.');
        console.error(err);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      <Sidebar />

      <div className="chat-main">
        <div className="chat-content-container">
          {!chatInitialized ? (
            <motion.div
              className="chat-welcome"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <FcSupport className="welcome-icon" style={{ fontSize: '4rem' }} />
              <h2>Welcome to Resume Chat!</h2>
              <p>Upload your resume to start asking questions about it.</p>
              <Button
                size="lg"
                variant="gradient"
                className="upload-welcome-button gap-2 mt-4"
                onClick={() => document.getElementById('chat-file-input').click()}
              >
                <FcDocument style={{ fontSize: '1.2rem' }} /> Upload Resume (PDF)
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="chat-messages">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      className={`message ${message.role}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="message-avatar">
                        {message.role === 'user' ? <FcBusinessContact /> : <FcSupport />}
                      </div>
                      <div className="message-content">
                        {message.role === 'assistant' ? (
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading && (
                  <motion.div
                    className="message assistant typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="message-avatar">
                      <FcSupport />
                    </div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {error && (
                <motion.div
                  className="chat-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  ⚠️ {error}
                </motion.div>
              )}

              <div className="chat-input-container">
                <Textarea
                  className="chat-input bg-slate-800 border-slate-700 min-h-[50px] resize-none"
                  placeholder="Ask something about the resume..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={loading}
                  rows={1}
                />
                <Button
                  size="icon"
                  variant="gradient"
                  className="send-button h-12 w-12 shrink-0"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || loading}
                >
                  <FaPaperPlane />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWithResume;
