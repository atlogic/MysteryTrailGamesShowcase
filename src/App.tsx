import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRScanner } from './components/QRScanner';
import { PrintPage } from './components/PrintPage';
import { ParentPanel } from './components/ParentPanel';
import { 
  Egg, 
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
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { 
  loadGameFromFirebase, 
  saveGameToFirebase, 
  saveSessionToFirebase,
  STORAGE_KEY, 
  GAME_ID_KEY, 
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
  const [verificationMethod, setVerificationMethod] = useState<'qr' | 'passcode'>('qr');
  const [gameId, setGameId] = useState<string>('');
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
  const [passcodeInput, setPasscodeInput] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported MIME types
      const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
      const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedType || 'audio/webm' });
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

    const savedMethod = localStorage.getItem('easter_egg_hunt_method');
    if (savedMethod === 'qr' || savedMethod === 'passcode') {
      setVerificationMethod(savedMethod);
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
    const expectedValue = `egg_hunt_qr_${currentStage.qrNumber}`;
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
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
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
        resolve(canvas.toDataURL('image/jpeg', 0.6));
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
        setGameId(id.toUpperCase());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData.checkpoints));
        localStorage.setItem(GAME_ID_KEY, id.toUpperCase());
        localStorage.setItem('easter_egg_hunt_method', gameData.verificationMethod || 'qr');
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

  const t = TRANSLATIONS[language];

  if (gameState === 'PRINT' && showParentPanel) {
    return <PrintPage onBack={() => setGameState('START')} language={language} checkpoints={checkpoints} gameId={gameId} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 font-sans text-gray-800 p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-2xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 p-2 rounded-full shadow-md">
            <Egg className="text-white" size={24} />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-green-800 truncate max-w-[150px] sm:max-w-none">
            {t.title}
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Language Switcher */}
          <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button 
              onClick={() => setLanguage('pl')}
              className={`px-2 py-1 text-[10px] font-bold rounded ${language === 'pl' ? 'bg-green-600 text-white' : 'text-gray-400'}`}
            >
              PL
            </button>
            <button 
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-[10px] font-bold rounded ${language === 'en' ? 'bg-green-600 text-white' : 'text-gray-400'}`}
            >
              EN
            </button>
          </div>

          {gameState !== 'FINISHED' && (
            <div className="flex items-center gap-2 sm:gap-4">
              {checkpoints.length > 0 && gameState !== 'START' && (
                <div className="bg-white px-3 sm:px-4 py-1 rounded-full shadow-sm border border-green-100 flex items-center gap-2">
                  <Users size={14} className="text-green-600 sm:size-4" />
                  <span className="text-xs sm:text-sm font-bold text-green-700">{currentStageIndex + 1}/{checkpoints.length}</span>
                </div>
              )}
              <button 
                onClick={() => setShowHelp(true)}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              >
                <HelpCircle size={20} />
              </button>
              <button 
                onClick={() => setShowParentPanel(true)}
                className="p-2 text-gray-400 hover:text-green-600 transition-colors"
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
              className="bg-white p-8 rounded-3xl shadow-2xl text-center space-y-6 border-b-8 border-green-200 relative"
            >
              {/* Small QR Code in top right */}
              <button 
                onClick={() => setShowShareQR(true)}
                className="absolute top-4 right-4 p-2 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all shadow-sm group"
                title="Udostępnij grę"
              >
                <div className="relative">
                  <QRCodeSVG 
                    value={`${window.location.origin}${window.location.pathname}?game=${gameId}`} 
                    size={32}
                    level="L"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm">
                    <Share2 size={16} className="text-green-600" />
                  </div>
                </div>
              </button>

              <div className="relative inline-block">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Egg size={80} className="text-yellow-400 mx-auto" />
                </motion.div>
              </div>
              
              <h2 className="text-3xl font-extrabold text-green-900">{t.title}!</h2>
              <p className="text-sm text-green-700 font-medium mt-1 mb-4 leading-relaxed">
                {t.subtitle}
              </p>
              <p className="text-lg text-gray-600">
                {checkpoints.length > 0 ? t.welcome : t.firstGame}
              </p>
              
              {checkpoints.length > 0 ? (
                <button 
                  onClick={handleStart}
                  className="w-full py-4 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3"
                >
                  {t.start} <ArrowRight />
                </button>
              ) : (
                <button 
                  onClick={() => setShowParentPanel(true)}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3"
                >
                  {t.createNewGame} <Plus />
                </button>
              )}

              <div className="grid grid-cols-1 gap-3 pt-4">
                <button 
                  onClick={() => setShowLoadPrompt(true)}
                  className="py-3 bg-blue-50 text-blue-600 font-bold rounded-xl flex items-center justify-center gap-2 text-sm"
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
              className="bg-white p-8 rounded-3xl shadow-2xl space-y-6 border-b-8 border-blue-200"
            >
              <div className="text-center space-y-2">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <UserPlus className="text-blue-600" size={32} />
                </div>
                <h2 className="text-2xl font-black text-blue-900 uppercase">{t.teamSetup}</h2>
                <p className="text-gray-500">{t.teamMembers}</p>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto p-2">
                {teamInfo.members.map((member, index) => (
                  <div key={index} className="relative">
                    <input 
                      type="text"
                      value={member}
                      onChange={(e) => updateMember(index, e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-400 outline-none font-bold text-lg"
                      placeholder={t.memberName + ` ${index + 1}...`}
                    />
                    {member.trim() !== '' && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500">
                        <Check size={20} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1">{t.teamName}</label>
                  <input 
                    type="text"
                    value={teamInfo.name}
                    onChange={(e) => setTeamInfo({ ...teamInfo, name: e.target.value })}
                    className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-xl focus:border-blue-500 outline-none font-black text-xl text-blue-900 text-center"
                    placeholder="np. SZYBKIE ZAJĄCZKI"
                  />
                </div>

                <button 
                  onClick={handleTeamSubmit}
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest"
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
              className="bg-white p-8 rounded-3xl shadow-xl space-y-6 border-b-8 border-blue-200"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 text-blue-600">
                  <HelpCircle size={28} />
                  <span className="font-bold tracking-widest uppercase text-sm">{t.riddle} #{currentStageIndex + 1}</span>
                </div>
                <button 
                  onClick={() => speak(currentStage.hint)}
                  className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                >
                  <Volume2 size={24} />
                </button>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 leading-tight">
                {currentStage.hint}
              </h3>

              {currentStage.image && (
                <div className="rounded-2xl overflow-hidden border-4 border-blue-50 shadow-inner">
                  <img src={currentStage.image} alt="Hint" className="w-full h-48 object-cover" />
                </div>
              )}

              <button 
                onClick={() => setGameState('SCANNING')}
                className={`w-full py-4 text-white text-lg font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 ${
                  verificationMethod === 'passcode' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {verificationMethod === 'passcode' ? (
                  <>
                    <Lock size={24} /> {t.enterPasscode}
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
                <h3 className="text-xl font-bold text-green-800">
                  {verificationMethod === 'passcode' ? t.enterPasscode : t.scanQR} #{currentStage.qrNumber}
                </h3>
                <p className="text-gray-500">
                  {verificationMethod === 'passcode' ? (language === 'pl' ? 'Wpisz hasło znalezione w tym miejscu.' : 'Enter the passcode found at this location.') : t.qrInstructions}
                </p>
              </div>
              
              {verificationMethod === 'qr' ? (
                <QRScanner 
                  onScan={handleQRScan} 
                  expectedValue={`egg_hunt_qr_${currentStage.qrNumber}`} 
                  language={language}
                />
              ) : (
                <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-yellow-100 space-y-4">
                  <div className="flex items-center gap-2 text-yellow-600 mb-2">
                    <Lock size={20} />
                    <span className="font-black uppercase text-xs tracking-widest">{t.passcode}</span>
                  </div>
                  <form onSubmit={handlePasscodeSubmit} className="space-y-3">
                    <input 
                      type="text"
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      className="w-full p-4 bg-yellow-50 border-2 border-yellow-100 rounded-xl focus:border-yellow-500 outline-none font-black text-xl text-center uppercase"
                      placeholder={t.passcodePlaceholder}
                      autoFocus
                    />
                    <button 
                      type="submit"
                      className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-xl shadow-md transition-all uppercase tracking-widest"
                    >
                      {t.enter}
                    </button>
                  </form>
                </div>
              )}

              <button 
                onClick={() => setGameState('RIDDLE')}
                className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
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
              className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-6 border-b-8 border-purple-200"
            >
              <div className="flex justify-between items-start">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center">
                  <Users className="text-purple-600" size={24} />
                </div>
                <button 
                  onClick={() => speak(currentStage.task)}
                  className="p-3 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                >
                  <Volume2 size={24} />
                </button>
              </div>
              
              <h3 className="text-2xl font-bold text-purple-900">{t.task}</h3>
              <p className="text-lg text-gray-700 font-medium">
                {currentStage.task}
              </p>

              {currentStage.requirePhoto && (
                <div className="space-y-4">
                  <div className="w-full h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-purple-200 flex items-center justify-center overflow-hidden">
                    {capturedPhoto ? (
                      <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center gap-2">
                        <Camera size={32} />
                        <span className="text-sm">{t.takePhoto}</span>
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
                      className="w-full py-4 bg-purple-500 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2"
                    >
                      <Camera size={20} /> {t.takePhoto}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setCapturedPhoto(null)}
                      className="text-sm text-purple-500 font-bold flex items-center justify-center gap-1 mx-auto"
                    >
                      <RotateCcw size={14} /> {t.retakePhoto}
                    </button>
                  )}
                </div>
              )}

              {currentStage.requireAudio && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t.recordAudio}:</p>
                  <div className="flex flex-col items-center gap-4">
                    {recordedAudio ? (
                      <div className="w-full bg-red-50 p-4 rounded-2xl border-2 border-red-100 flex flex-col items-center gap-3">
                        <audio src={recordedAudio} controls className="w-full" />
                        <button 
                          onClick={() => setRecordedAudio(null)}
                          className="text-xs font-black text-red-400 uppercase tracking-widest hover:text-red-600"
                        >
                          {t.recordAgain}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-full py-8 rounded-2xl flex flex-col items-center justify-center transition-all border-4 border-dashed ${
                          isRecording 
                            ? 'bg-red-500 border-red-300 text-white animate-pulse' 
                            : 'bg-red-50 border-red-200 text-red-400 hover:bg-red-100'
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
                className={`w-full py-4 text-white text-lg font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 ${
                  (currentStage.requirePhoto && !capturedPhoto) || (currentStage.requireAudio && !recordedAudio)
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-purple-500 hover:bg-purple-600'
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
              className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-6 border-b-8 border-yellow-200"
            >
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Star className="text-yellow-600" size={32} />
              </div>
              <h3 className="text-2xl font-black text-yellow-900 uppercase">{t.evaluation}</h3>
              <p className="text-gray-600 font-medium">{t.chooseBestDesc}</p>

              <div className="grid grid-cols-1 gap-3">
                {teamInfo.members.map((member) => (
                  <button 
                    key={member}
                    onClick={() => setBestPerformer(member)}
                    className={`p-4 rounded-2xl border-2 font-bold text-lg transition-all ${
                      bestPerformer === member 
                        ? 'bg-yellow-400 border-yellow-400 text-white shadow-lg scale-[1.02]' 
                        : 'bg-white border-gray-100 text-gray-600 hover:border-yellow-200'
                    }`}
                  >
                    {member}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleEvaluationSubmit}
                className="w-full py-4 bg-green-500 text-white font-black rounded-2xl shadow-xl hover:bg-green-600 transition-all uppercase tracking-widest"
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
              className="bg-white p-10 rounded-3xl shadow-2xl text-center space-y-8 border-b-8 border-yellow-200"
            >
              <Trophy size={100} className="text-yellow-400 mx-auto" />
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-green-900 leading-tight uppercase">{t.bravo} {teamInfo.name}!</h2>
                <p className="text-xl text-gray-600">
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
                  <div className="bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-100 space-y-3">
                    <div className="flex items-center justify-center gap-2 text-yellow-700 font-black uppercase tracking-wider">
                      <Star size={20} fill="currentColor" />
                      <span>{t.specialMention}</span>
                      <Star size={20} fill="currentColor" />
                    </div>
                    <p className="text-gray-600 font-medium">{t.mostOutstanding}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {winners.map((name) => (
                        <span key={name} className="px-4 py-2 bg-yellow-400 text-white font-black rounded-xl shadow-md text-lg">
                          {name}
                        </span>
                      ))}
                    </div>
                    {winners.length > 1 && (
                      <p className="text-xs text-yellow-600 font-bold uppercase mt-2">{t.tie}</p>
                    )}
                  </div>
                );
              })()}

              <button 
                onClick={() => setGameState('START')}
                className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
              >
                {t.playAgain}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>


      {/* Load Game Prompt */}
      {showLoadPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm space-y-6 my-auto"
          >
            <div className="text-center space-y-2">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <Download className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl font-bold">{t.downloadGame}</h3>
              <p className="text-sm text-gray-500">{t.enterCode}</p>
            </div>
            <form onSubmit={handleLoadGame} className="space-y-4">
              <input 
                type="text" 
                value={loadId}
                onChange={(e) => setLoadId(e.target.value.toUpperCase())}
                className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-blue-400 outline-none text-center text-2xl font-mono font-bold"
                placeholder={language === 'pl' ? 'KOD...' : 'CODE...'}
                maxLength={6}
                autoFocus
              />
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowLoadPrompt(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
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
          onUpdate={(newCp, newId, newMethod) => {
            setCheckpoints(newCp);
            setGameId(newId);
            setVerificationMethod(newMethod);
          }}
          onPrint={() => setGameState('PRINT')}
          onClose={() => setShowParentPanel(false)}
        />
      )}

      {/* Share QR Modal */}
      {showShareQR && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm space-y-6 text-center my-auto"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold text-green-800">{t.share}</h3>
              <button onClick={() => setShowShareQR(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-green-100 flex justify-center">
              <QRCodeSVG 
                value={`${window.location.origin}${window.location.pathname}?game=${gameId}`} 
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500 font-medium">Link:</p>
              <button 
                onClick={() => {
                  const link = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
                  navigator.clipboard.writeText(link);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between group hover:border-green-300 transition-all"
              >
                <span className="text-xs text-gray-400 truncate mr-2">
                  {`${window.location.origin}${window.location.pathname}?game=${gameId}`}
                </span>
                {copiedLink ? (
                  <Check size={18} className="text-green-500 shrink-0" />
                ) : (
                  <Copy size={18} className="text-gray-400 group-hover:text-green-600 shrink-0" />
                )}
              </button>
              {copiedLink && (
                <p className="text-[10px] text-green-600 font-bold uppercase animate-pulse">{t.copyLink}</p>
              )}
            </div>

            <button 
              onClick={() => setShowShareQR(false)}
              className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg"
            >
              {t.enter}
            </button>
          </motion.div>
        </div>
      )}
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-lg my-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-2xl">
                  <HelpCircle className="text-blue-600" size={28} />
                </div>
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tight">{t.howToPlay}</h3>
              </div>
              <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={28} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((step) => (
                <div 
                  key={step} 
                  className={`rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                    activeHelpStep === step ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 hover:border-blue-100'
                  }`}
                  onClick={() => setActiveHelpStep(activeHelpStep === step ? null : step)}
                >
                  <div className="p-4 flex gap-4 items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm transition-colors ${
                      activeHelpStep === step ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {step}
                    </div>
                    <h4 className={`font-bold text-lg transition-colors ${
                      activeHelpStep === step ? 'text-blue-900' : 'text-gray-700'
                    }`}>
                      {t[`helpStep${step}` as keyof typeof t]}
                    </h4>
                    <ChevronRight 
                      size={20} 
                      className={`ml-auto text-gray-400 transition-transform ${activeHelpStep === step ? 'rotate-90' : ''}`} 
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
                        <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                          {t[`helpStep${step}Desc` as keyof typeof t]}
                        </p>
                        
                        {step === 2 && (
                          <div className="mt-4 p-4 bg-white rounded-xl border border-blue-100 shadow-sm space-y-2">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">{t.helpExampleTitle}</p>
                            <p className="text-sm italic text-gray-700">"{t.helpExampleHint}"</p>
                            <div className="h-px bg-blue-50 my-2" />
                            <p className="text-sm font-medium text-green-700">"{t.helpExampleTask}"</p>
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
              className="w-full mt-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"
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
