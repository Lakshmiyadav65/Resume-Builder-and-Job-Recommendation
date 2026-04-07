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
    if (el && cameraStreamRef.current && el.srcObject !== cameraStreamRef.current) {
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

  // Camera sync handled by setCameraRef callback — no useEffect needed

  // --- Request Permissions ---
  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      setCameraDetected(true);
      setMicDetected(true);

      // setCameraRef callback will handle attaching stream to video element

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
    <div style={{ height: '100vh', background: '#06060e', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 0, overflow: 'hidden' }}>
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

          {/* STEP 2: Live Interview — Zoom/Meet Style */}
          {flowStep === 2 && (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: 10, minHeight: 0, overflow: 'hidden' }}>

              {/* Video Grid — 2 tiles like Google Meet */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 0 }}>

                {/* Tile 1: AI Interviewer */}
                <div style={{ background: '#111318', borderRadius: 16, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {/* AI Avatar / Visualizer */}
                  <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', border: isAgentSpeaking ? '3px solid #818cf8' : '2px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: isAgentSpeaking ? '0 0 40px rgba(129,140,248,0.3)' : '0 8px 24px rgba(0,0,0,0.4)', transition: 'all 0.3s' }}>
                    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <motion.div key={i} style={{ width: 3, background: isAgentSpeaking ? '#a5b4fc' : '#4338ca', borderRadius: 4 }}
                          animate={{ height: isAgentSpeaking ? [12, 40, 18, 35, 12] : [6, 10, 6] }}
                          transition={{ repeat: Infinity, duration: 0.7 + i * 0.06, delay: i * 0.05 }} />
                      ))}
                    </div>
                  </div>

                  {/* Question Bubble */}
                  <div style={{ maxWidth: '85%', padding: '14px 18px', background: 'rgba(255,255,255,0.06)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, textAlign: 'center' }}>
                      "{currentQuestion || 'Preparing your first question...'}"
                    </p>
                  </div>

                  {/* Name Badge */}
                  <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)' }}>
                    <Sparkles size={12} color="#818cf8" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>KIA AI Interviewer</span>
                    {isAgentSpeaking && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', animation: 'pulse 1s infinite' }} />}
                  </div>
                </div>

                {/* Tile 2: Candidate Camera */}
                <div style={{ background: '#111318', borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
                  {cameraDetected ? (
                    <video ref={setCameraRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Video size={32} color="#475569" />
                      </div>
                      <span style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>Camera Off</span>
                    </div>
                  )}

                  {/* Name Badge */}
                  <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{candidate?.candidateName || 'You'}</span>
                    {isListening && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1s infinite' }} />}
                  </div>

                  {/* Mic Indicator */}
                  {isListening && (
                    <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)' }}>
                      <Mic size={12} color="#10b981" />
                      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <motion.div key={i} style={{ width: 2, background: '#10b981', borderRadius: 2 }}
                            animate={{ height: [4, 14, 6, 12, 4] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.08 }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Captions Bar — like Meet live captions */}
              {showCaptions && (
                <div style={{ minHeight: 48, maxHeight: 80, padding: '10px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                  {voiceTranscript && isListening ? (
                    <>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Mic size={13} color="#60a5fa" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>You</span>
                        <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{voiceTranscript}</p>
                      </div>
                    </>
                  ) : isAgentSpeaking ? (
                    <>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sparkles size={13} color="#818cf8" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Interviewer</span>
                        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Speaking...</p>
                      </div>
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: '#475569', fontStyle: 'italic', width: '100%', textAlign: 'center' }}>
                      Live captions will appear here when speaking
                    </p>
                  )}
                </div>
              )}

              {/* Submit Answer floating button */}
              {voiceTranscript.trim().length > 5 && isListening && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={stopListeningAndSubmit}
                  style={{ position: 'fixed', bottom: 100, right: 32, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', padding: '12px 24px', borderRadius: 14, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, border: 'none', cursor: 'pointer', boxShadow: '0 12px 30px rgba(79,70,229,0.4)', textTransform: 'uppercase', letterSpacing: '0.02em', zIndex: 200 }}>
                  <Send size={16} /> Submit Answer
                </motion.button>
              )}
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

      {/* Bottom Toolbar — Zoom/Meet Style */}
      {flowStep === 2 && (
        <div style={{ height: 72, background: '#1a1a2e', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 100 }}>

          {/* Left: Meeting Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span style={{ fontSize: 11, color: '#475569' }}>|</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Q{questionsAnswered + 1} of {totalQuestions}</span>
          </div>

          {/* Center: Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => { if (isListening) stopListeningAndSubmit(); else startListening(); }}
              style={{
                width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: isListening ? '#10b981' : '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isListening ? '0 0 16px rgba(16,185,129,0.3)' : '0 0 16px rgba(239,68,68,0.3)',
                transition: 'all 0.2s'
              }}>
              {isListening ? <Mic size={20} color="white" /> : <MicOff size={20} color="white" />}
            </button>

            <button style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer', background: cameraDetected ? 'rgba(255,255,255,0.1)' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <Video size={20} color="white" />
            </button>

            <button onClick={() => setShowCaptions(!showCaptions)}
              style={{
                width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: showCaptions ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
              }}>
              <FileText size={18} color={showCaptions ? '#818cf8' : 'white'} />
            </button>

            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

            <button onClick={cleanupAndClose}
              style={{
                height: 40, padding: '0 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: '#ef4444', color: 'white', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 12px rgba(239,68,68,0.3)', transition: 'all 0.2s'
              }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: 'white', display: 'inline-block', opacity: 0.9 }} />
              End
            </button>
          </div>

          {/* Right: Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 120, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <motion.div animate={{ width: `${(questionsAnswered / totalQuestions) * 100}%` }} style={{ height: '100%', background: '#6366f1', borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{Math.round((questionsAnswered / totalQuestions) * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewPage;
