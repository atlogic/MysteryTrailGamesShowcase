import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRScanner } from './components/QRScanner';
import { PrintPage } from './components/PrintPage';
import { ParentPanel } from './components/ParentPanel';
import { GameMap } from './components/GameMap';
import { 
  Package, 
  Camera, 
  CheckCircle2, 
  Trophy, 
  ArrowRight, 
  HelpCircle,
  Users,
  Settings,
  Volume2,
  Lock,
  Image as ImageIcon,
  RotateCcw,
  Download,
  Loader2,
  UserPlus,
  Plus,
  Check,
  Star,
  Mic,
  Square,
  Play,
  History,
  QrCode,
  Share2,
  Copy,
  X,
  ChevronRight,
  Archive,
  MapPin
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { 
  loadGameFromFirebase, 
  saveGameToFirebase, 
  saveSessionToFirebase,
  STORAGE_KEY, 
  GAME_ID_KEY, 
  PARENT_ID_KEY,
  generateGameId,
  TRANSLATIONS
} from './constants';
import { Checkpoint, TeamInfo, GameSession, CheckpointResult, Language } from './types';
import { Toast, ToastType, ConfirmModal } from './components/Toast';

import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

type GameState = 'START' | 'TEAM_SETUP' | 'RIDDLE' | 'SCANNING' | 'TASK' | 'EVALUATION' | 'FINISHED' | 'PRINT';

export default function App() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [gameState, setGameState] = useState<GameState>('START');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [verificationMethod, setVerificationMethod] = useState<'qr' | 'passcode' | 'gps'>('qr');
  const [gpsThreshold, setGpsThreshold] = useState<number>(20);
  const [gpsViewMode, setGpsViewMode] = useState<'radar' | 'map' | 'satellite'>('radar');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gameId, setGameId] = useState<string>('');
  const [gameParentId, setGameParentId] = useState<string>('');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [showParentPanel, setShowParentPanel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeHelpStep, setActiveHelpStep] = useState<number | null>(1);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showLoadPrompt, setShowLoadPrompt] = useState(false);
  const [loadId, setLoadId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [teamInfo, setTeamInfo] = useState<TeamInfo>({ name: '', members: [''] });
  const [bestPerformer, setBestPerformer] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [sessionResults, setSessionResults] = useState<CheckpointResult[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [showShareQR, setShowShareQR] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Toast and Confirm state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const handleConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirm({ title, message, onConfirm });
  };

  const [language, setLanguage] = useState<Language>('pl');
  const t = TRANSLATIONS[language];

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  };

  useEffect(() => {
    let watchId: number | null = null;

    if (gameState === 'SCANNING' && verificationMethod === 'gps') {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            
            const currentStage = checkpoints[currentStageIndex];
            if (currentStage && currentStage.lat !== undefined && currentStage.lng !== undefined) {
              const distance = calculateDistance(latitude, longitude, currentStage.lat, currentStage.lng);
              if (distance < gpsThreshold) { // Use dynamic threshold
                showToast(t.pointReached, 'success');
                setGameState('TASK');
                confetti({
                  particleCount: 100,
                  spread: 70,
                  origin: { y: 0.6 }
                });
              }
            }
          },
          (error) => {
            console.error("Geolocation error:", error);
            showToast(t.locationError, 'error');
          },
          { enableHighAccuracy: true }
        );
      } else {
        showToast(t.locationError, 'error');
      }
    } else {
      setUserLocation(null);
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [gameState, verificationMethod, currentStageIndex, checkpoints, t.pointReached, t.locationError]);
  const [passcodeInput, setPasscodeInput] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported MIME types - prefer mp4 for iOS compatibility
      const mimeTypes = ['audio/mp4', 'audio/aac', 'audio/webm', 'audio/wav'];
      const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
      
      const options = supportedType ? { mimeType: supportedType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualType = mediaRecorder.mimeType || supportedType || 'audio/mp3';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setRecordedAudio(reader.result as string);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic error:", err);
      let msg = t.errorMic;
      if (err.name === 'NotAllowedError') msg = t.errorMicPermission;
      if (err.name === 'NotFoundError') msg = t.errorMicNotFound;
      showToast(msg, 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    const savedCheckpoints = localStorage.getItem(STORAGE_KEY);
    const savedId = localStorage.getItem(GAME_ID_KEY);
    
    if (savedCheckpoints) {
      setCheckpoints(JSON.parse(savedCheckpoints));
    }
    
    if (savedId) {
      setGameId(savedId);
    } else {
      const newId = generateGameId();
      setGameId(newId);
      localStorage.setItem(GAME_ID_KEY, newId);
    }

    const savedParentId = localStorage.getItem(PARENT_ID_KEY);
    if (savedParentId) {
      setGameParentId(savedParentId);
    }

    const savedMethod = localStorage.getItem('mystery_trail_method');
    if (savedMethod === 'qr' || savedMethod === 'passcode' || savedMethod === 'gps') {
      setVerificationMethod(savedMethod as 'qr' | 'passcode' | 'gps');
    }

    const savedThreshold = localStorage.getItem('mystery_trail_gps_threshold');
    if (savedThreshold) {
      setGpsThreshold(parseInt(savedThreshold));
    }

    const savedViewMode = localStorage.getItem('mystery_trail_gps_view_mode');
    if (savedViewMode === 'radar' || savedViewMode === 'map' || savedViewMode === 'satellite') {
      setGpsViewMode(savedViewMode as 'radar' | 'map' | 'satellite');
    }

    // Check for game in URL
    const urlParams = new URLSearchParams(window.location.search);
    const gameParam = urlParams.get('game');
    if (gameParam) {
      handleLoadGameById(gameParam).then(success => {
        if (!success) {
          // If game not found, clear URL param to avoid confusion
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const currentStage = checkpoints[currentStageIndex];

  const handleStart = () => {
    if (checkpoints.length === 0) {
      showToast(t.addPointsFirst, 'error');
      return;
    }
    setGameState('TEAM_SETUP');
  };

  const handleTeamSubmit = () => {
    const validMembers = teamInfo.members.filter(m => m.trim() !== '');
    if (validMembers.length < 1) {
      showToast(t.addOneName, 'error');
      return;
    }
    if (!teamInfo.name.trim()) {
      showToast(t.enterTeamName, 'error');
      return;
    }
    setTeamInfo({ ...teamInfo, members: validMembers });
    const initialVotes: Record<string, number> = {};
    validMembers.forEach(member => {
      initialVotes[member] = 0;
    });
    setVotes(initialVotes);
    setSessionResults([]);
    setGameState('RIDDLE');
    setCurrentStageIndex(0);
    setCapturedPhoto(null);
    setRecordedAudio(null);
  };

  const updateMember = (index: number, name: string) => {
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    setTeamInfo(prev => {
      const newMembers = [...prev.members];
      newMembers[index] = capitalized;
      
      // Auto-add new field if typing in the last one
      if (index === newMembers.length - 1 && capitalized.trim() !== '') {
        return { ...prev, members: [...newMembers, ''] };
      }
      
      return { ...prev, members: newMembers };
    });
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pl-PL';
      utterance.rate = 0.9;
      
      // Ensure voices are loaded
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback for some browsers where voices load asynchronously
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.speak(utterance);
        };
      }
    }
  };

  const handleQRScan = (decodedText: string) => {
    const expectedValue = `mystery_trail_qr_${currentStage.qrNumber}`;
    if (decodedText === expectedValue) {
      setGameState('TASK');
      speak(currentStage.task);
    }
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.toUpperCase() === currentStage.passcode?.toUpperCase()) {
      setGameState('TASK');
      speak(currentStage.task);
      setPasscodeInput('');
    } else {
      showToast(t.wrongPasscode, 'error');
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
    });
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setCapturedPhoto(compressed);
      } catch (err) {
        console.error("Photo capture error:", err);
      }
    }
  };

  const nextStage = () => {
    // Save current result to session
    const currentResult: CheckpointResult = {
      checkpointId: checkpoints[currentStageIndex].id,
      photo: capturedPhoto || undefined,
      audio: recordedAudio || undefined,
      bestPerformer: bestPerformer || undefined
    };
    setSessionResults(prev => [...prev, currentResult]);

    if (currentStageIndex < checkpoints.length - 1) {
      setCurrentStageIndex(prev => prev + 1);
      setGameState('RIDDLE');
      setCapturedPhoto(null);
      setRecordedAudio(null);
      setBestPerformer(null);
    } else {
      handleFinish([...sessionResults, currentResult]);
    }
  };

  const handleEvaluationSubmit = () => {
    if (!bestPerformer) {
      showToast(t.chooseBest, 'error');
      return;
    }
    setVotes(prev => ({
      ...prev,
      [bestPerformer]: (prev[bestPerformer] || 0) + 1
    }));
    nextStage();
  };

  const handleFinish = async (finalResults: CheckpointResult[]) => {
    setGameState('FINISHED');
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#34d399', '#60a5fa', '#f87171']
    });

    // Save full session to Firebase
    const session: GameSession = {
      id: Date.now().toString(),
      gameId: gameId,
      parentId: gameParentId,
      teamName: teamInfo.name,
      members: teamInfo.members.filter(m => m.trim() !== ''),
      results: finalResults,
      timestamp: Date.now()
    };

    try {
      await saveSessionToFirebase(session);
    } catch (err) {
      console.error("Session save error:", err);
    }
  };


  const handleLoadGameById = async (id: string) => {
    setIsLoading(true);
    try {
      const gameData = await loadGameFromFirebase(id.toUpperCase());
      if (gameData) {
        setCheckpoints(gameData.checkpoints);
        setVerificationMethod(gameData.verificationMethod || 'qr');
        setGpsThreshold(gameData.gpsThreshold || 20);
        setGpsViewMode(gameData.gpsViewMode || 'radar');
        setGameId(id.toUpperCase());
        setGameParentId(gameData.parentId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData.checkpoints));
        localStorage.setItem(GAME_ID_KEY, id.toUpperCase());
        localStorage.setItem(PARENT_ID_KEY, gameData.parentId);
        localStorage.setItem('mystery_trail_method', gameData.verificationMethod || 'qr');
        localStorage.setItem('mystery_trail_gps_threshold', (gameData.gpsThreshold || 20).toString());
        localStorage.setItem('mystery_trail_gps_view_mode', gameData.gpsViewMode || 'radar');
        return true;
      }
    } catch (error) {
      console.error(t.loadError, error);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const handleLoadGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadId) return;
    
    const success = await handleLoadGameById(loadId);
    if (success) {
      setShowLoadPrompt(false);
      setLoadId('');
      showToast(t.loadSuccess, 'success');
    } else {
      showToast(t.errorLoad, 'error');
    }
  };

  if (gameState === 'PRINT' && showParentPanel) {
    return <PrintPage onBack={() => setGameState('START')} language={language} checkpoints={checkpoints} gameId={gameId} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-2xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="bg-amber-400 p-2 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.4)]">
            <Archive className="text-slate-950" size={24} />
          </div>
          <h1 className="text-lg sm:text-xl font-serif font-bold text-amber-400 tracking-tight truncate max-w-[150px] sm:max-w-none uppercase">
            {t.title}
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Language Switcher */}
          <div className="flex bg-slate-900 rounded-lg border border-slate-800 p-1 shadow-inner">
            <button 
              onClick={() => setLanguage('pl')}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${language === 'pl' ? 'bg-amber-400 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
            >
              PL
            </button>
            <button 
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${language === 'en' ? 'bg-amber-400 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
            >
              EN
            </button>
          </div>

          {gameState !== 'FINISHED' && (
            <div className="flex items-center gap-2 sm:gap-4">
              {checkpoints.length > 0 && gameState !== 'START' && (
                <div className="bg-slate-900 px-3 sm:px-4 py-1 rounded-full shadow-inner border border-slate-800 flex items-center gap-2">
                  <Users size={14} className="text-amber-400 sm:size-4" />
                  <span className="text-xs sm:text-sm font-bold text-amber-400">{currentStageIndex + 1}/{checkpoints.length}</span>
                </div>
              )}
              <button 
                onClick={() => setShowHelp(true)}
                className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <HelpCircle size={20} />
              </button>
              <button 
                onClick={() => setShowParentPanel(true)}
                className="p-2 text-slate-400 hover:text-amber-400 transition-colors"
              >
                <Settings size={20} />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="w-full max-w-xl flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {gameState === 'START' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-900 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center space-y-6 border border-slate-800 relative overflow-hidden"
            >
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent pointer-events-none"></div>

              {/* Small QR Code in top right */}
              <button 
                onClick={() => setShowShareQR(true)}
                className="absolute top-4 right-4 p-2 bg-slate-800 rounded-xl border border-slate-700 hover:bg-slate-700 transition-all shadow-lg group z-10"
                title="Udostępnij grę"
              >
                <div className="relative">
                  <QRCodeSVG 
                    value={`${window.location.origin}${window.location.pathname}?game=${gameId}`} 
                    size={32}
                    level="L"
                    bgColor="#1e293b"
                    fgColor="#fbbf24"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm">
                    <Share2 size={16} className="text-amber-400" />
                  </div>
                </div>
              </button>

              <div className="relative inline-block">
                <motion.div animate={{ rotate: [0, 10, -10, 0], y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Archive size={80} className="text-amber-400 mx-auto drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]" />
                </motion.div>
              </div>
              
              <h2 className="text-4xl font-serif font-black text-amber-400 uppercase tracking-tighter">{t.title}</h2>
              <p className="text-sm text-slate-400 font-medium mt-1 mb-4 leading-relaxed max-w-xs mx-auto">
                {t.subtitle}
              </p>
              <p className="text-lg text-slate-300 font-light">
                {checkpoints.length > 0 ? t.welcome : t.firstGame}
              </p>
              
              {checkpoints.length > 0 ? (
                <button 
                  onClick={handleStart}
                  className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xl font-black rounded-2xl shadow-[0_10px_20px_rgba(251,191,36,0.2)] transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                  {t.start} <ArrowRight />
                </button>
              ) : (
                <button 
                  onClick={() => setShowParentPanel(true)}
                  className="w-full py-4 bg-slate-300 hover:bg-slate-400 text-slate-950 text-xl font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                  {t.createNewGame} <Plus />
                </button>
              )}

              <div className="grid grid-cols-1 gap-3 pt-4">
                <button 
                  onClick={() => setShowLoadPrompt(true)}
                  className="py-3 bg-slate-800 text-slate-300 hover:text-amber-400 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors border border-slate-700"
                >
                  <Download size={18} /> {t.downloadGame}
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'TEAM_SETUP' && (
            <motion.div 
              key="team"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 p-8 rounded-3xl shadow-2xl space-y-6 border border-slate-800"
            >
              <div className="text-center space-y-2">
                <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-slate-700">
                  <UserPlus className="text-amber-400" size={32} />
                </div>
                <h2 className="text-2xl font-serif font-black text-amber-400 uppercase tracking-tight">{t.teamSetup}</h2>
                <p className="text-slate-400">{t.teamMembers}</p>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto p-2">
                {teamInfo.members.map((member, index) => (
                  <div key={index} className="relative">
                    <input 
                      type="text"
                      value={member}
                      onChange={(e) => updateMember(index, e.target.value)}
                      className="w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-xl focus:border-amber-400 outline-none font-bold text-lg text-slate-100 transition-all shadow-inner"
                      placeholder={t.memberName + ` ${index + 1}...`}
                    />
                    {member.trim() !== '' && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400">
                        <Check size={20} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1 tracking-widest">{t.teamName}</label>
                  <input 
                    type="text"
                    value={teamInfo.name}
                    onChange={(e) => setTeamInfo({ ...teamInfo, name: e.target.value })}
                    className="w-full p-4 bg-slate-950 border-2 border-slate-800 rounded-xl focus:border-amber-400 outline-none font-black text-xl text-amber-400 text-center uppercase tracking-widest shadow-inner"
                    placeholder="np. SZYBKIE WILKI"
                  />
                </div>

                <button 
                  onClick={handleTeamSubmit}
                  className="w-full py-4 bg-amber-400 text-slate-950 font-black rounded-2xl shadow-xl hover:bg-amber-500 transition-all uppercase tracking-widest"
                >
                  {t.start}
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'RIDDLE' && currentStage && (
            <motion.div 
              key="riddle"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-slate-900 p-8 rounded-3xl shadow-xl space-y-6 border border-slate-800"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 text-amber-400">
                  <HelpCircle size={28} />
                  <span className="font-bold tracking-widest uppercase text-sm">{t.riddle} #{currentStageIndex + 1}</span>
                </div>
                <button 
                  onClick={() => speak(currentStage.hint)}
                  className="p-3 bg-slate-800 text-amber-400 rounded-full hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  <Volume2 size={24} />
                </button>
              </div>
              
              <h3 className="text-2xl font-serif font-bold text-slate-100 leading-tight">
                {currentStage.hint}
              </h3>

              {currentStage.image && (
                <div className="rounded-2xl overflow-hidden border-4 border-slate-800 shadow-2xl">
                  <img src={currentStage.image} alt="Hint" className="w-full h-48 object-cover" />
                </div>
              )}

              <button 
                onClick={() => setGameState('SCANNING')}
                className={`w-full py-4 text-slate-950 text-lg font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 uppercase tracking-widest ${
                  verificationMethod === 'passcode' ? 'bg-cyan-400 hover:bg-cyan-500' : 
                  verificationMethod === 'gps' ? 'bg-amber-400 hover:bg-amber-500' :
                  'bg-amber-400 hover:bg-amber-500'
                }`}
              >
                {verificationMethod === 'passcode' ? (
                  <>
                    <Lock size={24} /> {t.enterPasscode}
                  </>
                ) : verificationMethod === 'gps' ? (
                  <>
                    <MapPin size={24} /> {t.gpsMethod}
                  </>
                ) : (
                  <>
                    <Camera size={24} /> {t.scanQR}
                  </>
                )}
              </button>
            </motion.div>
          )}

          {gameState === 'SCANNING' && (
            <motion.div 
              key="scanning"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6"
            >
              <div className="text-center mb-4">
                <h3 className="text-xl font-serif font-black text-amber-400 uppercase tracking-tight">
                  {verificationMethod === 'passcode' ? t.enterPasscode : 
                   verificationMethod === 'gps' ? t.gpsMethod :
                   t.scanQR} #{currentStage.qrNumber}
                </h3>
                <p className="text-slate-400">
                  {verificationMethod === 'passcode' ? (language === 'pl' ? 'Wpisz hasło znalezione w tym miejscu.' : 'Enter the passcode found at this location.') : 
                   verificationMethod === 'gps' ? t.gpsHint :
                   t.qrInstructions}
                </p>
              </div>
              
              {verificationMethod === 'qr' ? (
                <QRScanner 
                  onScan={handleQRScan} 
                  expectedValue={`mystery_trail_qr_${currentStage.qrNumber}`} 
                  language={language}
                />
              ) : verificationMethod === 'passcode' ? (
                <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-cyan-400 mb-2">
                    <Lock size={20} />
                    <span className="font-black uppercase text-xs tracking-widest">{t.passcode}</span>
                  </div>
                  <form onSubmit={handlePasscodeSubmit} className="space-y-3">
                    <input 
                      type="text"
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      className="w-full p-4 bg-slate-950 border-2 border-slate-800 rounded-xl focus:border-cyan-400 outline-none font-black text-xl text-center uppercase text-cyan-400 transition-all shadow-inner"
                      placeholder={t.passcodePlaceholder}
                      autoFocus
                    />
                    <button 
                      type="submit"
                      className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black rounded-xl shadow-md transition-all uppercase tracking-widest"
                    >
                      {t.enter}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-2xl border border-slate-800 text-center space-y-4 sm:space-y-6 overflow-hidden">
                  {gpsViewMode === 'radar' ? (
                    <div className="space-y-6 py-4">
                      <div className="relative w-32 h-32 mx-auto">
                        <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-ping opacity-20"></div>
                        <div className="relative z-10 w-full h-full bg-amber-400 rounded-full flex items-center justify-center text-slate-950 shadow-lg">
                          <MapPin size={48} className="animate-bounce" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-black text-amber-400 uppercase tracking-widest">{t.distanceToTarget}</p>
                        <div className="text-4xl font-black text-amber-400">
                          {userLocation && currentStage.lat !== undefined && currentStage.lng !== undefined ? (
                            <>
                              {Math.round(calculateDistance(userLocation.lat, userLocation.lng, currentStage.lat, currentStage.lng))}
                              <span className="text-xl ml-1">{t.meters}</span>
                            </>
                          ) : (
                            <div className="flex justify-center">
                              <Loader2 className="animate-spin text-slate-700" size={32} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-80 sm:h-96 w-full relative">
                      <GameMap 
                        userLocation={userLocation}
                        targetCheckpoint={currentStage}
                        previousCheckpoints={checkpoints.slice(0, currentStageIndex)}
                        viewMode={gpsViewMode as 'map' | 'satellite'}
                        threshold={gpsThreshold}
                      />
                      <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg border border-slate-800">
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">{t.distanceToTarget}</p>
                        <div className="text-xl font-black text-amber-400">
                          {userLocation && currentStage.lat !== undefined && currentStage.lng !== undefined ? (
                            <>
                              {Math.round(calculateDistance(userLocation.lat, userLocation.lng, currentStage.lat, currentStage.lng))}
                              <span className="text-xs ml-0.5">{t.meters}</span>
                            </>
                          ) : (
                            <Loader2 className="animate-spin text-slate-700" size={20} />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-slate-500 font-black uppercase tracking-widest italic">
                    {t.gpsHint}
                  </p>
                </div>
              )}

              <button 
                onClick={() => setGameState('RIDDLE')}
                className="w-full py-3 text-slate-500 font-black uppercase tracking-widest hover:text-amber-400 transition-colors"
              >
                {t.back}
              </button>
            </motion.div>
          )}

          {gameState === 'TASK' && currentStage && (
            <motion.div 
              key="task"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-900 p-8 rounded-3xl shadow-2xl text-center space-y-6 border border-slate-800"
            >
              <div className="flex justify-between items-start">
                <div className="bg-orange-600/20 w-12 h-12 rounded-full flex items-center justify-center border border-orange-600/30">
                  <Users className="text-orange-500" size={24} />
                </div>
                <button 
                  onClick={() => speak(currentStage.task)}
                  className="p-3 bg-slate-800 text-amber-400 rounded-full hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  <Volume2 size={24} />
                </button>
              </div>
              
              <h3 className="text-2xl font-serif font-black text-orange-500 uppercase tracking-tight">{t.task}</h3>
              <p className="text-lg text-slate-200 font-medium">
                {currentStage.task}
              </p>

              {currentStage.requirePhoto && (
                <div className="space-y-4">
                  <div className="w-full h-48 bg-slate-950 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                    {capturedPhoto ? (
                      <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-600 flex flex-col items-center gap-2">
                        <Camera size={32} />
                        <span className="text-sm uppercase tracking-widest font-bold">{t.takePhoto}</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handlePhotoCapture}
                  />
                  {!capturedPhoto ? (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 bg-amber-400 text-slate-950 font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest"
                    >
                      <Camera size={20} /> {t.takePhoto}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setCapturedPhoto(null)}
                      className="text-sm text-amber-400 font-bold flex items-center justify-center gap-1 mx-auto hover:text-amber-300 transition-colors"
                    >
                      <RotateCcw size={14} /> {t.retakePhoto}
                    </button>
                  )}
                </div>
              )}

              {currentStage.requireAudio && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.recordAudio}:</p>
                  <div className="flex flex-col items-center gap-4">
                    {recordedAudio ? (
                      <div className="w-full bg-slate-950 p-4 rounded-2xl border-2 border-orange-600/30 flex flex-col items-center gap-3 shadow-inner">
                        <audio src={recordedAudio} controls className="w-full" />
                        <button 
                          onClick={() => setRecordedAudio(null)}
                          className="text-xs font-black text-orange-500 uppercase tracking-widest hover:text-orange-400 transition-colors"
                        >
                          {t.recordAgain}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-full py-8 rounded-2xl flex flex-col items-center justify-center transition-all border-4 border-dashed ${
                          isRecording 
                            ? 'bg-orange-600 border-orange-400 text-white animate-pulse' 
                            : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-orange-600/50 hover:text-orange-500'
                        }`}
                      >
                        {isRecording ? <Square size={48} fill="white" /> : <Mic size={48} />}
                        <span className="font-black mt-2 uppercase tracking-widest">
                          {isRecording ? t.stopRecording : t.recordAudioBtn}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button 
                onClick={() => {
                  if (currentStage.requirePhoto && !capturedPhoto) {
                    showToast(t.errorPhoto, 'error');
                    return;
                  }
                  if (currentStage.requireAudio && !recordedAudio) {
                    showToast(t.errorMic, 'error');
                    return;
                  }
                  if (currentStage.requireEvaluation) {
                    setGameState('EVALUATION');
                    setBestPerformer(null);
                  } else {
                    nextStage();
                  }
                }}
                className={`w-full py-4 text-slate-950 text-lg font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 uppercase tracking-widest ${
                  (currentStage.requirePhoto && !capturedPhoto) || (currentStage.requireAudio && !recordedAudio)
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                    : 'bg-amber-400 hover:bg-amber-500'
                }`}
              >
                {t.finish} <CheckCircle2 />
              </button>
            </motion.div>
          )}

          {gameState === 'EVALUATION' && currentStage && (
            <motion.div 
              key="evaluation"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 p-8 rounded-3xl shadow-2xl text-center space-y-6 border border-slate-800"
            >
              <div className="bg-amber-400/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-amber-400/20">
                <Star className="text-amber-400" size={32} />
              </div>
              <h3 className="text-2xl font-serif font-black text-amber-400 uppercase tracking-tight">{t.evaluation}</h3>
              <p className="text-slate-300 font-medium">{t.chooseBestDesc}</p>

              <div className="grid grid-cols-1 gap-3">
                {teamInfo.members.map((member) => (
                  <button 
                    key={member}
                    onClick={() => setBestPerformer(member)}
                    className={`p-4 rounded-2xl border-2 font-black text-lg transition-all uppercase tracking-widest ${
                      bestPerformer === member 
                        ? 'bg-amber-400 border-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-[1.02]' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-amber-400/50 hover:text-amber-400'
                    }`}
                  >
                    {member}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleEvaluationSubmit}
                className="w-full py-4 bg-amber-400 text-slate-950 font-black rounded-2xl shadow-xl hover:bg-amber-500 transition-all uppercase tracking-widest"
              >
                {t.finish}
              </button>
            </motion.div>
          )}

          {gameState === 'FINISHED' && (
            <motion.div 
              key="finished"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 p-10 rounded-3xl shadow-2xl text-center space-y-8 border border-slate-800"
            >
              <Trophy size={100} className="text-amber-400 mx-auto drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]" />
              <div className="space-y-2">
                <h2 className="text-4xl font-serif font-black text-amber-400 leading-tight uppercase tracking-tighter">{t.bravo} {teamInfo.name}!</h2>
                <p className="text-xl text-slate-300 font-light">
                  {t.congrats}
                </p>
              </div>

              {(() => {
                const voteValues = Object.values(votes) as number[];
                if (voteValues.length === 0) return null;
                const maxVotes = Math.max(...voteValues);
                if (maxVotes === 0) return null;

                const winners = Object.entries(votes)
                  .filter(([_, count]) => count === maxVotes)
                  .map(([name]) => name);

                return (
                  <div className="bg-slate-950 p-6 rounded-2xl border-2 border-amber-400/20 space-y-3 shadow-inner">
                    <div className="flex items-center justify-center gap-2 text-amber-400 font-black uppercase tracking-widest text-sm">
                      <Star size={20} fill="currentColor" />
                      <span>{t.specialMention}</span>
                      <Star size={20} fill="currentColor" />
                    </div>
                    <p className="text-slate-400 font-medium text-sm uppercase tracking-widest">{t.mostOutstanding}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {winners.map((name) => (
                        <span key={name} className="px-6 py-2 bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg text-lg uppercase tracking-widest">
                          {name}
                        </span>
                      ))}
                    </div>
                    {winners.length > 1 && (
                      <p className="text-[10px] text-amber-400/60 font-black uppercase mt-2 tracking-widest">{t.tie}</p>
                    )}
                  </div>
                );
              })()}

              <button 
                onClick={() => setGameState('START')}
                className="w-full py-4 bg-slate-800 text-slate-300 font-black rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 uppercase tracking-widest"
              >
                {t.playAgain}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>


      {/* Load Game Prompt */}
      {showLoadPrompt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm space-y-6 my-auto border border-slate-800"
          >
            <div className="text-center space-y-2">
              <div className="bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto border border-slate-700">
                <Download className="text-amber-400" size={24} />
              </div>
              <h3 className="text-xl font-serif font-black text-amber-400 uppercase tracking-tight">{t.downloadGame}</h3>
              <p className="text-sm text-slate-400">{t.enterCode}</p>
            </div>
            <form onSubmit={handleLoadGame} className="space-y-4">
              <input 
                type="text" 
                value={loadId}
                onChange={(e) => setLoadId(e.target.value.toUpperCase())}
                className="w-full p-4 rounded-xl border-2 border-slate-800 bg-slate-950 focus:border-amber-400 outline-none text-center text-2xl font-mono font-bold text-amber-400 uppercase transition-all shadow-inner"
                placeholder={language === 'pl' ? 'KOD...' : 'CODE...'}
                maxLength={6}
                autoFocus
              />
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowLoadPrompt(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-400 font-bold rounded-xl hover:bg-slate-700 transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : t.download}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Parent Panel */}
      {showParentPanel && (
        <ParentPanel 
          checkpoints={checkpoints}
          gameId={gameId}
          language={language}
          verificationMethod={verificationMethod}
          gpsThreshold={gpsThreshold}
          gpsViewMode={gpsViewMode}
          onUpdate={(newCp, newId, newMethod, newParentId, newThreshold, newViewMode) => {
            setCheckpoints(newCp);
            setGameId(newId);
            setVerificationMethod(newMethod);
            setGameParentId(newParentId);
            if (newThreshold !== undefined) setGpsThreshold(newThreshold);
            if (newViewMode !== undefined) setGpsViewMode(newViewMode);
          }}
          onPrint={() => setGameState('PRINT')}
          onClose={() => setShowParentPanel(false)}
        />
      )}

      {/* Share QR Modal */}
      {showShareQR && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[70] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm space-y-6 text-center my-auto border border-slate-800"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-serif font-black text-amber-400 uppercase tracking-tight">{t.share}</h3>
              <button onClick={() => setShowShareQR(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border-2 border-dashed border-slate-800 flex justify-center shadow-inner">
              <QRCodeSVG 
                value={`${window.location.origin}${window.location.pathname}?game=${gameId}`} 
                size={200}
                level="H"
                includeMargin={true}
                bgColor="#020617"
                fgColor="#fbbf24"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Link:</p>
              <button 
                onClick={() => {
                  const link = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
                  navigator.clipboard.writeText(link);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between group hover:border-amber-400/50 transition-all shadow-inner"
              >
                <span className="text-[10px] text-slate-500 truncate mr-2 font-mono">
                  {`${window.location.origin}${window.location.pathname}?game=${gameId}`}
                </span>
                {copiedLink ? (
                  <Check size={18} className="text-amber-400 shrink-0" />
                ) : (
                  <Copy size={18} className="text-slate-600 group-hover:text-amber-400 shrink-0" />
                )}
              </button>
              {copiedLink && (
                <p className="text-[10px] text-amber-400 font-black uppercase animate-pulse tracking-widest">{t.copyLink}</p>
              )}
            </div>

            <button 
              onClick={() => setShowShareQR(false)}
              className="w-full py-3 bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg uppercase tracking-widest"
            >
              {t.enter}
            </button>
          </motion.div>
        </div>
      )}
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[80] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-lg my-auto border border-slate-800"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-slate-800 p-2.5 rounded-2xl border border-slate-700">
                  <HelpCircle className="text-amber-400" size={28} />
                </div>
                <h3 className="text-2xl font-serif font-black text-amber-400 uppercase tracking-tight">{t.howToPlay}</h3>
              </div>
              <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <X size={28} className="text-slate-500" />
              </button>
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((step) => (
                <div 
                  key={step} 
                  className={`rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                    activeHelpStep === step ? 'border-amber-400/30 bg-slate-950' : 'border-slate-800 hover:border-slate-700'
                  }`}
                  onClick={() => setActiveHelpStep(activeHelpStep === step ? null : step)}
                >
                  <div className="p-4 flex gap-4 items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0 shadow-lg transition-colors ${
                      activeHelpStep === step ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {step}
                    </div>
                    <h4 className={`font-black text-lg transition-colors uppercase tracking-tight ${
                      activeHelpStep === step ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {t[`helpStep${step}` as keyof typeof t]}
                    </h4>
                    <ChevronRight 
                      size={20} 
                      className={`ml-auto text-slate-600 transition-transform ${activeHelpStep === step ? 'rotate-90' : ''}`} 
                    />
                  </div>
                  
                  <AnimatePresence>
                    {activeHelpStep === step && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 ml-12"
                      >
                        <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                          {t[`helpStep${step}Desc` as keyof typeof t]}
                        </p>
                        
                        {step === 2 && (
                          <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 shadow-inner space-y-2">
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{t.helpExampleTitle}</p>
                            <p className="text-sm italic text-slate-300">"{t.helpExampleHint}"</p>
                            <div className="h-px bg-slate-800 my-2" />
                            <p className="text-sm font-black text-orange-500 uppercase tracking-tight">"{t.helpExampleTask}"</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowHelp(false)}
              className="w-full mt-8 py-4 bg-amber-400 text-slate-950 font-black rounded-2xl shadow-lg hover:bg-amber-500 transition-all uppercase tracking-widest"
            >
              {t.close}
            </button>
          </motion.div>
        </div>
      )}
      {/* Toast and Confirm */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
        confirmText={t.confirm}
        cancelText={t.cancel}
      />
    </div>
  );
}
