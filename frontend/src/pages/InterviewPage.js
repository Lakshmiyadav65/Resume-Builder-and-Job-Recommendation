import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FcVoicePresentation, FcConferenceCall, FcAssistant, FcInfo, FcHighPriority, FcOk } from 'react-icons/fc';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { validateInterviewToken, getInterviewQuestion, submitInterviewAnswer } from '../services/api';
import './InterviewPage.css';

const InterviewPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [candidate, setCandidate] = useState(null);

    const [stage, setStage] = useState(1); // 1: Bot Screening, 2: AI Avatar
    const [status, setStatus] = useState('idle'); // idle, listening, thinking, speaking, evaluating
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [transcript, setTranscript] = useState('');
    const [interviewStarted, setInterviewStarted] = useState(false);
    const [completed, setCompleted] = useState(false);

    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await validateInterviewToken(token);
                if (res.success) {
                    setCandidate(res.candidate);
                    setStage(res.currentStage || 1);
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

        // Initialize Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
                handleAnswerSubmission(text);
            };

            recognitionRef.current.onend = () => {
                if (status === 'listening') setStatus('thinking');
            };
        }
    }, [token]);

    const speak = (text, onEnd) => {
        if (!synthRef.current) return;
        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setStatus('speaking');
        utterance.onend = () => {
            setStatus('listening');
            if (onEnd) onEnd();
            startListening();
        };
        synthRef.current.speak(utterance);
    };

    const startListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setStatus('listening');
            } catch (e) {
                console.error('Speech recognition error:', e);
            }
        }
    };

    const startInterview = async () => {
        setInterviewStarted(true);
        fetchNextQuestion();
    };

    const fetchNextQuestion = async () => {
        setStatus('thinking');
        try {
            const res = await getInterviewQuestion(token, stage);
            if (res.success) {
                setCurrentQuestion(res.question);
                speak(res.question);
            }
        } catch (err) {
            setError('Failed to fetch next question');
        }
    };

    const handleAnswerSubmission = async (answer) => {
        setStatus('evaluating');
        try {
            const res = await submitInterviewAnswer({ token, stage, question: currentQuestion, answer });
            if (res.success) {
                // If overall score is good or we finish a set number of questions (e.g., 3)
                // Here we simulate moving to stage 2 or finishing
                if (stage === 1 && res.overallScore >= 60) {
                    // Move to Stage 2 after a small delay
                    setTimeout(() => {
                        setStage(2);
                        speak("Congratulations! You have passed the screening round. We are now moving to the final round with our AI Senior Manager.");
                        fetchNextQuestion();
                    }, 2000);
                } else if (stage === 2) {
                    // Finish interview
                    setCompleted(true);
                    speak("Thank you for your time. Your interview is complete. We will get back to you soon.");
                } else {
                    fetchNextQuestion();
                }
            }
        } catch (err) {
            setError('Submission error');
        }
    };

    if (loading) return <div className="interview-loading">Verifying Link...</div>;
    if (error) return (
        <div className="interview-error-container">
            <FcHighPriority className="text-6xl mb-4" />
            <h2 className="text-2xl font-bold">{error}</h2>
            <p className="text-slate-400 mt-2">Please contact the recruiter who shared this link.</p>
        </div>
    );

    return (
        <div className="interview-page-container">
            <AnimatePresence mode="wait">
                {!interviewStarted ? (
                    <motion.div
                        key="intro"
                        className="interview-setup max-w-2xl mx-auto text-center"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <FcAssistant className="text-8xl mx-auto mb-6" />
                        <h1 className="text-4xl font-bold text-white mb-4">Hello, {candidate?.candidateName}</h1>
                        <p className="text-slate-300 mb-8 text-lg">
                            Welcome to your automated AI interview for <strong>{candidate?.jobTitle || 'the position'}</strong>.
                            Please ensure your microphone is active and you are in a quiet room.
                        </p>
                        <div className="info-cards grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="p-4 flex gap-3">
                                    <FcInfo className="text-2xl shrink-0" />
                                    <p className="text-sm text-slate-300">Stage 1 is voice-only (3-5 questions).</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="p-4 flex gap-3">
                                    <FcVoicePresentation className="text-2xl shrink-0" />
                                    <p className="text-sm text-slate-300">Stage 2 features an AI Avatar interaction.</p>
                                </CardContent>
                            </Card>
                        </div>
                        <Button size="lg" className="start-btn bg-indigo-600 hover:bg-indigo-700 text-white w-full" onClick={startInterview}>
                            I'm Ready to Start
                        </Button>
                    </motion.div>
                ) : !completed ? (
                    <motion.div
                        key="session"
                        className="interview-session-active w-full max-w-5xl mx-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className="session-header flex justify-between items-center mb-10">
                            <Badge className="stage-badge bg-indigo-500/20 text-indigo-400 border-indigo-500/30 px-4 py-2 text-md">
                                {stage === 1 ? 'Stage 1: Bot Screening' : 'Stage 2: Final Avatar Round'}
                            </Badge>
                            <div className="status-indicator flex items-center gap-3">
                                <div className={`status-dot ${status}`}></div>
                                <span className="text-slate-400 capitalize">{status}...</span>
                            </div>
                        </div>

                        <div className="interview-visuals flex flex-col items-center justify-center min-h-[400px]">
                            {stage === 1 ? (
                                <div className="voice-visualizer flex items-center justify-center gap-2">
                                    {[...Array(5)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="wave-bar bg-indigo-500"
                                            animate={{ height: status === 'speaking' || status === 'listening' ? [10, 60, 20, 80, 10] : 10 }}
                                            transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="avatar-container relative group">
                                    <div className="avatar-frame w-72 h-72 rounded-full border-4 border-indigo-500/30 overflow-hidden shadow-2xl shadow-indigo-500/20">
                                        {/* Placeholder for AI Avatar Video/HeyGen */}
                                        <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300&h=300" alt="AI Avatar" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="pulse-overlay absolute -inset-4 bg-indigo-500/10 rounded-full -z-10 animate-pulse"></div>
                                </div>
                            )}
                        </div>

                        <div className="question-display text-center mt-12 max-w-2xl mx-auto">
                            <p className="text-2xl text-slate-200 italic font-medium">"{currentQuestion || 'Preparing next question...'}"</p>
                            {status === 'listening' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-6 text-indigo-400 font-bold animate-pulse text-lg"
                                >
                                    🎤 Listening for your answer...
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="completion"
                        className="interview-completion text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <FcOk className="text-8xl mx-auto mb-6" />
                        <h1 className="text-4xl font-bold text-white mb-4">Interview Completed!</h1>
                        <p className="text-slate-300 text-lg">Thank you for your participation. A detailed report has been sent to the hiring team.</p>
                        <Button className="mt-8 border-slate-700 text-slate-300 hover:text-white" variant="outline" onClick={() => navigate('/')}>
                            Return Home
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InterviewPage;
