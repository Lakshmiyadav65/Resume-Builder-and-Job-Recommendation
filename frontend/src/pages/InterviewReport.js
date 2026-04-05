import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    CircleStop,
    CirclePlay,
    Mic,
    Video,
    MessageSquare,
    MoreHorizontal,
    PhoneOff,
    Calendar,
    Search,
    Users,
    Sparkles,
    CheckCircle2,
    Clock,
    Scissors
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import './InterviewReport.css';

const InterviewReport = () => {
    const navigate = useNavigate();

    const questions = [
        {
            id: '01',
            question: 'How would you optimize a React app for performance?',
            answer: 'I use code-splitting, lazy loading, memoization (React.memo, useMemo), and avoid unnecessary re-renders with proper dependency handling in hooks.',
            completed: true
        },
        {
            id: '02',
            question: 'Describe your experience with Tailwind CSS.',
            answer: 'I\'ve used Tailwind in three client projects. I love how it speeds up prototyping and encourages consistent design tokens.',
            completed: true
        },
        {
            id: '03',
            question: 'Can you explain how you structure components to keep your code clean and maintainable?',
            answer: '',
            completed: false
        },
        {
            id: '04',
            question: 'How do you handle API errors on the frontend?',
            answer: '',
            completed: false
        }
    ];

    return (
        <div className="interview-report-container">
            {/* Header */}
            <header className="report-header">
                <div className="header-left">
                    <Button variant="ghost" size="icon" className="back-btn" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="title-group">
                        <h1>Hiring-Frontend Developer</h1>
                        <p className="subtitle">Summary of employees, income, and payment status metrics.</p>
                    </div>
                </div>
                <div className="header-right">
                    <Button variant="outline" className="stop-btn">
                        <CircleStop className="h-4 w-4 mr-2" />
                        Stop Recording
                    </Button>
                    <Button className="live-btn bg-red-500 hover:bg-red-600">
                        <Video className="h-4 w-4 mr-2" />
                        Live Recording
                    </Button>
                </div>
            </header>

            <main className="report-content">
                {/* Left Column */}
                <div className="content-left">
                    {/* Video Section */}
                    <div className="video-section">
                        <div className="main-video">
                            <img
                                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1200"
                                alt="Main Video Feed"
                                className="video-placeholder"
                            />
                            <div className="video-label-top">
                                <Badge variant="secondary" className="speaker-badge">
                                    <span className="initials">TS</span> Mrs. Tania Shahira
                                </Badge>
                            </div>

                            {/* Floating Small Video */}
                            <div className="small-video-overlay">
                                <img
                                    src="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400"
                                    alt="Secondary Video Feed"
                                />
                                <Badge variant="secondary" className="speaker-badge-sm">
                                    <span className="initials-purple">RT</span> Regina Tanya
                                </Badge>
                                <div className="audio-wave-icon">
                                    <div className="wave-bar"></div>
                                    <div className="wave-bar"></div>
                                    <div className="wave-bar"></div>
                                </div>
                            </div>

                            {/* Video Controls Area */}
                            <div className="video-controls-overlay">
                                <div className="controls-bar">
                                    <Button variant="secondary" size="icon" className="control-icon"><Mic className="h-5 w-5" /></Button>
                                    <Button variant="secondary" size="icon" className="control-icon"><Video className="h-5 w-5" /></Button>
                                    <Button variant="secondary" size="icon" className="control-icon"><MessageSquare className="h-5 w-5" /></Button>
                                    <Button variant="secondary" size="icon" className="control-icon active"><MoreHorizontal className="h-5 w-5" /></Button>
                                    <Button variant="destructive" size="icon" className="control-icon end-call"><PhoneOff className="h-5 w-5" /></Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Meeting Notes Section */}
                    <Card className="meeting-notes-card">
                        <div className="card-header-row">
                            <h2>Key Meeting Notes - Hiring: Frontend Developer</h2>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </div>

                        <div className="info-pills">
                            <Badge variant="outline" className="info-pill">
                                <Calendar className="h-3 w-3 mr-1" /> Jul 10, 2025
                            </Badge>
                            <Badge variant="outline" className="info-pill">
                                <Search className="h-3 w-3 mr-1" /> Hiring
                            </Badge>
                            <Badge variant="outline" className="info-pill">
                                <Users className="h-3 w-3 mr-1" /> Mrs. Tania Shahira, Regina Tanya
                            </Badge>
                        </div>

                        <div className="ai-summary-box">
                            <div className="summary-title">
                                <Sparkles className="h-4 w-4 text-purple-500 mr-2" />
                                <h3>AI Summary of Meeting</h3>
                            </div>
                            <p>
                                Mrs. Tania Shahira and Regina Tanya led the hiring meeting to finalize the interview structure for the Frontend Developer position. The discussion covered candidate evaluation methods, role expectations, and feedback alignment across the panel. They agreed to streamline the hiring flow by merging the technical screening and live coding session.
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="content-right">
                    <Tabs defaultValue="questions" className="report-tabs">
                        <TabsList className="tabs-list-custom">
                            <TabsTrigger value="questions">Question List</TabsTrigger>
                            <TabsTrigger value="timeline">Timeline</TabsTrigger>
                            <TabsTrigger value="highlights">Highlight Clips</TabsTrigger>
                        </TabsList>

                        <TabsContent value="questions" className="tabs-content-custom">
                            <div className="questions-scroll">
                                {questions.map((q) => (
                                    <Card key={q.id} className="question-card">
                                        <div className="q-card-header">
                                            <span className="q-number">{q.id}</span>
                                            {q.completed && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                        </div>
                                        <h4 className="q-text">{q.question}</h4>
                                        {q.answer && <p className="q-answer">{q.answer}</p>}
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="timeline">
                            <div className="placeholder-content">Timeline View Coming Soon...</div>
                        </TabsContent>

                        <TabsContent value="highlights">
                            <div className="placeholder-content">Highlights View Coming Soon...</div>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
};

export default InterviewReport;
