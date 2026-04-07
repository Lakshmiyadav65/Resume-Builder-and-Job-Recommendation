import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FcHighPriority, FcOk } from 'react-icons/fc';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { validateInterviewToken, getInterviewQuestion, submitInterviewAnswer } from '../services/api';
import { Mic, MicOff, Video, Camera, ShieldCheck, Lock, CheckCircle2, Send, Pause, FileText, MoreHorizontal, Sparkles } from 'lucide-react';
import './InterviewPage.css';

const InterviewPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  // --- Auth & Loading ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [candidate, setCandidate] = useState(null);

  // --- Flow Steps ---
  // flowStep: 0=identity capture, 1=welcome+hardware, 2=live interview, 3=completed
  const [flowStep, setFlowStep] = useState(0);
  const [introPhase, setIntroPhase] = useState(0); // 0=overview, 1=hardware check

  // --- Interview State ---
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [totalQuestions] = useState(5);
  const [showCaptions, setShowCaptions] = useState(true);

  // --- Hardware ---
  const [cameraDetected, setCameraDetected] = useState(false);
  const [micDetected, setMicDetected] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // --- Refs ---
  const recognitionRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraPreviewRef = useRef(null);

  // Callback ref: auto-attach camera stream whenever a new video element mounts
  const setCameraRef = (el) => {
    cameraPreviewRef.current = el;
    if (el && cameraStreamRef.current) {
      el.srcObject = cameraStreamRef.current;
      el.play().catch(() => {});
    }
  };
  const manuallyStoppedRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const speakGenRef = useRef(0);
  const micAudioCtxRef = useRef(null);
  const micActiveRef = useRef(false);
  const userAnswersRef = useRef([]);

  // --- Validate Token ---
  useEffect(() => {
    const init = async () => {
      try {
        const res = await validateInterviewToken(token);
        if (res.success) {
          setCandidate(res.candidate);
        } else {
          setError(res.error || 'Invalid or expired interview link');
        }
      } catch (err) {
        setError('Connection error. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  // --- Camera Sync ---
  useEffect(() => {
    if (cameraDetected && cameraStreamRef.current && cameraPreviewRef.current) {
      cameraPreviewRef.current.srcObject = cameraStreamRef.current;
      cameraPreviewRef.current.play().catch(() => {});
    }
  }, [cameraDetected, flowStep, introPhase]);

  // --- Request Permissions ---
  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      setCameraDetected(true);
      setMicDetected(true);

      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = stream;
        cameraPreviewRef.current.play().catch(() => {});
      }

      // Mic level monitoring
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      micAudioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      micActiveRef.current = true;

      const checkLevel = () => {
        if (!micActiveRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(8, Math.round(avg / 12)));
        requestAnimationFrame(checkLevel);
      };
      checkLevel();
    } catch (err) {
      console.warn('Permission denied:', err);
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicDetected(true);
      } catch (_) {}
    }
  };

  useEffect(() => {
    requestPermissions();
    return () => {
      micActiveRef.current = false;
      if (micAudioCtxRef.current) micAudioCtxRef.current.close().catch(() => {});
      if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line

  // --- Capture Photo ---
  const capturePhoto = () => {
    if (!cameraPreviewRef.current || !cameraDetected) return;
    setIsCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      canvas.getContext('2d').drawImage(cameraPreviewRef.current, 0, 0, 640, 480);
      setCapturedPhoto(canvas.toDataURL('image/jpeg'));
      setTimeout(() => {
        setIsCapturing(false);
        setFlowStep(1);
      }, 1500);
    } catch (e) {
      setIsCapturing(false);
    }
  };

  // --- Speech Synthesis ---
  const speakText = (text, onEnd) => {
    const myGen = ++speakGenRef.current;
    if (recognitionRef.current) {
      manuallyStoppedRef.current = true;
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);

    if (!window.speechSynthesis) {
      setIsAgentSpeaking(true);
      setTimeout(() => { if (speakGenRef.current !== myGen) return; setIsAgentSpeaking(false); onEnd && onEnd(); }, 1500);
      return;
    }

    let onEndCalled = false;
    const safeOnEnd = () => { if (onEndCalled) return; onEndCalled = true; setIsAgentSpeaking(false); if (onEnd) setTimeout(onEnd, 400); };

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.onstart = () => { if (speakGenRef.current !== myGen) return; setIsAgentSpeaking(true); };
    utter.onend = () => { if (speakGenRef.current !== myGen) return; safeOnEnd(); };
    utter.onerror = () => { if (speakGenRef.current !== myGen) return; safeOnEnd(); };

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Microsoft Aria'));
    if (preferred) utter.voice = preferred;

    window.speechSynthesis.speak(utter);

    const estimatedMs = Math.max(8000, text.length * 150);
    setTimeout(() => { if (speakGenRef.current !== myGen) return; if (!onEndCalled) safeOnEnd(); }, estimatedMs);
  };

  // --- Speech Recognition ---
  const startListening = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      manuallyStoppedRef.current = true;
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }

    accumulatedTranscriptRef.current = '';
    setVoiceTranscript('');

    let warmupStream = null;
    try {
      warmupStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (_) { return; }

    manuallyStoppedRef.current = false;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      if (warmupStream) { warmupStream.getTracks().forEach(t => t.stop()); warmupStream = null; }
    };

    recognition.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += chunk + ' ';
        else interim += chunk;
      }
      if (final.trim()) accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + final).trim();
      setVoiceTranscript((accumulatedTranscriptRef.current + ' ' + interim).trim());
    };

    recognition.onend = () => {
      if (!manuallyStoppedRef.current) {
        try { recognition.start(); } catch (_) { setIsListening(false); }
      } else { setIsListening(false); }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      manuallyStoppedRef.current = true;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (_) {
      setIsListening(false);
      if (warmupStream) warmupStream.getTracks().forEach(t => t.stop());
    }
  };

  const stopListeningAndSubmit = () => {
    manuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch (_) {}
    }
    setIsListening(false);

    const finalAnswer = (accumulatedTranscriptRef.current || voiceTranscript).trim();
    setVoiceTranscript('');
    accumulatedTranscriptRef.current = '';

    if (finalAnswer.length > 4) {
      submitAnswer(finalAnswer);
    } else {
      setTimeout(() => startListening(), 500);
    }
  };

  // --- Interview Flow ---
  const startInterview = () => {
    setFlowStep(2);
    fetchNextQuestion();
  };

  const fetchNextQuestion = async () => {
    setIsAgentSpeaking(true);
    try {
      const res = await getInterviewQuestion(token, 1);
      if (res.success) {
        setCurrentQuestion(res.question);
        speakText(res.question, () => startListening());
      }
    } catch (err) {
      setError('Failed to fetch question. Please refresh.');
    }
  };

  const submitAnswer = async (answer) => {
    userAnswersRef.current.push(answer);
    setQuestionsAnswered(prev => prev + 1);

    try {
      const res = await submitInterviewAnswer({ token, stage: 1, question: currentQuestion, answer });

      if (res.success) {
        const answered = questionsAnswered + 1;
        if (answered >= totalQuestions) {
          const closing = "Excellent work! That concludes your interview. Thank you for your time — the hiring team will review your performance shortly.";
          speakText(closing, () => setFlowStep(3));
        } else {
          const followup = "Thank you for your answer. Let's move to the next question.";
          speakText(followup, () => fetchNextQuestion());
        }
      }
    } catch (err) {
      speakText("I had trouble processing that. Let me ask another question.", () => fetchNextQuestion());
    }
  };

  // --- Cleanup ---
  const cleanupAndClose = () => {
    micActiveRef.current = false;
    if (micAudioCtxRef.current) { micAudioCtxRef.current.close().catch(() => {}); micAudioCtxRef.current = null; }
    if (cameraStreamRef.current) { cameraStreamRef.current.getTracks().forEach(t => t.stop()); cameraStreamRef.current = null; }
    ++speakGenRef.current;
    window.speechSynthesis && window.speechSynthesis.cancel();
    navigate('/');
  };

  // --- Render ---
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#06060e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontSize: '16px', fontWeight: '700' }}>
      <div className="spinner" style={{ width: 40, height: 40, marginRight: 16 }} />
      Verifying your interview link...
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#06060e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: 40 }}>
      <FcHighPriority style={{ fontSize: 64, marginBottom: 16 }} />
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{error}</h2>
      <p style={{ color: '#94a3b8', fontSize: 14 }}>Please contact the recruiter who shared this link.</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#06060e', color: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* Top Bar */}
      {flowStep >= 2 && (
        <div style={{ height: '60px', background: 'rgba(6,6,14,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', backdropFilter: 'blur(20px)', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>AI INTERVIEWER</p>
              <p style={{ margin: 0, fontSize: 10, color: '#10b981', fontWeight: 700 }}>SESSION ACTIVE</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Progress</span>
            <div style={{ width: 200, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
              <motion.div animate={{ width: `${(questionsAnswered / totalQuestions) * 100}%` }} style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: 10 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800 }}>{questionsAnswered} / {totalQuestions}</span>
          </div>
          <Button onClick={cleanupAndClose} style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontWeight: 800, fontSize: 12, padding: '8px 20px' }}>
            END INTERVIEW
          </Button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AnimatePresence mode="wait">

          {/* STEP 0: Identity Capture */}
          {flowStep === 0 && (
            <motion.div key="identity" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '10px 20px', background: 'rgba(99,102,241,0.1)', borderRadius: 100, border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
                Security Verification Initialized
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.03em' }}>
                Let's verify your <span style={{ background: 'linear-gradient(135deg, #9448C4, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Identity</span>
              </h1>
              <p style={{ color: '#94a3b8', fontSize: 13, maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.5 }}>
                Before entering the assessment room, we need a high-resolution biometric reference photo for security purposes.
              </p>

              <div style={{ maxWidth: 420, margin: '0 auto', position: 'relative' }}>
                <div style={{ background: '#000', borderRadius: 24, aspectRatio: '4/3', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.05)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
                  {cameraDetected ? (
                    <video ref={setCameraRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                      <div className="spinner" style={{ width: 36, height: 36 }} />
                      <span style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>Initializing Camera...</span>
                    </div>
                  )}
                  {isCapturing && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 10 }} />}
                </div>

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={!cameraDetected || isCapturing}
                    onClick={capturePhoto}
                    style={{ padding: '14px 32px', borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 12px 24px rgba(79,70,229,0.3)' }}>
                    <Camera size={18} /> {isCapturing ? 'Capturing...' : 'Capture Reference Photo'}
                  </motion.button>
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 20, justifyContent: 'center', opacity: 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
                  <ShieldCheck size={16} className="text-indigo-400" />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>ISO 27001 Certified</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
                  <Lock size={16} className="text-indigo-400" />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>RSA-2048 Encryption</span>
                </div>
              </div>
              <p style={{ color: '#475569', fontSize: 10, marginTop: 10 }}>Data is processed locally for evaluation and discarded upon exit.</p>
            </motion.div>
          )}

          {/* STEP 1: Welcome + Hardware Check */}
          {flowStep === 1 && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ maxWidth: 800, width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.04em' }}>
                  Welcome to your AI Interview for<br />
                  <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{candidate?.jobTitle || 'the position'}</span>
                </h1>
                <p style={{ color: '#94a3b8', fontSize: 13, maxWidth: 500, margin: '0 auto' }}>Hello {candidate?.candidateName}! We'll evaluate your technical mindset through voice-based AI assessment.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Hardware Status */}
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 16px' }}>Hardware Status</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cameraDetected ? '#10b981' : '#ef4444', boxShadow: cameraDetected ? '0 0 8px #10b981' : 'none' }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Camera: {cameraDetected ? 'Connected' : 'Not detected'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: micDetected ? '#10b981' : '#ef4444', boxShadow: micDetected ? '0 0 8px #10b981' : 'none' }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Microphone: {micDetected ? 'Active' : 'Not detected'}</span>
                    </div>
                    {/* Mic Level */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                      {Array.from({ length: 8 }).map((_, idx) => {
                        const active = idx < micLevel;
                        const color = idx < 3 ? '#10b981' : idx < 6 ? '#f59e0b' : '#ef4444';
                        return <div key={idx} style={{ flex: 1, height: 8, borderRadius: 3, background: active ? color : 'rgba(255,255,255,0.08)', transition: 'all 0.15s' }} />;
                      })}
                    </div>
                    <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>SPEAK TO TEST MIC LEVEL</span>
                  </div>
                </div>

                {/* Camera Preview */}
                <div style={{ background: '#000', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', aspectRatio: '16/10' }}>
                  {cameraDetected ? (
                    <video ref={setCameraRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={24} color="#1e293b" /></div>
                  )}
                  <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 100, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>Live</span>
                  </div>
                </div>
              </div>

              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={startInterview}
                disabled={!cameraDetected || !micDetected}
                style={{
                  width: '100%', padding: 16, borderRadius: 14, border: 'none',
                  background: (cameraDetected && micDetected) ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.03)',
                  color: (cameraDetected && micDetected) ? '#fff' : '#475569',
                  fontWeight: 900, fontSize: 15,
                  cursor: (cameraDetected && micDetected) ? 'pointer' : 'not-allowed',
                  boxShadow: (cameraDetected && micDetected) ? '0 8px 16px rgba(124,58,237,0.2)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                }}>
                Enter Assessment Room {(cameraDetected && micDetected) && <Sparkles size={14} />}
              </motion.button>
            </motion.div>
          )}

          {/* STEP 2: Live Interview */}
          {flowStep === 2 && (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ width: '100%', maxWidth: 1200, display: 'flex', gap: 0, height: 'calc(100vh - 60px)' }}>

              {/* Left: AI Agent */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, position: 'relative' }}>
                {/* Voice Visualizer */}
                <div style={{ width: 180, height: 180, borderRadius: '50%', background: '#090c14', border: isListening ? '2px solid #3b82f6' : '1.5px solid rgba(255,255,255,0.1)', boxShadow: isListening ? '0 0 40px rgba(59,130,246,0.2)' : '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <motion.div key={i} style={{ width: 3, background: '#6366f1', borderRadius: 4 }}
                        animate={{ height: (isListening || isAgentSpeaking) ? [20, 50, 25, 45, 20] : [10, 15, 10] }}
                        transition={{ repeat: Infinity, duration: 0.8 + i * 0.05, delay: i * 0.04 }} />
                    ))}
                  </div>
                </div>

                {/* Question + Transcript */}
                <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', padding: '16px 20px', borderRadius: '20px 20px 20px 4px', fontSize: 15, color: '#f8fafc', lineHeight: 1.5, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>AI Agent</span>
                    "{currentQuestion || 'Preparing your first question...'}"
                  </div>

                  {showCaptions && voiceTranscript && isListening && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', padding: '16px 20px', borderRadius: '20px 20px 20px 4px', fontSize: 15, color: '#93c5fd', fontStyle: 'italic', lineHeight: 1.5 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>You (Transcribing)</span>
                      "{voiceTranscript}"
                    </motion.div>
                  )}
                </div>

                {/* Next Question Button */}
                {voiceTranscript.trim().length > 5 && isListening && (
                  <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={stopListeningAndSubmit}
                    style={{ position: 'absolute', bottom: 40, right: 40, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', padding: '14px 28px', borderRadius: 16, fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', gap: 12, border: 'none', cursor: 'pointer', boxShadow: '0 15px 30px rgba(79,70,229,0.3)', textTransform: 'uppercase', zIndex: 10 }}>
                    <Send size={18} /> Next Question
                  </motion.button>
                )}
              </div>

              {/* Right: Camera Feed */}
              <div style={{ width: 420, background: '#000', position: 'relative' }}>
                {cameraDetected ? (
                  <video ref={setCameraRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e293b' }}><Video size={40} /></div>
                )}
                <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.6)', borderRadius: 100, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                  <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student: Active</span>
                </div>
                {isListening && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 100, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1.5s infinite' }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase' }}>Listening</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Completed */}
          {flowStep === 3 && (
            <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', maxWidth: 500 }}>
              <FcOk style={{ fontSize: 80, margin: '0 auto 24px' }} />
              <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Interview Completed!</h1>
              <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
                Thank you, <strong>{candidate?.candidateName}</strong>. Your responses have been recorded and a detailed performance report has been sent to the hiring team.
              </p>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 32 }}>
                You answered {questionsAnswered} out of {totalQuestions} questions. You will be contacted if you advance to the next round.
              </p>
              <Button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', padding: '14px 40px', borderRadius: 12, fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer' }}>
                Return Home
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Bottom Toolbar (during interview) */}
      {flowStep === 2 && (
        <div style={{ height: 80, background: 'rgba(3,4,7,0.8)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, backdropFilter: 'blur(20px)', zIndex: 100 }}>
          <Button variant="ghost" size="icon" style={{ width: 50, height: 50, borderRadius: 14, background: showCaptions ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: '#fff' }}
            onClick={() => setShowCaptions(!showCaptions)}>
            <FileText size={22} color={showCaptions ? '#818cf8' : 'white'} />
          </Button>
          <Button variant="ghost" size="icon"
            style={{ width: 56, height: 56, borderRadius: 16, background: isListening ? '#6366f1' : 'rgba(255,255,255,0.05)', color: '#fff', boxShadow: isListening ? '0 0 20px rgba(99,102,241,0.3)' : 'none' }}
            onClick={() => { if (isListening) stopListeningAndSubmit(); else startListening(); }}>
            {isListening ? <Mic size={24} /> : <MicOff size={24} />}
          </Button>
          <Button variant="ghost" size="icon" style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
            <Video size={22} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default InterviewPage;
