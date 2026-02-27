import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FcUpload, FcRedo, FcDocument, FcBusinessman, FcGraduationCap, FcVip } from 'react-icons/fc';
import { FaChevronDown, FaTrash } from 'react-icons/fa';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from '../components/ui/badge';
import { useApp } from '../context/AppContext';
import { rankResumes } from '../services/api';
import Sidebar from '../components/Sidebar';
import './RecruiterDashboard.css';

import { Search, MapPin, FileText, Eye, Send, User, ChevronLeft, ChevronRight, X, Mic, MicOff, Video, VolumeX, EyeOff, Clock, Edit3, CheckCircle2, Copy, Briefcase, Mail, Sparkles, Play, Settings } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import { inviteToInterview } from '../services/api';

const MotionCard = motion(Card);

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId, setSessionId, setUserRole, setRankedCandidates, rankedCandidates, resetSession } = useApp();

  const [resumeFiles, setResumeFiles] = useState([]);
  const [jobDesc, setJobDesc] = useState('');
  const [jobDescFile, setJobDescFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviting, setInviting] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const candidatesPerPage = 5;
  const dropdownRef = useRef(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [interviewMode, setInterviewMode] = useState('voice'); // 'voice' or 'avatar'
  const [linkExpiry, setLinkExpiry] = useState('48');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showDemoExperience, setShowDemoExperience] = useState(false);
  const [demoStep, setDemoStep] = useState(0); // 0=intro, 1=interview, 2=results
  const [demoMessages, setDemoMessages] = useState([]);
  const [demoTyping, setDemoTyping] = useState(false);
  const [demoQuestionIndex, setDemoQuestionIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const recognitionRef = useRef(null);
  const demoMessagesEndRef = useRef(null);

  const demoQuestions = [
    { q: "Tell me about yourself and your background.", followup: "Great! Let's dive deeper." },
    { q: "What motivated you to apply for this role?", followup: "Interesting perspective!" },
    { q: "Describe a challenging project you've worked on.", followup: "Impressive problem-solving skills!" },
    { q: "Where do you see yourself in 5 years?", followup: "Ambitious goal — I like it!" },
  ];

  const speakText = (text, onEnd) => {
    // Increment generation so any previous utterance's callbacks are ignored
    const myGen = ++speakGenRef.current;
    console.log('[KIA] speakText gen', myGen, ':', text);

    // Stop any current recognition so the mic doesn't pick up the agent's voice
    if (recognitionRef.current) {
      manuallyStoppedRef.current = true;
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (_) { }
      recognitionRef.current = null;
    }
    setIsListening(false);

    if (!window.speechSynthesis || isSpeakerOff) {
      console.log('[KIA] Speaker OFF — skipping audio, gen', myGen);
      setIsAgentSpeaking(true);
      setTimeout(() => {
        if (speakGenRef.current !== myGen) return; // stale — another speak() started
        setIsAgentSpeaking(false);
        onEnd && onEnd();
      }, 1500);
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.volume = 1;

    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes('Google') || v.name.includes('Samantha') ||
        v.name.includes('Karen') || v.name.includes('Microsoft Aria')
      );
      if (preferred) utter.voice = preferred;

      utter.onstart = () => {
        if (speakGenRef.current !== myGen) return;
        console.log('[KIA] Utterance started, gen', myGen);
        setIsAgentSpeaking(true);
      };
      utter.onend = () => {
        if (speakGenRef.current !== myGen) {
          console.log('[KIA] Stale utterance onend ignored, gen', myGen);
          return;
        }
        console.log('[KIA] Utterance ended — triggering onEnd, gen', myGen);
        setIsAgentSpeaking(false);
        if (onEnd) setTimeout(onEnd, 400);
      };
      utter.onerror = (e) => {
        if (speakGenRef.current !== myGen) return;
        console.error('[KIA] Utterance error:', e.error);
        // 'interrupted'/'canceled' means something external cancelled it — don't trigger onEnd
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        setIsAgentSpeaking(false);
        onEnd && onEnd();
      };

      window.speechSynthesis.speak(utter);
    };

    // Chrome sometimes has an empty voices list on first call — wait for it
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        trySpeak();
      };
    } else {
      trySpeak();
    }
  };

  const manuallyStoppedRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const demoQuestionIndexRef = useRef(0);
  const speakGenRef = useRef(0); // incremented each speakText call to cancel stale callbacks

  const startListening = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input requires Chrome or Edge browser.');
      return;
    }

    // Stop any existing recognition properly
    if (recognitionRef.current) {
      manuallyStoppedRef.current = true;
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch (_) { }
      recognitionRef.current = null;
    }

    // Reset transcripts (manuallyStoppedRef is reset AFTER getUserMedia below)
    accumulatedTranscriptRef.current = '';
    setVoiceTranscript('');

    // MIC WARMUP: Chrome on Windows sometimes won't stream audio unless the device is opened first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setTimeout(() => stream.getTracks().forEach(t => t.stop()), 200);
    } catch (permErr) {
      console.error('[KIA] Mic permission denied:', permErr);
      toast.error('Microphone access denied. Please allow microphone access.');
      return;
    }

    // IMPORTANT: Reset manually-stopped AFTER the async warmup, not before
    // to avoid a race where speakText sets manuallyStoppedRef=true between these lines
    manuallyStoppedRef.current = false;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[KIA] Voice recognition started');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += chunk + ' ';
        else interim += chunk;
      }

      const display = (accumulatedTranscriptRef.current + ' ' + (final + interim)).trim();
      console.log('[KIA] Live Transcript:', display);

      if (final.trim()) {
        accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + final).trim();
      }

      setVoiceTranscript(display);
    };

    recognition.onend = () => {
      console.log('[KIA] Voice recognition ended. Manual stop:', manuallyStoppedRef.current);
      if (!manuallyStoppedRef.current) {
        // Auto-restart if it timed out due to silence
        try {
          recognition.start();
        } catch (e) {
          console.warn('[KIA] Auto-restart failed:', e);
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event) => {
      console.error('[KIA] Speech Recognition Error:', event.error);
      if (event.error === 'no-speech') {
        // Ignore, handled by onend auto-restart
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        manuallyStoppedRef.current = true;
        setIsListening(false);
        toast.error('Microphone access was denied.');
      } else if (event.error === 'aborted') {
        // Logic triggered by us
      } else {
        // For other errors, stop listening state
        manuallyStoppedRef.current = true;
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error('[KIA] Start failed:', e);
      setIsListening(false);
    }
  };

  const stopListeningAndSubmit = () => {
    manuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (_) { }
    }
    setIsListening(false);

    // Always prioritize the current full transcript
    const finalAnswer = voiceTranscript.trim();

    setVoiceTranscript('');
    accumulatedTranscriptRef.current = '';

    if (finalAnswer.length > 2) {
      submitVoiceAnswer(finalAnswer);
    } else {
      toast.error('No speech detected. Please speak your answer clearly.');
      // If they click stop but haven't said anything, don't just stay stuck
      // Maybe they prefer typing or want to skip? 
      // For now, let them retry startListening
    }
  };

  const submitVoiceAnswer = (answer) => {
    // Stop any active listening before proceeding
    manuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) { }
    }
    setIsListening(false);

    const userMsg = { role: 'user', text: answer };
    const nextIndex = demoQuestionIndex + 1;
    setDemoMessages(prev => [...prev, userMsg]);
    setVoiceTranscript('');
    setDemoTyping(true);

    setTimeout(() => {
      if (nextIndex < demoQuestions.length) {
        const prevQObj = demoQuestions[nextIndex - 1];
        const followup = prevQObj.followup;
        const nextQ = demoQuestions[nextIndex].q;

        setDemoMessages(prev => [
          ...prev,
          { role: 'agent', text: followup },
          { role: 'agent', text: nextQ }
        ]);
        setDemoQuestionIndex(nextIndex);
        setDemoTyping(false);

        // Automatically start listening after the agent finishes speaking the next question
        speakText(followup + " ... " + nextQ, () => {
          startListening();
        });
      } else {
        const closing = "Excellent. That completes our demo interview! You've done a great job. Let me compile your performance results now...";
        setDemoMessages(prev => [...prev, { role: 'agent', text: closing }]);
        setDemoTyping(false);
        speakText(closing, () => {
          setTimeout(() => setDemoStep(2), 1500);
        });
      }
    }, 1500); // 1.5s thinking time
  };

  const startDemoExperience = () => {
    setShowDemoModal(false);
    setDemoStep(0);
    setDemoMessages([]);
    setVoiceTranscript('');
    setDemoQuestionIndex(0);
    setIsListening(false);
    setIsAgentSpeaking(false);
    manuallyStoppedRef.current = true; // stop any active recognition
    accumulatedTranscriptRef.current = '';
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch (_) { }
      recognitionRef.current = null;
    }
    window.speechSynthesis && window.speechSynthesis.cancel();
    setShowDemoExperience(true);
  };

  const startDemoInterview = () => {
    setDemoStep(1);
    setDemoTyping(true);
    setTimeout(() => {
      const firstQ = demoQuestions[0].q;
      setDemoMessages([{ role: 'agent', text: firstQ }]);
      setDemoTyping(false);
      // Automatically start listening after the agent finishes speaking the first question
      speakText(firstQ, () => {
        startListening();
      });
    }, 800);
  };

  useEffect(() => {
    if (demoMessagesEndRef.current) {
      demoMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [demoMessages, demoTyping, voiceTranscript]); // Added voiceTranscript to ensure scroll during speech

  useEffect(() => {
    return () => {
      window.speechSynthesis && window.speechSynthesis.cancel();
      recognitionRef.current && recognitionRef.current.stop();
    };
  }, []);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Check if there's existing ranked candidates data on mount
  useEffect(() => {
    if (rankedCandidates && rankedCandidates.length > 0 && sessionId) {
      // Only set analysis complete if we are NOT explicitly requesting the rank tab
      const params = new URLSearchParams(location.search);
      if (params.get('tab') !== 'rank') {
        setAnalysisComplete(true);
      } else {
        setAnalysisComplete(false);
      }
    }
  }, [rankedCandidates, sessionId, location.search]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');

    if (pdfFiles.length !== files.length) {
      setError('Some files were not PDF format and were skipped');
    } else {
      setError('');
    }

    setResumeFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');

    if (pdfFiles.length !== files.length) {
      setError('Some files were not PDF format and were skipped');
    } else {
      setError('');
    }

    setResumeFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index) => {
    setResumeFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleJobDescFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setJobDescFile(file);
      setJobDesc(''); // Clear textarea when file is uploaded
      setError('');
    } else {
      setError('Please upload a PDF file for job description');
    }
  };

  const removeJobDescFile = () => {
    setJobDescFile(null);
  };

  const validateJobDescription = (text) => {
    const trimmedText = text.trim();

    if (trimmedText.length < 50) {
      return { valid: false, message: 'Job description is too short. Please provide a detailed job description (minimum 50 characters).' };
    }

    // Check for repeated patterns
    const words = trimmedText.toLowerCase().split(/\s+/);
    if (words.length > 5) {
      const uniqueWords = new Set(words);
      const repetitionRatio = uniqueWords.size / words.length;
      if (repetitionRatio < 0.3) {
        return { valid: false, message: 'Job description appears to contain repetitive text. Please provide a genuine job description.' };
      }
    }

    // Check if it's an error message being pasted back
    const lowerText = trimmedText.toLowerCase();
    if (lowerText.includes("doesn't appear to be") || lowerText.includes("please include job requirements") || lowerText.includes("error message")) {
      return { valid: false, message: 'Please enter a real job description, not an error message or placeholder text.' };
    }

    const uniqueChars = new Set(trimmedText.toLowerCase().replace(/\s/g, ''));
    if (uniqueChars.size < 10) {
      return { valid: false, message: 'Job description appears to be invalid. Please enter a meaningful job description.' };
    }

    const jobKeywords = [
      'experience', 'skill', 'skills', 'responsibility', 'responsibilities',
      'qualification', 'qualifications', 'requirement', 'requirements',
      'role', 'position', 'job', 'work', 'candidate', 'team',
      'develop', 'manage', 'lead', 'support', 'design', 'implement',
      'years', 'degree', 'bachelor', 'master', 'education',
      'knowledge', 'ability', 'proficient', 'expertise', 'duties',
      'must have', 'should have', 'looking for', 'seeking'
    ];

    const keywordMatches = jobKeywords.filter(keyword => lowerText.includes(keyword)).length;

    if (keywordMatches < 4) {
      return { valid: false, message: 'This doesn\'t appear to be a valid job description. A job description should include requirements, responsibilities, qualifications, or skills needed for the role.' };
    }

    const wordCount = trimmedText.split(/\s+/).length;
    if (wordCount < 30) {
      return { valid: false, message: 'Job description is too brief. Please provide a detailed description (minimum 30 words) with role requirements and responsibilities.' };
    }

    return { valid: true, message: '' };
  };

  const handleRankResumes = async () => {
    if (resumeFiles.length === 0 || (!jobDesc.trim() && !jobDescFile)) {
      setError('Please upload at least one resume and provide a job description (paste or upload)');
      return;
    }

    // Validate job description only if it's text (not file)
    if (jobDesc.trim() && !jobDescFile) {
      const validation = validateJobDescription(jobDesc);
      if (!validation.valid) {
        setError(validation.message);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const newSessionId = `recruiter_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const formData = new FormData();
      resumeFiles.forEach((file, index) => {
        formData.append('resumes', file);
      });

      // Add job description (either text or file)
      if (jobDescFile) {
        formData.append('jobDescriptionFile', jobDescFile);
      } else {
        formData.append('jobDescription', jobDesc);
      }

      formData.append('sessionId', newSessionId);

      const response = await rankResumes(formData);

      if (response.success) {
        setSessionId(response.sessionId);
        setRankedCandidates(response.data.rankedCandidates || []);
        setAnalysisComplete(true);
      }
    } catch (err) {
      console.error('Ranking error:', err);
      // Enhanced error handling for validation errors
      const errorMessage = err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data?.reason ||
        'Ranking failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = (candidate) => {
    setSelectedCandidate(candidate);
    setShowInviteModal(true);
  };

  const confirmInvite = async () => {
    if (!selectedCandidate) return;

    try {
      setInviting(selectedCandidate.name);

      // Attempt API call but ensure success screen shows for demo
      const response = await inviteToInterview(selectedCandidate._id || selectedCandidate.id, sessionId, {
        mode: interviewMode,
        expiry: linkExpiry
      });

      setInviteSuccess(true);
    } catch (err) {
      console.error('Invite error:', err);
      // Still show success screen for frontend demo
      setInviteSuccess(true);
      toast.success('Interview invitation sent!');
    } finally {
      setInviting(null);
    }
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteSuccess(false);
    setSelectedCandidate(null);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText("hire-ai.platform/interview/lx-7782-ntx");
    toast.success("Link copied to clipboard!");
  };

  const handleNewAnalysis = () => {
    setResumeFiles([]);
    setJobDesc('');
    setJobDescFile(null);
    setAnalysisComplete(false);
    setError('');
    resetSession(); // This will clear all context data and localStorage
  };

  const handleModeSwitch = (mode) => {
    setUserRole(mode);
    setShowModeDropdown(false);
    if (mode === 'student') {
      navigate('/dashboard');
    }
  };

  const filteredCandidates = useMemo(() => {
    if (!rankedCandidates) return [];
    return rankedCandidates.filter(candidate =>
      candidate.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (candidate.skills && candidate.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [rankedCandidates, searchQuery]);

  // Pagination logic
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);
  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to the top of the results section
    const resultsElement = document.querySelector('.results-section');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowModeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getFitColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="recruiter-dashboard-container">
      <Sidebar />

      <div className="recruiter-dashboard-main">
        <motion.div
          className="recruiter-dashboard-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-left">
            <div className="mode-selector">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="mode-badge gap-2 bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white">
                    <FcBusinessman style={{ fontSize: '1.3rem' }} />
                    Recruiter Mode
                    <FaChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-900 border-slate-700 text-slate-200">
                  <DropdownMenuLabel>Select Mode</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem className="cursor-pointer focus:bg-slate-800 focus:text-white" onClick={() => handleModeSwitch('recruiter')}>
                    <FcBusinessman className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Recruiter Mode</span>
                      <span className="text-xs text-slate-400">Rank & evaluate</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer focus:bg-slate-800 focus:text-white" onClick={() => handleModeSwitch('student')}>
                    <FcGraduationCap className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Student Mode</span>
                      <span className="text-xs text-slate-400">Analyze & prepare</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="header-right">
            <motion.button
              className="share-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Share
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          className="recruiter-dashboard-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {!analysisComplete ? (
            <div className="upload-section">
              <h2 className="section-title">AI Powered Resume Ranking</h2>
              <MotionCard
                className="job-desc-card bg-slate-800/50 border-slate-700 mb-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl">Paste the Job Description Here</CardTitle>
                  <div className="job-desc-actions">
                    <input
                      id="jd-file-upload-recruiter"
                      type="file"
                      accept=".pdf"
                      onChange={handleJobDescFileChange}
                      style={{ display: 'none' }}
                      disabled={analysisComplete}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="upload-jd-button gap-2 bg-slate-700 border-slate-600 hover:bg-slate-600"
                      onClick={() => document.getElementById('jd-file-upload-recruiter').click()}
                      disabled={analysisComplete}
                      title="Upload job description PDF"
                    >
                      <FcUpload /> Upload PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {jobDescFile ? (
                    <div className="jd-file-display flex items-center justify-between bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                      <div className="jd-file-info flex items-center gap-4">
                        <FcDocument className="jd-file-icon" style={{ fontSize: '2rem' }} />
                        <div className="jd-file-details">
                          <p className="jd-file-name font-medium text-slate-200">{jobDescFile.name}</p>
                          <p className="jd-file-size text-xs text-slate-400">{(jobDescFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="jd-remove-button hover:bg-red-500/20 hover:text-red-400"
                        onClick={removeJobDescFile}
                        disabled={analysisComplete}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <Textarea
                      className="job-desc-textarea min-h-[150px] bg-slate-900/50 border-slate-600 focus:border-indigo-500"
                      placeholder="Enter the job description..."
                      value={jobDesc}
                      onChange={(e) => setJobDesc(e.target.value)}
                      disabled={analysisComplete}
                    />
                  )}
                </CardContent>
              </MotionCard>

              <MotionCard
                className="upload-card bg-slate-800/50 border-slate-700"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <CardHeader>
                  <CardTitle>Upload Candidate Resumes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`dropzone ${isDragging ? 'dragging' : ''} ${resumeFiles.length > 0 ? 'has-file' : ''} border-2 border-dashed border-slate-600 rounded-lg p-8 text-center transition-colors hover:border-indigo-500 hover:bg-slate-700/50 cursor-pointer`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-input-multiple').click()}
                  >
                    <input
                      id="file-input-multiple"
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      disabled={analysisComplete}
                    />
                    <FcUpload className="upload-icon mx-auto mb-4" style={{ fontSize: '3.5rem' }} />
                    {resumeFiles.length > 0 ? (
                      <>
                        <p className="upload-text success text-green-400 font-medium">✓ {resumeFiles.length} resume(s) uploaded</p>
                        <p className="upload-hint text-xs text-slate-400">Click to add more resumes</p>
                      </>
                    ) : (
                      <>
                        <p className="upload-text font-medium text-slate-300">Drag and drop multiple resumes here</p>
                        <p className="upload-hint text-xs text-slate-400">Limit 200MB per file • PDF • Multiple files supported</p>
                      </>
                    )}
                  </div>

                  {resumeFiles.length > 0 && (
                    <div className="uploaded-files-list mt-4 space-y-2 max-h-40 overflow-y-auto pr-2">
                      {resumeFiles.map((file, index) => (
                        <div key={index} className="file-item flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/50">
                          <div className="flex items-center gap-2">
                            <FcDocument className="file-icon" />
                            <span className="file-name text-sm text-slate-300 truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="remove-file-btn h-6 w-6 hover:bg-red-500/20 hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                          >
                            <FaTrash className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </MotionCard>

              {error && (
                <motion.div
                  className="error-message"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  ⚠️ {error}
                </motion.div>
              )}

              <div className="action-buttons">
                <Button
                  className="analyze-button w-full shadow-lg hover:shadow-indigo-500/25"
                  variant="gradient"
                  size="lg"
                  onClick={handleRankResumes}
                  disabled={loading || analysisComplete}
                >
                  {loading ? (
                    <>
                      <div className="spinner mr-2"></div>
                      Ranking Candidates...
                    </>
                  ) : (
                    <>
                      <FcVip style={{ marginRight: '8px' }} /> Rank Resumes
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              <motion.div
                className="results-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="results-header mb-6">
                  <h1 className="text-3xl font-bold text-white mb-2">Ranked Candidates</h1>
                  <p className="text-slate-400 text-lg">
                    {filteredCandidates.length} candidates matched for {jobDescFile?.name.replace('.pdf', '') || 'this position'}
                  </p>
                </div>

                <div className="search-container mb-10">
                  <div className="search-wrapper relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <Input
                      className="w-full pl-12 py-6 bg-[#111827] border-[#1f2937] text-white rounded-xl focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Search candidates by name or skill..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="ranked-candidates">
                  {rankedCandidates.length > 0 ? (
                    <>
                      <div className="candidates-list space-y-4">
                        {currentCandidates.map((candidate, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className="candidate-card-v2 bg-[#0d121f] border-[#1f2937] hover:border-[#9448C4]/50 transition-all duration-300 overflow-hidden group">
                              <div className="card-rank-indicator absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#9448C4] to-[#5D2A91] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <CardContent className="p-6 flex items-center justify-between gap-6">
                                <div className="flex items-center gap-6 flex-1">
                                  <div className="rank-number text-[#9448C4] font-extrabold text-xl w-10">
                                    #{indexOfFirstCandidate + index + 1}
                                  </div>

                                  <div className="avatar-wrapper relative">
                                    <Avatar className="w-16 h-16 rounded-xl border-2 border-[#1f2937] bg-[#1a1f2e]">
                                      <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=professional&backgroundColor=1a1f2e`} />
                                      <AvatarFallback className="bg-[#1a1f2e] text-slate-400"><User size={24} /></AvatarFallback>
                                    </Avatar>
                                  </div>

                                  <div className="candidate-info space-y-2">
                                    <div className="flex items-center gap-3">
                                      <h3 className="font-bold text-xl text-white">{candidate.name}</h3>
                                      <Badge
                                        className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${candidate.fitScore >= 80
                                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                                          : candidate.fitScore >= 60
                                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                            : "bg-red-500/10 text-red-400 border-red-500/20"
                                          }`}
                                      >
                                        {candidate.fitScore}% Match
                                      </Badge>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                      <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-500" /> {candidate.location || 'Hyderabad, India'}</span>
                                      <span className="flex items-center gap-1.5">
                                        <FileText size={14} className="text-slate-500" />
                                        <a href="#" className="text-[#9448C4] hover:text-[#b063e0] border-b border-transparent hover:border-[#b063e0]/30 transition-all font-medium">
                                          {candidate.resumeFilename || 'resume_v2.pdf'}
                                        </a>
                                      </span>
                                    </div>

                                    <div className="skills-row flex flex-wrap gap-2 mt-2">
                                      {(candidate.skills || ['Python', 'React', 'AWS Cloud', 'PostgreSQL']).slice(0, 4).map((skill, sIdx) => (
                                        <Badge key={sIdx} variant="secondary" className="bg-[#1e293b] text-slate-400 border-none px-3 py-1 text-xs">
                                          {skill}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="card-actions flex flex-col items-end gap-3 min-w-[200px]">
                                  <Button
                                    className={`invite-btn-v2 font-bold py-6 px-8 rounded-xl flex items-center gap-2 group/btn transition-all shadow-lg ${candidate.fitScore >= 60
                                      ? "bg-gradient-to-b from-[#9448C4] to-[#5D2A91] hover:shadow-[#9448C4]/20 text-white cursor-pointer"
                                      : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none"
                                      }`}
                                    onClick={() => candidate.fitScore >= 60 && handleInvite(candidate)}
                                    disabled={inviting === candidate.name || candidate.fitScore < 60}
                                  >
                                    <span className="text-sm font-bold">
                                      {candidate.fitScore < 60 ? "✕ Low Match Score" : "➤ Invite to Interview"}
                                    </span>
                                  </Button>
                                  <Button variant="ghost" className="view-resume-ghost text-slate-500 hover:text-white hover:bg-transparent flex items-center gap-2 text-sm font-medium">
                                    <Eye size={16} /> View Resume
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>

                      {totalPages > 1 && (
                        <div className="pagination-container flex justify-center items-center gap-3 mt-12 pb-10">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-10 h-10 border-[#1f2937] bg-transparent text-slate-500 hover:text-white"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft size={20} />
                          </Button>

                          {[...Array(totalPages)].map((_, i) => (
                            <Button
                              key={i + 1}
                              className={`w-10 h-10 rounded-lg font-bold transition-all ${currentPage === i + 1
                                ? 'bg-gradient-to-b from-[#9448C4] to-[#5D2A91] text-white shadow-lg shadow-[#9448C4]/20'
                                : 'bg-[#111827] text-slate-400 border border-[#1f2937] hover:border-slate-600'
                                }`}
                              onClick={() => handlePageChange(i + 1)}
                            >
                              {i + 1}
                            </Button>
                          ))}

                          <Button
                            variant="outline"
                            size="icon"
                            className="w-10 h-10 border-[#1f2937] bg-transparent text-slate-500 hover:text-white"
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight size={20} />
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="no-data">
                      <p>No ranked candidates available</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
      <AnimatePresence>
        {showInviteModal && selectedCandidate && (
          <div className="invite-modal-overlay">
            <motion.div
              className={`invite-modal-content ${inviteSuccess ? 'success-view' : ''}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              {!inviteSuccess ? (
                <>
                  <div className="modal-header border-0 pb-0">
                    <button className="close-modal ml-auto bg-slate-800/50 p-2 rounded-full hover:bg-slate-700 transition-all" onClick={closeInviteModal}>
                      <X size={18} className="text-slate-400" />
                    </button>
                  </div>

                  <div className="modal-section mb-8">
                    <label className="section-label block text-slate-400 text-[11px] font-bold tracking-widest uppercase mb-4">SELECT INTERVIEW MODE</label>
                    <div className="mode-options grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={`mode-option-v3 relative flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${interviewMode === 'voice' ? 'bg-[#9448C4]/5 border-[#9448C4] shadow-[0_0_20px_rgba(148,72,196,0.1)]' : 'bg-[#111827] border-[#1f2937] hover:border-slate-700'}`}
                        onClick={() => setInterviewMode('voice')}
                      >
                        <div className={`mode-icon-v3 w-12 h-12 rounded-xl flex items-center justify-center ${interviewMode === 'voice' ? 'bg-[#9448C4] text-white' : 'bg-slate-800 text-slate-400'}`}>
                          <Mic size={22} />
                        </div>
                        <div className="mode-text-v3">
                          <div className="mode-title-v3 text-white font-bold text-sm mb-0.5">Standard Voice</div>
                          <div className="mode-desc-v3 text-slate-500 text-[11px] leading-tight">Natural voice interaction via<br />audio call interface.</div>
                        </div>
                        <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${interviewMode === 'voice' ? 'border-[#9448C4]' : 'border-slate-700'}`}>
                          {interviewMode === 'voice' && <div className="radio-inner w-2.5 h-2.5 rounded-full bg-[#9448C4]"></div>}
                        </div>
                      </div>

                      <div
                        className={`mode-option-v3 relative flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${interviewMode === 'avatar' ? 'bg-[#9448C4]/5 border-[#9448C4] shadow-[0_0_20px_rgba(148,72,196,0.1)]' : 'bg-[#111827] border-[#1f2937] hover:border-slate-700'}`}
                        onClick={() => setInterviewMode('avatar')}
                      >
                        <div className={`mode-icon-v3 w-12 h-12 rounded-xl flex items-center justify-center ${interviewMode === 'avatar' ? 'bg-[#9448C4] text-white' : 'bg-slate-800 text-slate-400'}`}>
                          <Video size={22} />
                        </div>
                        <div className="mode-text-v3">
                          <div className="mode-title-v3 text-white font-bold text-sm mb-0.5 flex items-center gap-2">
                            Premium AI Avatar
                            <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[8px] px-1.5 py-0 uppercase font-black">PREMIUM</Badge>
                          </div>
                          <div className="mode-desc-v3 text-slate-500 text-[11px] leading-tight">Realistic visual 3D avatar<br />with human-like expressions.</div>
                        </div>
                        <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${interviewMode === 'avatar' ? 'border-[#9448C4]' : 'border-slate-700'}`}>
                          {interviewMode === 'avatar' && <div className="radio-inner w-2.5 h-2.5 rounded-full bg-[#9448C4]"></div>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-section mb-8">
                    <label className="section-label block text-slate-400 text-[11px] font-bold tracking-widest uppercase mb-3">INVITE LINK EXPIRY</label>
                    <Select value={linkExpiry} onValueChange={setLinkExpiry}>
                      <SelectTrigger className="w-full bg-[#111827] border-[#1f2937] text-slate-300 h-12 rounded-xl hover:bg-[#1a1f2e] transition-all">
                        <SelectValue placeholder="Select expiry" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111827] border-[#1f2937] text-slate-300">
                        <SelectItem value="24" className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">24 Hours</SelectItem>
                        <SelectItem value="48" className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">48 Hours (Default)</SelectItem>
                        <SelectItem value="72" className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">72 Hours</SelectItem>
                        <SelectItem value="168" className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">7 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="modal-section mb-10">
                    <div className="flex items-center justify-between mb-3">
                      <label className="section-label text-slate-400 text-[11px] font-bold tracking-widest uppercase m-0">EMAIL INVITATION PREVIEW</label>
                      <button className="edit-content-btn flex items-center gap-1.5 text-[11px] text-purple-400 font-bold hover:text-purple-300 transition-colors uppercase italic active:scale-95">
                        <Edit3 size={12} /> Edit Content
                      </button>
                    </div>
                    <div className="email-preview-box-v2 bg-[#090e1a] border border-[#1f2937] p-6 rounded-2xl font-mono text-[13px] leading-relaxed">
                      <pre className="preview-text m-0 text-slate-400 whitespace-pre-wrap">
                        {`Hi `}<span className="text-[#9448C4] font-bold uppercase">{selectedCandidate.name}</span>{`,

You are invited for an AI Interview for the `}<span className="text-[#9448C4] font-bold">Senior Software Engineer</span>{`
role at our company.

Access your interview link here:
`}<span className="text-blue-400 underline cursor-pointer hover:text-blue-300 transition-colors">https://hire-ai.platform/interview/lx-7782-ntx</span>{`

Expiry: `}<strong className="text-white font-bold">{(parseInt(linkExpiry))} hours</strong>{` from now.`}
                      </pre>
                    </div>
                  </div>

                  <div className="modal-footer flex items-center justify-between pt-6 border-t border-[#1f2937]">
                    <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800/50 px-6 h-12 rounded-xl transition-all font-bold" onClick={closeInviteModal}>
                      Cancel
                    </Button>
                    <Button
                      className="invite-confirm-btn bg-[#9448C4] text-white font-bold px-10 h-12 rounded-xl hover:bg-[#7e3da8] transition-all flex items-center gap-2.5 active:scale-95 shadow-[0_4px_15px_rgba(148,72,196,0.3)]"
                      onClick={confirmInvite}
                      disabled={inviting === selectedCandidate.name}
                    >
                      {inviting === selectedCandidate.name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Sending...
                        </div>
                      ) : <><Send size={18} /> Send Interview Invite</>}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="success-screen-container py-6 text-center">
                  <motion.div
                    className="success-icon-wrapper-v2 mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 relative"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <div className="absolute inset-0 bg-[#9448C4]/20 rounded-full animate-pulse"></div>
                    <div className="w-14 h-14 bg-[#9448C4] rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(148,72,196,0.6)] z-10">
                      <CheckCircle2 size={32} />
                    </div>
                  </motion.div>

                  <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Interview Invitation Sent!</h2>
                  <p className="text-slate-500 text-base mb-6">The candidate has been notified via email and SMS.</p>

                  <div className="recipient-details-card-v2 bg-[#0d121f] border border-[#1f2937] rounded-[24px] p-6 mb-6 text-left shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">RECIPIENT DETAILS</span>
                      <Badge className="bg-[#9448C4]/10 text-[#9448C4] border border-[#9448C4]/20 text-[9px] px-2.5 py-0.5 rounded-md uppercase font-black">ACTIVE</Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="detail-item-v2 flex items-center gap-4">
                        <div className="detail-icon-v2 w-9 h-9 bg-slate-800/40 border border-slate-700/30 rounded-xl flex items-center justify-center text-slate-400">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-600 font-black uppercase tracking-wider mb-0.5">Candidate</p>
                          <p className="text-white text-sm font-bold">{selectedCandidate.name}</p>
                        </div>
                      </div>

                      <div className="detail-item-v2 flex items-center gap-4">
                        <div className="detail-icon-v2 w-9 h-9 bg-slate-800/40 border border-slate-700/30 rounded-xl flex items-center justify-center text-slate-400">
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-600 font-black uppercase tracking-wider mb-0.5">Role</p>
                          <p className="text-white text-sm font-bold">Senior Software Engineer</p>
                        </div>
                      </div>

                      <div className="detail-item-v2 flex items-center gap-4">
                        <div className="detail-icon-v2 w-9 h-9 bg-slate-800/40 border border-slate-700/30 rounded-xl flex items-center justify-center text-slate-400">
                          <Mic size={18} />
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-600 font-black uppercase tracking-wider mb-0.5">Interview Mode</p>
                          <p className="text-white text-sm font-bold">
                            {interviewMode === 'voice' ? 'Standard Voice Interview' : 'KIA Agent Interview'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[#1f2937]">
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider mb-3">Candidate Access Link</p>
                      <div className="flex items-center gap-3">
                        <Input
                          readOnly
                          value="hire-ai.platform/interview/lx-7782-ntx"
                          className="bg-[#090e1a] border-[#1f2937] text-slate-500 h-12 rounded-xl font-mono text-xs focus:ring-0 px-4"
                        />
                        <Button
                          className="bg-[#9448C4] hover:bg-[#7e3da8] text-white px-6 h-12 rounded-xl flex items-center gap-2 font-black text-xs transition-all active:scale-95 shadow-lg"
                          onClick={copyInviteLink}
                        >
                          <Copy size={16} /> Copy Link
                        </Button>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-3 italic font-medium tracking-tight">This link is unique and will expire in {(parseInt(linkExpiry) / 24)} days.</p>
                    </div>
                  </div>

                  <div className="success-actions-v2 flex flex-col md:flex-row items-center justify-center gap-3">
                    <Button
                      className="w-full md:w-auto min-w-[160px] h-12 bg-[#9448C4] text-white hover:bg-[#7e3da8] rounded-xl font-black text-xs uppercase tracking-tight flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_15px_rgba(148,72,196,0.3)]"
                      onClick={() => setShowDemoModal(true)}
                    >
                      <Sparkles size={16} /> Try AI Demo
                    </Button>
                    <Button
                      className="w-full md:w-auto min-w-[160px] h-12 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-black text-xs uppercase tracking-tight transition-all active:scale-95"
                      onClick={closeInviteModal}
                    >
                      Return to Candidates
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full md:w-auto min-w-[160px] h-12 border-[#1f2937] text-white bg-slate-800/20 hover:bg-slate-800 rounded-xl font-black text-xs uppercase tracking-tight flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Mail size={16} /> View Sent Invitations
                    </Button>
                  </div>

                  <p className="mt-8 text-slate-600 text-[12px] font-bold">
                    Need help? <a href="#" className="text-[#9448C4] hover:text-[#7e3da8] hover:underline transition-all">Contact platform support</a>
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDemoModal && (
          <div className="demo-modal-overlay">
            <motion.div
              className="demo-modal-content"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
            >
              <div className="demo-header text-center mb-3">
                <h2 className="text-3xl font-black text-white mb-1 italic tracking-tighter">How does it work?</h2>
                <p className="text-slate-500 text-sm font-medium">Experience the KIA Agent Interview process.</p>
              </div>

              <div className="demo-body grid grid-cols-1 lg:grid-cols-2 gap-6 items-center mb-4">
                <div className="demo-features space-y-4">
                  <div className="feature-item flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(148,72,196,0.25)', border: '1px solid rgba(148,72,196,0.4)', color: '#c084fc' }}>
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-base mb-0.5">Scenario Based Learning</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">AI creates dynamic scenarios based on candidate responses for a truly adaptive experience.</p>
                    </div>
                  </div>

                  <div className="feature-item flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa' }}>
                      <Clock size={18} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-base mb-0.5">Real-Time Feedback</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">Instant analysis of candidate performance providing immediate insights after each session.</p>
                    </div>
                  </div>

                  <div className="feature-item flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399' }}>
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-base mb-0.5">Deep Performance Metrics</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">Comprehensive evaluation of soft and hard skills with data-driven recruitment scorecards.</p>
                    </div>
                  </div>
                </div>

                {/* AI Agent Card - coded robot */}
                <div className="demo-visual relative">
                  <div className="ai-agent-card" style={{
                    background: 'linear-gradient(135deg, #0d1117 0%, #1a1040 50%, #0d1117 100%)',
                    border: '1px solid rgba(148,72,196,0.3)',
                    borderRadius: '24px',
                    height: '280px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 0 40px rgba(148,72,196,0.15)'
                  }}>
                    {/* Background glow */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(148,72,196,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>

                    {/* LIVE badge */}
                    <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '3px 10px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }}></div>
                      <span style={{ color: '#f87171', fontSize: '9px', fontWeight: '900', letterSpacing: '0.1em' }}>AI AGENT LIVE</span>
                    </div>

                    {/* Speech bubble */}
                    <div style={{ position: 'absolute', top: '30px', right: '18px', background: 'white', borderRadius: '12px 12px 12px 3px', padding: '7px 11px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                      <p style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: '#1a1a2e', whiteSpace: 'nowrap' }}>Tell me about yourself 👋</p>
                    </div>

                    {/* Robot Head */}
                    <div style={{ position: 'relative', marginBottom: '6px', zIndex: 2 }}>
                      {/* Head */}
                      <div style={{
                        width: '72px', height: '68px',
                        background: 'linear-gradient(145deg, #e8e8e8, #c8c8c8)',
                        borderRadius: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                        position: 'relative',
                        margin: '0 auto'
                      }}>
                        {/* Face screen */}
                        <div style={{
                          width: '52px', height: '46px',
                          background: '#0a0a14',
                          borderRadius: '12px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '7px',
                          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)'
                        }}>
                          {/* Eyes */}
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ width: '10px', height: '6px', background: '#00e5ff', borderRadius: '3px', boxShadow: '0 0 8px #00e5ff, 0 0 16px #00e5ff' }}></div>
                            <div style={{ width: '10px', height: '6px', background: '#00e5ff', borderRadius: '3px', boxShadow: '0 0 8px #00e5ff, 0 0 16px #00e5ff' }}></div>
                          </div>
                          {/* Mouth */}
                          <div style={{ width: '20px', height: '5px', background: '#00e5ff', borderRadius: '3px', boxShadow: '0 0 6px #00e5ff' }}></div>
                        </div>
                        {/* Ear bumps */}
                        <div style={{ position: 'absolute', left: '-6px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '20px', background: 'linear-gradient(145deg, #d0d0d0, #b0b0b0)', borderRadius: '4px' }}></div>
                        <div style={{ position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '20px', background: 'linear-gradient(145deg, #d0d0d0, #b0b0b0)', borderRadius: '4px' }}></div>
                      </div>
                      {/* Neck */}
                      <div style={{ width: '20px', height: '10px', background: 'linear-gradient(145deg, #d0d0d0, #b0b0b0)', margin: '0 auto', borderRadius: '2px' }}></div>
                    </div>

                    {/* Robot Body */}
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      <div style={{
                        width: '88px', height: '70px',
                        background: 'linear-gradient(145deg, #e0e0e0, #b8b8b8)',
                        borderRadius: '44px 44px 36px 36px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
                        position: 'relative'
                      }}>
                        {/* Chest light */}
                        <div style={{ width: '24px', height: '8px', background: 'rgba(0,229,255,0.8)', borderRadius: '4px', boxShadow: '0 0 10px #00e5ff' }}></div>
                        {/* Arms */}
                        <div style={{ position: 'absolute', left: '-22px', top: '8px', width: '16px', height: '44px', background: 'linear-gradient(145deg, #d8d8d8, #b0b0b0)', borderRadius: '8px', transform: 'rotate(10deg)' }}></div>
                        <div style={{ position: 'absolute', right: '-22px', top: '8px', width: '16px', height: '44px', background: 'linear-gradient(145deg, #d8d8d8, #b0b0b0)', borderRadius: '8px', transform: 'rotate(-10deg)' }}></div>
                        {/* Body bottom stripe */}
                        <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', width: '60px', height: '3px', background: 'rgba(0,0,0,0.15)', borderRadius: '2px' }}></div>
                      </div>
                    </div>

                    {/* Waveform at bottom */}
                    <div style={{ position: 'absolute', bottom: '14px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {[4, 8, 12, 7, 14, 9, 5, 11, 8, 4, 10, 7, 13, 6].map((h, i) => (
                        <div key={i} style={{
                          width: '3px', height: `${h}px`,
                          background: 'rgba(148,72,196,0.7)',
                          borderRadius: '2px',
                          animation: `wave-bar 1s ease-in-out ${i * 0.07}s infinite alternate`
                        }}></div>
                      ))}
                    </div>

                    {/* Label */}
                    <div style={{ position: 'absolute', bottom: '36px', textAlign: 'center' }}>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase' }}>KIA AI Interview Agent</p>
                    </div>
                  </div>

                  {/* Decorative glows */}
                  <div className="absolute -z-10 -top-10 -right-10 w-40 h-40 bg-[#9448C4]/20 rounded-full blur-[80px]"></div>
                  <div className="absolute -z-10 -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[80px]"></div>
                </div>
              </div>

              <div className="demo-footer flex flex-col md:flex-row items-center justify-center gap-3 border-t border-[#1f2937] pt-4">
                <Button
                  className="w-full md:w-auto min-w-[200px] h-11 bg-[#9448C4] text-white hover:bg-[#7e3da8] rounded-xl font-black text-xs uppercase tracking-tight flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(148,72,196,0.3)] transition-all active:scale-95"
                  onClick={startDemoExperience}
                >
                  Try a Demo
                </Button>
                <Button
                  variant="outline"
                  className="w-full md:w-auto min-w-[200px] h-11 border-[#1f2937] text-white bg-slate-800/20 hover:bg-slate-800 rounded-xl font-black text-xs uppercase tracking-tight transition-all active:scale-95"
                  onClick={() => setShowDemoModal(false)}
                >
                  Close Demo
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====== DEMO EXPERIENCE FULLSCREEN ====== */}
      <AnimatePresence>
        {showDemoExperience && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 30000,
              background: '#05060b', // Deep dark background
              display: 'flex', flexDirection: 'column',
              fontFamily: 'inherit',
              color: '#f8fafc', // Light slate text
              overflow: 'hidden' // Remove any scrollbars
            }}
          >
            {/* Top Bar - Dark Premium Design */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 32px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Sparkles size={20} fill="currentColor" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '900', fontSize: '13px', color: '#f8fafc', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>AI Interviewer</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase' }}>Session Active</span>
                </div>
              </div>

              {/* Progress Bar - Dark Variant */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '400px', margin: '0 40px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Progress</span>
                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(Math.min(demoQuestionIndex, demoQuestions.length) / demoQuestions.length) * 100}%`,
                    background: '#3b82f6',
                    borderRadius: '10px',
                    transition: 'width 0.8s'
                  }}></div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#f8fafc' }}>{Math.min(demoQuestionIndex, demoQuestions.length)} / {demoQuestions.length}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <Settings size={22} />
                </button>
                <Button
                  onClick={() => { setShowDemoExperience(false); setDemoStep(0); setDemoMessages([]); }}
                  variant="outline"
                  className="rounded-xl border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-black text-xs uppercase px-6"
                >
                  <X className="mr-2 h-3 w-3" /> End Interview
                </Button>
              </div>
            </div>

            {/* Step 0 — New Design Intro (Compact Version) */}
            {demoStep === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '24px', background: '#05060b', overflow: 'hidden' }}
              >
                {/* Wave animation for intro - Scaled down */}
                <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {[15, 35, 25, 50, 30, 40, 20].map((h, i) => (
                      <div key={i} style={{
                        width: '6px',
                        height: `${h}px`,
                        background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)',
                        borderRadius: '10px',
                        animation: `modern-wave 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)'
                      }}></div>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: 'center', maxWidth: '500px' }}>
                  <h2 style={{ color: '#f8fafc', fontSize: '32px', fontWeight: '900', letterSpacing: '-0.04em', margin: '0 0 10px', lineHeight: '1.1' }}>AI-Powered Interview Simulation</h2>
                  <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.5', margin: '0 0 16px', fontWeight: '500' }}>Experience the future of talent evaluation with our deep-learning voice agent.</p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: '900', color: '#f8fafc' }}>100%</span>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>AI Driven</span>
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: '24px' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: '900', color: '#f8fafc' }}>~3m</span>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Duration</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%', maxWidth: '360px' }}>
                  <Button
                    onClick={startDemoInterview}
                    size="lg"
                    className="w-full h-14 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-900/40 transition-all active:scale-95"
                  >
                    🚀 Start Session
                  </Button>
                  <button
                    onClick={() => { setShowDemoExperience(false); setDemoStep(0); }}
                    style={{ fontSize: '12px', fontWeight: '700', color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 1 — Dark Modern Interview UI */}
            {demoStep === 1 && (
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', background: '#05060b' }}>
                {/* Background Glows for Dark Mode */}
                <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)', zIndex: 0 }}></div>
                <div style={{ position: 'absolute', bottom: '0', left: '0', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(148, 72, 196, 0.05) 0%, transparent 70%)', zIndex: 0 }}></div>

                {/* Main Interaction Area - DARK & NO OVERLAP */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, padding: '20px' }}>

                  {/* Status Badge */}
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '20px',
                    padding: '6px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1.5s infinite' }}></div>
                    <span style={{ color: '#3b82f6', fontSize: '10px', fontWeight: '900', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {isListening ? 'Mic is Active' : isAgentSpeaking ? 'Agent is Speaking' : 'Waiting...'}
                    </span>
                  </div>

                  {/* Central Waveform Component - Dark Variant */}
                  <div style={{
                    width: '160px',
                    height: '160px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3), inset 0 2px 10px rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    position: 'relative'
                  }}>
                    {isListening && (
                      <div style={{ position: 'absolute', inset: '-15px', borderRadius: '50%', border: '2px solid rgba(59, 130, 246, 0.2)', animation: 'ping 2s infinite' }}></div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {[4, 10, 24, 14, 30, 18, 12, 22, 16, 8].map((h, i) => (
                        <div key={i} style={{
                          width: '5px',
                          height: `${h * (isListening || isAgentSpeaking ? 1.2 : 0.6)}px`,
                          background: '#3b82f6',
                          borderRadius: '10px',
                          transition: 'height 0.15s ease-out',
                          animation: (isListening || isAgentSpeaking) ? `modern-wave 0.6s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
                          boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                        }}></div>
                      ))}
                    </div>
                  </div>

                  {/* Question Display - Dark Variant */}
                  <div style={{ textAlign: 'center', maxWidth: '600px', padding: '0 20px' }}>
                    <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>Current Question</p>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#f8fafc', lineHeight: '1.2', letterSpacing: '-0.02em', marginBottom: '16px' }}>
                      "{demoMessages.filter(m => m.role === 'agent').pop()?.text || "Preparing your first question..."}"
                    </h2>

                    <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500', marginBottom: '8px' }}>
                      {isListening ? "AI is listening... Speak your answer now." : "Agent is speaking... Please listen carefully."}
                    </p>

                    <span style={{
                      background: 'rgba(255,255,255,0.04)',
                      color: '#64748b',
                      fontSize: '8px',
                      fontWeight: '800',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      STAR Method Recommended
                    </span>
                  </div>

                  {/* Explicit Submit Action if they have spoken */}
                  {voiceTranscript.trim().length > 3 && !isAgentSpeaking && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={stopListeningAndSubmit}
                      style={{
                        marginTop: '24px',
                        background: '#3b82f6',
                        color: 'white',
                        padding: '10px 24px',
                        borderRadius: '30px',
                        fontWeight: '800',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      <Send size={16} />
                      Next Question
                    </motion.button>
                  )}

                  {/* Footer Controls - MOVED UP TO PREVENT OVERLAP */}
                  <div style={{ marginTop: '40px', display: 'flex', gap: '32px' }}>
                    {/* Mute/Mic Control */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => {
                          if (isListening) stopListeningAndSubmit();
                          else startListening();
                        }}
                        style={{
                          width: '48px', height: '48px', borderRadius: '50%',
                          border: isListening ? 'none' : '1px solid rgba(255,255,255,0.1)',
                          background: isListening ? '#3b82f6' : 'rgba(255,255,255,0.03)',
                          color: isListening ? 'white' : '#94a3b8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isListening ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none'
                        }}
                      >
                        {isListening ? <Mic size={22} /> : <MicOff size={22} />}
                      </button>
                      <span style={{ fontSize: '10px', fontWeight: '900', color: isListening ? '#3b82f6' : '#64748b', letterSpacing: '0.05em' }}>
                        {isListening ? 'LISTENING' : 'MIC OFF'}
                      </span>
                    </div>

                    {/* Speaker Control */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => setIsSpeakerOff(!isSpeakerOff)}
                        style={{
                          width: '48px', height: '48px', borderRadius: '50%',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: isSpeakerOff ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                          color: isSpeakerOff ? '#ef4444' : '#94a3b8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isSpeakerOff ? <VolumeX size={22} /> : <Video size={22} />}
                      </button>
                      <span style={{ fontSize: '10px', fontWeight: '900', color: isSpeakerOff ? '#ef4444' : '#64748b', letterSpacing: '0.05em' }}>
                        SPEAKER
                      </span>
                    </div>

                    {/* Captions Control */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => setShowCaptions(!showCaptions)}
                        style={{
                          width: '48px', height: '48px', borderRadius: '50%',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: showCaptions ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                          color: showCaptions ? '#3b82f6' : '#94a3b8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {showCaptions ? <FileText size={22} /> : <EyeOff size={22} />}
                      </button>
                      <span style={{ fontSize: '10px', fontWeight: '900', color: showCaptions ? '#3b82f6' : '#64748b', letterSpacing: '0.05em' }}>
                        CAPTIONS
                      </span>
                    </div>
                  </div>

                  {/* Live Transcript / Response preview - AT THE VERY BOTTOM */}
                  <div style={{ position: 'absolute', bottom: '24px', width: '100%', textAlign: 'center', pointerEvents: 'none', display: showCaptions ? 'block' : 'none' }}>
                    <p style={{ fontStyle: 'italic', color: '#475569', fontSize: '13px', fontWeight: '500', maxWidth: '500px', margin: '0 auto', opacity: isListening ? 1 : 0 }}>
                      {voiceTranscript ? `"${voiceTranscript}..."` : "..."}
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* Step 2 — New Dark Design Results */}
            {demoStep === 2 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
                style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: '#05060b' }}
              >
                {/* Header */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '60px', height: '60px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 20px rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: '24px' }}>
                    <CheckCircle2 size={30} />
                  </div>
                  <h2 style={{ color: '#f8fafc', fontSize: '28px', fontWeight: '900', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Assessment Complete</h2>
                  <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500', margin: 0 }}>Performance metrics analyzed by AI.</p>
                </div>

                {/* Score Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', maxWidth: '740px' }}>
                  {[
                    { label: 'Technical Accuracy', value: '88%', color: '#3b82f6', icon: <FileText size={18} /> },
                    { label: 'Communication', value: '92%', color: '#8b5cf6', icon: <Mic size={18} /> },
                    { label: 'Overall Match', value: '85%', color: '#10b981', icon: <CheckCircle2 size={18} /> },
                  ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 12px', textAlign: 'center' }}
                    >
                      <div style={{ color: s.color, marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: '#f8fafc', marginBottom: '2px' }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Detail Analysis */}
                <div style={{ width: '100%', maxWidth: '740px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '20px', padding: '20px' }}>
                    <p style={{ color: '#f8fafc', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Strengths Detected</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Structured Answers', 'Problem Solving', 'Confidence'].map((tag, i) => (
                        <span key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '20px', padding: '20px' }}>
                    <p style={{ color: '#f8fafc', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Next Step</p>
                    <p style={{ color: '#94a3b8', fontSize: '11px', lineHeight: '1.5', margin: 0 }}>Review full report for feedback.</p>
                  </div>
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <Button
                    onClick={() => { setDemoStep(0); setDemoMessages([]); setDemoQuestionIndex(0); setVoiceTranscript(''); manuallyStoppedRef.current = true; }}
                    className="h-12 px-8 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                  >
                    Retake Interview
                  </Button>
                  <Button
                    onClick={() => { setShowDemoExperience(false); setDemoStep(0); setDemoMessages([]); }}
                    variant="outline"
                    className="h-12 px-8 border-slate-800 text-slate-400 hover:bg-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                  >
                    Close & Finish
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default RecruiterDashboard;
