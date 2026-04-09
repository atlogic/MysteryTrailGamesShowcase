import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Checkpoint } from '../types';
import { saveGameToFirebase, STORAGE_KEY } from '../constants';
import { 
  Plus, 
  Trash2, 
  Save, 
  Image as ImageIcon, 
  Camera, 
  X,
  Copy,
  Check,
  AlertCircle,
  Star,
  Mic,
  History,
  ChevronRight,
  Calendar,
  Printer,
  LayoutGrid,
  PlusCircle,
  LogOut,
  Share2,
  Mail,
  Lock,
  QrCode,
  MapPin,
  HelpCircle,
  Archive
} from 'lucide-react';
import { loadSessionsFromFirebase, loadUserGamesFromFirebase, loadSessionResults, saveSessionToFirebase, generateGameId, GAME_ID_KEY, PARENT_ID_KEY, TRANSLATIONS } from '../constants';
import { GameSession, GameData, Language } from '../types';
import { Toast, ToastType, ConfirmModal } from './Toast';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { auth } from '../firebase';
import { QRCodeSVG } from 'qrcode.react';

interface ParentPanelProps {
  checkpoints: Checkpoint[];
  gameId: string;
  language: Language;
  verificationMethod: 'qr' | 'passcode' | 'gps';
  gpsThreshold?: number;
  gpsViewMode?: 'radar' | 'map' | 'satellite';
  timeLimit?: number;
  extraTimeLimit?: number;
  onUpdate: (
    newCheckpoints: Checkpoint[], 
    newGameId: string, 
    newMethod: 'qr' | 'passcode' | 'gps', 
    newParentId: string,
    gpsThreshold?: number,
    gpsViewMode?: 'radar' | 'map' | 'satellite',
    timeLimit?: number,
    extraTimeLimit?: number
  ) => void;
  onPrint: () => void;
  onClose: () => void;
}

export const ParentPanel: React.FC<ParentPanelProps> = ({ 
  checkpoints, 
  gameId, 
  language, 
  verificationMethod, 
  gpsThreshold = 20,
  gpsViewMode = 'radar',
  timeLimit = 0,
  extraTimeLimit = 0,
  onUpdate, 
  onPrint, 
  onClose 
}) => {
  const t = TRANSLATIONS[language];
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [localCheckpoints, setLocalCheckpoints] = useState<Checkpoint[]>(checkpoints);
  const [localMethod, setLocalMethod] = useState<'qr' | 'passcode' | 'gps'>(verificationMethod);
  const [localGpsThreshold, setLocalGpsThreshold] = useState<number>(gpsThreshold);
  const [localGpsViewMode, setLocalGpsViewMode] = useState<'radar' | 'map' | 'satellite'>(gpsViewMode);
  const [localTimeLimit, setLocalTimeLimit] = useState<number>(timeLimit);
  const [localExtraTimeLimit, setLocalExtraTimeLimit] = useState<number>(extraTimeLimit);
  const [isTimePressure, setIsTimePressure] = useState<boolean>(timeLimit > 0);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'history' | 'my-games'>('config');
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [userGames, setUserGames] = useState<GameData[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null);

  // Toast and Confirm state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const handleConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirm({ title, message, onConfirm });
  };

  // Sync local state when props change (e.g. from startNewGame or selectGame)
  useEffect(() => {
    setLocalCheckpoints(checkpoints);
  }, [checkpoints]);

  useEffect(() => {
    setLocalMethod(verificationMethod);
  }, [verificationMethod]);

  useEffect(() => {
    setLocalGpsThreshold(gpsThreshold);
  }, [gpsThreshold]);

  useEffect(() => {
    setLocalGpsViewMode(gpsViewMode);
  }, [gpsViewMode]);

  useEffect(() => {
    setLocalTimeLimit(timeLimit);
    setIsTimePressure(timeLimit > 0);
  }, [timeLimit]);

  useEffect(() => {
    setLocalExtraTimeLimit(extraTimeLimit);
  }, [extraTimeLimit]);
  
  // Auth state
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const compressBase64Image = async (base64: string, maxWidth = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const fetchAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`Failed to fetch and convert ${url}:`, error);
      throw error;
    }
  };

  const generateTestImage = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Create a nice gradient background
    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, '#ef4444');
    gradient.addColorStop(1, '#9333ea');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);

    // Add some "real" looking elements
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 800, Math.random() * 600, Math.random() * 100, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ZDJĘCIE TESTOWE', 400, 280);
    ctx.font = '20px sans-serif';
    ctx.fillText(new Date().toLocaleString(), 400, 320);

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const generateTestAudio = async (): Promise<string> => {
    const duration = 3; // seconds
    const sampleRate = 44100;
    const numChannels = 1;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = audioContext.createBuffer(numChannels, sampleRate * duration, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate a "long sound" - a sweeping frequency
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const freq = 200 + 400 * (t / duration); // Sweep from 200Hz to 600Hz
      channelData[i] = Math.sin(2 * Math.PI * freq * t) * 0.5;
    }

    // Helper to convert AudioBuffer to WAV
    const bufferToWav = (abuffer: AudioBuffer) => {
      const numOfChan = abuffer.numberOfChannels;
      const length = abuffer.length * numOfChan * 2 + 44;
      const buffer = new ArrayBuffer(length);
      const view = new DataView(buffer);
      const channels = [];
      let i;
      let sample;
      let offset = 0;
      let pos = 0;

      const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
      const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

      setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
      setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
      setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
      setUint16(numOfChan * 2); setUint16(16);
      setUint32(0x61746164); setUint32(length - pos - 4);

      for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));
      while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
          sample = Math.max(-1, Math.min(1, channels[i][offset]));
          sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0;
          view.setInt16(pos, sample, true);
          pos += 2;
        }
        offset++;
      }
      return new Blob([buffer], { type: "audio/wav" });
    };

    const wavBlob = bufferToWav(buffer);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(wavBlob);
    });
  };

  const seedTestData = async () => {
    if (!user) return;
    
    setIsSeeding(true);
    try {
      console.log("[Test] Generowanie mediów lokalnie (bez CORS)...");
      
      const samplePhoto = generateTestImage();
      const sampleAudio = await generateTestAudio();

      console.log(`[Test] Rozmiar zdjęcia: ${Math.round(samplePhoto.length / 1024)} KB`);
      console.log(`[Test] Rozmiar dźwięku: ${Math.round(sampleAudio.length / 1024)} KB`);

      const testSession: GameSession = {
        id: `test_${Date.now()}`,
        gameId: gameId,
        parentId: user.uid,
        teamName: "EKIPA TESTOWA 🚀",
        members: ["Tester Adam", "Testerka Ewa"],
        timestamp: Date.now(),
        results: [
          {
            checkpointId: checkpoints[0]?.id || '1',
            photo: samplePhoto,
            audio: sampleAudio,
            bestPerformer: "Tester Adam"
          }
        ]
      };
      
      console.log("[Test] Wysyłanie sesji z wygenerowanymi mediami...", testSession.id);
      await saveSessionToFirebase(testSession);
      showToast(language === 'pl' ? 'Sukces! Dane wygenerowane i zapisane w bazie.' : 'Success! Data generated and saved in DB.', 'success');
      loadHistory();
    } catch (err) {
      console.error("Błąd podczas seedowania:", err);
      showToast("Błąd zapisu danych testowych.", 'error');
    } finally {
      setIsSeeding(false);
    }
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Share modal
  const [shareGame, setShareGame] = useState<GameData | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setAuthError('');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setAuthError(t.authError || "Błąd autoryzacji");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setAuthError(t.authError || "Błąd autoryzacji");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    onClose();
  };

  const getCurrentLocation = (id: string) => {
    if (!navigator.geolocation) {
      showToast(t.locationError, 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateCheckpoint(id, { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        });
        showToast(t.locationSuccess, 'success');
      },
      (error) => {
        console.error("Geolocation error:", error);
        showToast(t.locationError, 'error');
      },
      { enableHighAccuracy: true }
    );
  };

  const startNewGame = () => {
    handleConfirm(t.confirm, t.confirmNewGame, () => {
      const newId = generateGameId();
      const parentId = user?.uid || '';
      setLocalCheckpoints([]);
      setLocalMethod('qr');
      onUpdate([], newId, 'qr', parentId);
      localStorage.setItem(GAME_ID_KEY, newId);
      localStorage.setItem(PARENT_ID_KEY, parentId);
      localStorage.setItem('mystery_trail_method', 'qr');
      setActiveTab('config');
    });
  };

  const loadMyGames = async () => {
    setActiveTab('my-games');
    setIsLoadingGames(true);
    try {
      const data = await loadUserGamesFromFirebase();
      setUserGames(data);
    } catch (err) {
      console.error("Games load error:", err);
    } finally {
      setIsLoadingGames(false);
    }
  };

  const selectGame = (game: GameData) => {
    setLocalCheckpoints(game.checkpoints);
    setLocalMethod(game.verificationMethod || 'qr');
    onUpdate(game.checkpoints, game.id, game.verificationMethod || 'qr', game.parentId);
    localStorage.setItem(GAME_ID_KEY, game.id);
    localStorage.setItem(PARENT_ID_KEY, game.parentId);
    setActiveTab('config');
  };

  const addCheckpoint = () => {
    const newCp: Checkpoint = {
      id: Date.now().toString(),
      name: '',
      hint: '',
      task: '',
      requirePhoto: false,
      requireAudio: false,
      requireEvaluation: false,
      qrNumber: localCheckpoints.length + 1
    };
    setLocalCheckpoints([...localCheckpoints, newCp]);
  };

  const loadHistory = async () => {
    setActiveTab('history');
    setIsLoadingSessions(true);
    try {
      const data = await loadSessionsFromFirebase(gameId);
      // Results are now lazy loaded, so we initialize sessions without them
      setSessions(data);
    } catch (err) {
      console.error("History load error:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const toggleSession = async (session: GameSession) => {
    console.log("[History] Toggling session:", session.id);
    if (selectedSession?.id === session.id) {
      setSelectedSession(null);
      return;
    }
    
    setSelectedSession(session);
    
    // If results are not loaded yet, fetch them from the sub-collection
    if (!session.results || session.results.length === 0) {
      console.log("[History] Loading results for session:", session.id);
      try {
        const results = await loadSessionResults(session.id);
        console.log("[History] Results loaded:", results.length);
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, results } : s));
        // Update selected session to show the results immediately
        setSelectedSession({ ...session, results });
      } catch (err) {
        console.error("Error loading session results:", err);
      }
    } else {
      console.log("[History] Results already present:", session.results.length);
    }
  };

  const removeCheckpoint = (id: string) => {
    const filtered = localCheckpoints.filter(cp => cp.id !== id);
    const reindexed = filtered.map((cp, index) => ({ ...cp, qrNumber: index + 1 }));
    setLocalCheckpoints(reindexed);
  };

  const updateCheckpoint = (id: string, updates: Partial<Checkpoint>) => {
    setLocalCheckpoints(localCheckpoints.map(cp => cp.id === id ? { ...cp, ...updates } : cp));
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
        
        // Compress to JPEG with 0.6 quality for smaller size
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Automatically compress any uploaded image
        const compressed = await compressImage(file);
        updateCheckpoint(id, { image: compressed });
      } catch (err) {
        console.error("Compression error:", err);
        showToast(t.errorProcessingImage, 'error');
      }
    }
  };

  const handleSave = async () => {
    if (localCheckpoints.length === 0) {
      showToast(t.addAtLeastOne, 'error');
      return;
    }

    // Basic validation for each checkpoint
    for (const cp of localCheckpoints) {
      if (!cp.name.trim() || !cp.hint.trim() || !cp.task.trim()) {
        showToast(language === 'pl' ? 'Wszystkie pola (nazwa, zagadka, zadanie) muszą być wypełnione!' : 'All fields (name, riddle, task) must be filled!', 'error');
        return;
      }
      if (cp.name.length > 100 || cp.hint.length > 1000 || cp.task.length > 1000) {
        showToast(language === 'pl' ? 'Niektóre pola są za długie!' : 'Some fields are too long!', 'error');
        return;
      }
    }
    
    setIsSaving(true);
    try {
      const savedId = await saveGameToFirebase(gameId, localCheckpoints, localMethod, localGpsThreshold, localGpsViewMode);
      // Update with time limits
      const parentId = user?.uid || '';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localCheckpoints));
      localStorage.setItem('mystery_trail_method', localMethod);
      localStorage.setItem('mystery_trail_gps_threshold', localGpsThreshold.toString());
      localStorage.setItem('mystery_trail_gps_view_mode', localGpsViewMode);
      localStorage.setItem(GAME_ID_KEY, savedId);
      localStorage.setItem(PARENT_ID_KEY, parentId);
      onUpdate(localCheckpoints, savedId, localMethod, parentId, localGpsThreshold, localGpsViewMode, localTimeLimit, localExtraTimeLimit);
      showToast(t.savedSuccess + savedId, 'success');
      onClose();
    } catch (error: any) {
      console.error("Save error:", error);
      let msg = t.errorGeneric;
      if (error.message && error.message.includes("quota")) {
        msg = t.errorQuota;
      } else if (error.message && error.message.includes("large")) {
        msg = t.errorLarge;
      } else if (error.message && error.message.includes("permission")) {
        msg = language === 'pl' ? 'Brak uprawnień do zapisu! Zaloguj się ponownie.' : 'No write permissions! Please log in again.';
      }
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const copyGameId = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <div className="bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 my-auto border border-slate-800">
          <div className="p-6 bg-slate-950 text-amber-400 flex justify-between items-center border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-serif font-black uppercase tracking-tight">{t.loginTitle}</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t.loginDesc}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <X size={24} className="text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleAuth} className="p-6 space-y-4">
            {authError && (
              <div className="p-3 bg-orange-950/30 border border-orange-500/30 rounded-xl flex items-center gap-2 text-orange-500 text-[10px] font-black uppercase tracking-widest shadow-inner">
                <AlertCircle size={16} /> {authError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">{t.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-xl focus:border-amber-400 focus:bg-slate-950 transition-all outline-none text-sm font-bold text-slate-200 shadow-inner"
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">{t.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-xl focus:border-amber-400 focus:bg-slate-950 transition-all outline-none text-sm font-bold text-slate-200 shadow-inner"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg hover:bg-amber-500 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              {authLoading ? <div className="w-5 h-5 border-3 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> : (isLogin ? t.signIn : t.signUp)}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="bg-slate-900 px-2 text-slate-600">LUB</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleAuth}
              disabled={authLoading}
              className="w-full py-3 bg-slate-800 border-2 border-slate-700 text-slate-300 font-bold rounded-xl shadow-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t.signInWithGoogle}
            </button>

            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center text-xs font-black text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-widest"
            >
              {isLogin ? t.noAccount : t.haveAccount}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-4xl h-[90vh] sm:h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 my-auto border border-slate-800">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-950 text-amber-400 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-slate-800 p-2 rounded-xl border border-slate-700">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-tight">{t.parentPanel}</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              title={t.logout}
            >
              <LogOut size={20} className="text-slate-500" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={24} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-950 p-2 gap-2 border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-amber-400 text-slate-950 shadow-lg' : 'text-slate-500 hover:bg-slate-900'}`}
          >
            {t.edit}
          </button>
          <button 
            onClick={loadMyGames}
            className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'my-games' ? 'bg-amber-400 text-slate-950 shadow-lg' : 'text-slate-500 hover:bg-slate-900'}`}
          >
            <LayoutGrid size={14} /> {t.myGames}
          </button>
          <button 
            onClick={loadHistory}
            className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-amber-400 text-slate-950 shadow-lg' : 'text-slate-500 hover:bg-slate-900'}`}
          >
            <History size={14} /> {t.history}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-slate-950">
          {/* Image Zoom Modal */}
          <AnimatePresence>
            {zoomImage && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-950/95 flex items-center justify-center p-4 backdrop-blur-sm"
                onClick={() => setZoomImage(null)}
              >
                <button className="absolute top-4 right-4 text-slate-500 hover:text-amber-400 p-2 transition-colors">
                  <X size={32} />
                </button>
                <motion.img 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  src={zoomImage} 
                  className="max-w-full max-h-full rounded-2xl shadow-2xl border border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'config' ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <button 
                  onClick={startNewGame}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-amber-400 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700"
                >
                  <PlusCircle size={16} /> {t.newGame}
                </button>
                {localCheckpoints.length > 0 && (
                  <button 
                    onClick={onPrint}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-amber-400 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700"
                  >
                    <Printer size={16} /> {t.printQR}
                  </button>
                )}
              </div>

              {/* Verification Method Selection */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-4 shadow-xl">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">{t.verificationMethod}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button 
                    onClick={() => {
                      if (localMethod === 'passcode' && localCheckpoints.some(cp => cp.passcode)) {
                        handleConfirm(t.confirm, t.methodWarning, () => {
                          setLocalMethod('qr');
                          setLocalCheckpoints(localCheckpoints.map(cp => ({ ...cp, passcode: undefined })));
                        });
                      } else {
                        setLocalMethod('qr');
                      }
                    }}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                      localMethod === 'qr' 
                        ? 'bg-amber-400 border-amber-400 text-slate-950 shadow-lg' 
                        : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-amber-400/30'
                    }`}
                  >
                    <QrCode size={16} /> {t.qrMethod}
                  </button>
                  <button 
                    onClick={() => setLocalMethod('passcode')}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                      localMethod === 'passcode' 
                        ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-lg' 
                        : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-cyan-400/30'
                    }`}
                  >
                    <Lock size={16} /> {t.passcodeMethod}
                  </button>
                  <button 
                    onClick={() => setLocalMethod('gps')}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                      localMethod === 'gps' 
                        ? 'bg-orange-600 border-orange-600 text-white shadow-lg' 
                        : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-orange-400/30'
                    }`}
                  >
                    <MapPin size={16} /> {t.gpsMethod}
                  </button>
                </div>

                {localMethod === 'gps' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-slate-800 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.gpsThreshold}</label>
                          <span className="text-[10px] font-black text-amber-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 uppercase tracking-widest">{localGpsThreshold}m</span>
                        </div>
                        <input 
                          type="range" 
                          min="3" 
                          max="100" 
                          step="1"
                          value={localGpsThreshold}
                          onChange={(e) => setLocalGpsThreshold(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                        <p className="text-[10px] text-slate-600 italic uppercase tracking-widest">{t.accuracyHint}</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.gpsViewMode}</label>
                        <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                          {(['radar', 'map', 'satellite'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setLocalGpsViewMode(mode)}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                localGpsViewMode === mode 
                                  ? 'bg-slate-800 text-amber-400 shadow-lg border border-slate-700' 
                                  : 'text-slate-600 hover:text-slate-400'
                              }`}
                            >
                              {t[mode]}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-600 italic uppercase tracking-widest">{t.viewModeHint}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Time Limits */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-4 shadow-xl space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Archive size={16} className="text-amber-400" />
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.timePressure}</label>
                  </div>
                  <button 
                    onClick={() => {
                      const newState = !isTimePressure;
                      setIsTimePressure(newState);
                      if (!newState) {
                        setLocalTimeLimit(0);
                        setLocalExtraTimeLimit(0);
                      } else {
                        setLocalTimeLimit(30);
                        setLocalExtraTimeLimit(15);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                      isTimePressure 
                        ? 'bg-amber-400 border-amber-400 text-slate-950' 
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    {isTimePressure ? t.timePressureEnabled : t.timePressureDisabled}
                  </button>
                </div>
                
                {isTimePressure && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.timeLimit}</label>
                        <span className="text-[10px] font-black text-amber-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 uppercase tracking-widest">{localTimeLimit} min</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="120" 
                        step="5"
                        value={localTimeLimit}
                        onChange={(e) => setLocalTimeLimit(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                      <p className="text-[10px] text-slate-600 italic uppercase tracking-widest">{t.timeLimitHint}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.extraTime}</label>
                        <span className="text-[10px] font-black text-orange-500 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 uppercase tracking-widest">{localExtraTimeLimit} min</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="60" 
                        step="5"
                        value={localExtraTimeLimit}
                        onChange={(e) => setLocalExtraTimeLimit(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <p className="text-[10px] text-slate-600 italic uppercase tracking-widest">{t.extraTimeHint}</p>
                    </div>
                  </motion.div>
                )}
              </div>
              {localCheckpoints.length === 0 && (
                <div className="text-center py-8 text-slate-600">
                  <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{t.emptyRoute}</p>
                </div>
              )}

              {localCheckpoints.map((cp, index) => (
                <div key={cp.id} className="bg-slate-900 rounded-xl p-3 sm:p-4 shadow-xl border border-slate-800 relative group">
                  <div className="absolute -top-2 -left-2 bg-amber-400 text-slate-950 w-8 h-8 rounded-lg flex items-center justify-center font-black shadow-lg z-10 text-sm">
                    {index + 1}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Left Side: Inputs */}
                    <div className="md:col-span-9 space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase mb-0.5 ml-1 tracking-widest">{t.stepName}</label>
                          <input 
                            type="text" 
                            value={cp.name}
                            onChange={(e) => updateCheckpoint(cp.id, { name: e.target.value })}
                            className="w-full p-2.5 text-base font-bold rounded-lg border-2 border-slate-800 focus:border-amber-400 focus:bg-slate-950 bg-slate-950 text-slate-200 outline-none transition-all shadow-inner"
                            placeholder={language === 'pl' ? 'Gdzie ukryjesz kod?' : 'Where will you hide the code?'}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase mb-0.5 ml-1 tracking-widest">{t.stepHint}</label>
                          <textarea 
                            value={cp.hint}
                            onChange={(e) => updateCheckpoint(cp.id, { hint: e.target.value })}
                            className="w-full p-2.5 text-sm font-medium rounded-lg border-2 border-slate-800 focus:border-amber-400 focus:bg-slate-950 bg-slate-950 text-slate-300 outline-none transition-all h-16 resize-none shadow-inner"
                            placeholder={language === 'pl' ? 'Podpowiedź dla Graczy...' : 'Hint for Players...'}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase mb-0.5 ml-1 tracking-widest">{t.extraHint}</label>
                          <textarea 
                            value={cp.extraHint || ''}
                            onChange={(e) => updateCheckpoint(cp.id, { extraHint: e.target.value })}
                            className="w-full p-2.5 text-sm font-medium rounded-lg border-2 border-slate-800 focus:border-amber-400 focus:bg-slate-950 bg-slate-950 text-slate-300 outline-none transition-all h-12 resize-none shadow-inner"
                            placeholder={language === 'pl' ? 'Dodatkowa podpowiedź (płatna -1 pkt)...' : 'Extra hint (costs -1 pt)...'}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase mb-0.5 ml-1 tracking-widest">{t.stepTask}</label>
                          <input 
                            type="text" 
                            value={cp.task}
                            onChange={(e) => updateCheckpoint(cp.id, { task: e.target.value })}
                            className="w-full p-2.5 text-sm font-bold rounded-lg border-2 border-slate-800 focus:border-orange-500 focus:bg-slate-950 bg-slate-950 text-slate-200 outline-none transition-all shadow-inner"
                            placeholder={language === 'pl' ? 'Co muszą zrobić?' : 'What do they have to do?'}
                          />
                        </div>
                        {localMethod === 'passcode' && (
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase mb-0.5 ml-1 tracking-widest">{t.passcode}</label>
                            <input 
                              type="text" 
                              value={cp.passcode || ''}
                              onChange={(e) => updateCheckpoint(cp.id, { passcode: e.target.value.toUpperCase() })}
                              className="w-full p-2.5 text-sm font-bold rounded-lg border-2 border-slate-800 focus:border-cyan-500 focus:bg-slate-950 bg-slate-950 text-cyan-400 outline-none transition-all shadow-inner"
                              placeholder={t.passcodePlaceholder}
                            />
                          </div>
                        )}
                        {localMethod === 'gps' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase mb-0.5 ml-1 tracking-widest">{t.latitude}</label>
                              <input 
                                type="number" 
                                step="any"
                                value={cp.lat || ''}
                                onChange={(e) => updateCheckpoint(cp.id, { lat: parseFloat(e.target.value) })}
                                className="w-full p-2.5 text-sm font-bold rounded-lg border-2 border-slate-800 focus:border-amber-400 focus:bg-slate-950 bg-slate-950 text-slate-200 outline-none transition-all shadow-inner"
                                placeholder="52.2297"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase mb-0.5 ml-1 tracking-widest">{t.longitude}</label>
                              <div className="flex gap-2">
                                <input 
                                  type="number" 
                                  step="any"
                                  value={cp.lng || ''}
                                  onChange={(e) => updateCheckpoint(cp.id, { lng: parseFloat(e.target.value) })}
                                  className="flex-1 p-2.5 text-sm font-bold rounded-lg border-2 border-slate-800 focus:border-amber-400 focus:bg-slate-950 bg-slate-950 text-slate-200 outline-none transition-all shadow-inner"
                                  placeholder="21.0122"
                                />
                                <button 
                                  onClick={() => getCurrentLocation(cp.id)}
                                  className="p-2.5 bg-slate-800 text-amber-400 rounded-lg border-2 border-slate-700 hover:bg-slate-700 transition-all flex items-center justify-center"
                                  title={t.getCurrentLocation}
                                >
                                  <MapPin size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        {cp.requireAnswer && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3 shadow-inner"
                          >
                            <div className="flex gap-2">
                              {(['text', 'choice'] as const).map((type) => (
                                <button
                                  key={type}
                                  onClick={() => updateCheckpoint(cp.id, { answerType: type })}
                                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                                    cp.answerType === type 
                                      ? 'bg-cyan-500 border-cyan-500 text-slate-950' 
                                      : 'bg-slate-900 border-slate-800 text-slate-500'
                                  }`}
                                >
                                  {type === 'text' ? t.textAnswer : t.choiceAnswer}
                                </button>
                              ))}
                            </div>

                            {cp.answerType === 'text' ? (
                              <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-widest">{t.correctAnswer}</label>
                                <input 
                                  type="text" 
                                  value={cp.correctAnswer || ''}
                                  onChange={(e) => updateCheckpoint(cp.id, { correctAnswer: e.target.value })}
                                  className="w-full p-2 text-sm font-bold rounded-lg border-2 border-slate-800 focus:border-cyan-400 focus:bg-slate-950 bg-slate-950 text-cyan-400 outline-none transition-all shadow-inner"
                                  placeholder={t.enterAnswer}
                                />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-[9px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-widest">{t.choiceAnswer} (A, B, C, D)</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {['A', 'B', 'C', 'D'].map((label, idx) => (
                                    <div key={label} className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-black text-slate-600">{label}</span>
                                        <input 
                                          type="text" 
                                          value={cp.choices?.[idx] || ''}
                                          onChange={(e) => {
                                            const newChoices = [...(cp.choices || ['', '', '', ''])];
                                            newChoices[idx] = e.target.value;
                                            updateCheckpoint(cp.id, { choices: newChoices });
                                          }}
                                          className="flex-1 p-1.5 text-xs font-bold rounded-lg border-2 border-slate-800 focus:border-cyan-400 focus:bg-slate-950 bg-slate-950 text-slate-300 outline-none transition-all"
                                          placeholder="..."
                                        />
                                      </div>
                                      <button
                                        onClick={() => updateCheckpoint(cp.id, { correctAnswer: label })}
                                        className={`py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all border ${
                                          cp.correctAnswer === label 
                                            ? 'bg-cyan-500 border-cyan-500 text-slate-950' 
                                            : 'bg-slate-900 border-slate-800 text-slate-600'
                                        }`}
                                      >
                                        {t.correctChoice}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button 
                          onClick={() => updateCheckpoint(cp.id, { requirePhoto: !cp.requirePhoto })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                            cp.requirePhoto 
                              ? 'bg-amber-400 border-amber-400 text-slate-950 shadow-md' 
                              : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-amber-400/30'
                          }`}
                        >
                          <Camera size={14} />
                          {cp.requirePhoto ? t.photo : (language === 'pl' ? 'BEZ ZDJĘCIA' : 'NO PHOTO')}
                        </button>
                        <button 
                          onClick={() => updateCheckpoint(cp.id, { requireEvaluation: !cp.requireEvaluation })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                            cp.requireEvaluation 
                              ? 'bg-amber-400 border-amber-400 text-slate-950 shadow-md' 
                              : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-amber-400/30'
                          }`}
                        >
                          <Star size={14} />
                          {cp.requireEvaluation ? t.evalRequired : t.evalNotRequired}
                        </button>
                        <button 
                          onClick={() => updateCheckpoint(cp.id, { requireAudio: !cp.requireAudio })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                            cp.requireAudio 
                              ? 'bg-orange-600 border-orange-600 text-white shadow-md' 
                              : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-orange-400/30'
                          }`}
                        >
                          <Mic size={14} />
                          {cp.requireAudio ? t.audioRequired : t.audioNotRequired}
                        </button>
                        <button 
                          onClick={() => updateCheckpoint(cp.id, { 
                            requireAnswer: !cp.requireAnswer,
                            answerType: cp.requireAnswer ? undefined : 'text',
                            correctAnswer: cp.requireAnswer ? undefined : '',
                            choices: cp.requireAnswer ? undefined : ['', '', '', '']
                          })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                            cp.requireAnswer 
                              ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-md' 
                              : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-cyan-400/30'
                          }`}
                        >
                          <HelpCircle size={14} />
                          {cp.requireAnswer ? t.answerRequired : t.answerNotRequired}
                        </button>
                        <div className="px-2 py-1 bg-slate-800 text-amber-400 rounded-lg border border-slate-700 font-mono font-black text-[10px] uppercase tracking-widest">
                          {t.qrNumber}{cp.qrNumber}
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Image Upload */}
                    <div className="md:col-span-3 flex flex-col items-center justify-start gap-1.5">
                      <label className="w-full cursor-pointer group/img">
                        <div className="aspect-square w-full bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center overflow-hidden group-hover/img:border-amber-400/50 transition-all shadow-inner">
                          {cp.image ? (
                            <img src={cp.image} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center text-slate-700">
                              <ImageIcon size={24} />
                              <span className="text-[9px] font-black mt-1 uppercase tracking-widest">{t.photo}</span>
                            </div>
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(cp.id, e)} />
                      </label>
                      {cp.image && (
                        <button 
                          onClick={() => updateCheckpoint(cp.id, { image: undefined })}
                          className="text-[9px] font-black text-orange-500 hover:text-orange-400 uppercase tracking-widest"
                        >
                          {t.delete}
                        </button>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => removeCheckpoint(cp.id)}
                    className="absolute top-2 right-2 p-1.5 text-slate-700 hover:text-orange-500 transition-colors opacity-0 group-hover:opacity-100"
                    title={t.deleteStep}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button 
                onClick={addCheckpoint}
                className="w-full py-8 border-4 border-dashed border-slate-800 rounded-2xl text-slate-700 hover:text-amber-400 hover:border-amber-400/30 hover:bg-slate-900/50 transition-all flex flex-col items-center gap-1 group"
              >
                <Plus size={32} className="group-hover:scale-110 transition-transform" />
                <span className="font-black text-sm uppercase tracking-widest">{t.addStep}</span>
              </button>
            </>
          ) : activeTab === 'my-games' ? (
            <div className="space-y-4">
              {isLoadingGames ? (
                <div className="flex flex-col items-center py-12 text-slate-500">
                  <div className="w-8 h-8 border-4 border-slate-800 border-t-amber-400 rounded-full animate-spin mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">{t.loadingGames}</p>
                </div>
              ) : userGames.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  <LayoutGrid size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="text-sm font-black uppercase tracking-widest">{t.noGames}</p>
                  <button 
                    onClick={startNewGame}
                    className="mt-4 px-6 py-2 bg-amber-400 text-slate-950 rounded-lg font-black text-xs uppercase tracking-widest shadow-lg hover:bg-amber-500 transition-all"
                  >
                    {t.firstGame}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userGames.map(game => (
                    <button 
                      key={game.id}
                      onClick={() => selectGame(game)}
                      className={`p-4 rounded-xl border-2 text-left transition-all shadow-xl ${
                        gameId === game.id 
                          ? 'border-amber-400 bg-slate-800' 
                          : 'border-slate-800 bg-slate-900 hover:border-amber-400/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono font-black text-amber-400 text-xs uppercase tracking-widest">{game.id}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShareGame(game);
                            }}
                            className="p-1.5 bg-slate-800 text-amber-400 rounded-lg hover:bg-slate-700 border border-slate-700"
                          >
                            <Share2 size={14} />
                          </button>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                            {new Date(game.createdAt).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-black text-slate-200 mb-1 uppercase tracking-widest">
                        {game.checkpoints.length} {t.points}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold truncate uppercase tracking-widest">
                        {game.checkpoints.map(cp => cp.name).join(', ')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button 
                  onClick={seedTestData}
                  disabled={isSeeding}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2 border border-slate-700"
                >
                  {isSeeding ? <div className="w-3 h-3 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" /> : <Plus size={12} />}
                  Testuj Historię (Dodaj Dane)
                </button>
              </div>
              {isLoadingSessions ? (
                <div className="flex flex-col items-center py-12 text-slate-500">
                  <div className="w-8 h-8 border-4 border-slate-800 border-t-amber-400 rounded-full animate-spin mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">{t.loadingHistory}</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  <History size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="text-sm font-black uppercase tracking-widest">{t.noSessions}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {sessions.map(session => (
                    <div key={session.id} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                      <button 
                        onClick={() => toggleSession(session)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                            <Calendar size={20} className="text-amber-400" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-black text-slate-200 uppercase text-sm tracking-widest">{session.teamName}</h4>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                              {new Date(session.timestamp).toLocaleString(language === 'pl' ? 'pl-PL' : 'en-US')} • {session.members.length} {t.people}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`text-slate-700 transition-transform ${selectedSession?.id === session.id ? 'rotate-90' : ''}`} />
                      </button>

                      {selectedSession?.id === session.id && (
                        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex flex-wrap gap-2">
                            {session.members.map(m => (
                              <span key={m} className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-md text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {m}
                              </span>
                            ))}
                          </div>

                          <div className="space-y-3">
                            {session.results ? (
                              session.results.map((res, idx) => {
                                const cp = checkpoints.find(c => c.id === res.checkpointId);
                                return (
                                  <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2 shadow-inner">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{t.step} #{idx + 1}: {cp?.name || t.unknown}</span>
                                      {res.bestPerformer && (
                                        <span className="flex items-center gap-1 text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                                          <Star size={10} fill="currentColor" /> {res.bestPerformer}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      {res.photo && (
                                        <button 
                                          onClick={() => setZoomImage(res.photo!)}
                                          className="w-20 h-20 rounded-md overflow-hidden border border-slate-800 hover:ring-2 hover:ring-amber-400 transition-all"
                                        >
                                          <img src={res.photo} alt="Result" className="w-full h-full object-cover" />
                                        </button>
                                      )}
                                      {res.audio && (
                                        <div className="flex-1 flex items-center">
                                          <audio 
                                            key={`${session.id}_${idx}`}
                                            controls 
                                            src={res.audio} 
                                            preload="metadata"
                                            className="w-full h-8 scale-90 origin-left invert opacity-70" 
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="flex flex-col items-center py-6 text-slate-600">
                                 <div className="w-6 h-6 border-2 border-slate-800 border-t-amber-400 rounded-full animate-spin mb-2" />
                                 <p className="text-[9px] font-black uppercase tracking-widest">{t.loading}</p>
                               </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <a href="https://buycoffee.to/atlogic" target="_blank" rel="noreferrer" className="flex-shrink-0">
            <img 
              src="https://buycoffee.to/static/img/share/share-button-primary.png" 
              style={{ width: '166px', height: '43px' }} 
              alt="Postaw mi kawę na buycoffee.to" 
              referrerPolicy="no-referrer"
              className="brightness-90 hover:brightness-100 transition-all"
            />
          </a>
          <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
            <button 
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 text-slate-400 font-black rounded-lg hover:bg-slate-700 transition-colors uppercase tracking-widest text-xs border border-slate-700"
            >
              {t.cancel}
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-[2] py-3 text-slate-950 font-black rounded-lg shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs ${
                isSaving ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-amber-400 hover:bg-amber-500 hover:scale-[1.01] active:scale-95'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-3 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  {t.saving}
                </>
              ) : (
                <>
                  <Save size={20} /> {t.saveAndShare}
                </>
              )}
            </button>
          </div>
        </div>
        {/* Share Game Modal */}
        {shareGame && (
          <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-auto border border-slate-800">
              <div className="p-6 bg-slate-950 text-amber-400 flex justify-between items-center border-b border-slate-800">
                <h3 className="text-xl font-serif font-black uppercase tracking-tight">{t.shareGame}</h3>
                <button onClick={() => setShareGame(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              <div className="p-8 flex flex-col items-center gap-6">
                <div className="p-4 bg-slate-950 rounded-2xl border-4 border-slate-800 shadow-2xl">
                  <QRCodeSVG 
                    value={`${window.location.origin}${window.location.pathname}?game=${shareGame.id}`}
                    size={200}
                    level="H"
                  />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-mono font-black text-amber-400 tracking-widest mb-1">{shareGame.id}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.scanToPlay}</p>
                </div>
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?game=${shareGame.id}`;
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-full py-4 bg-slate-800 text-slate-300 font-black rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest border border-slate-700 shadow-lg"
                >
                  {copied ? <Check size={20} className="text-amber-400" /> : <Copy size={20} />}
                  {copied ? t.copyLink : t.share}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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
};
