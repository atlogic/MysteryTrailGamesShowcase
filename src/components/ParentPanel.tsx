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
  MapPin
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
  onUpdate: (
    newCheckpoints: Checkpoint[], 
    newGameId: string, 
    newMethod: 'qr' | 'passcode' | 'gps', 
    newParentId: string,
    gpsThreshold?: number,
    gpsViewMode?: 'radar' | 'map' | 'satellite'
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
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(1, '#3b82f6');
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
      const parentId = user?.uid || '';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localCheckpoints));
      localStorage.setItem('mystery_trail_method', localMethod);
      localStorage.setItem('mystery_trail_gps_threshold', localGpsThreshold.toString());
      localStorage.setItem('mystery_trail_gps_view_mode', localGpsViewMode);
      localStorage.setItem(GAME_ID_KEY, savedId);
      localStorage.setItem(PARENT_ID_KEY, parentId);
      onUpdate(localCheckpoints, savedId, localMethod, parentId, localGpsThreshold, localGpsViewMode);
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
      <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 my-auto">
          <div className="p-6 bg-green-600 text-white flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">{t.loginTitle}</h2>
              <p className="text-green-100 text-xs font-bold uppercase">{t.loginDesc}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleAuth} className="p-6 space-y-4">
            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                <AlertCircle size={16} /> {authError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-green-500 focus:bg-white transition-all outline-none text-sm font-bold"
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-green-500 focus:bg-white transition-all outline-none text-sm font-bold"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-green-600 text-white font-black rounded-xl shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              {authLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : (isLogin ? t.signIn : t.signUp)}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400 font-bold">LUB</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleAuth}
              disabled={authLoading}
              className="w-full py-3 bg-white border-2 border-gray-100 text-gray-600 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
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
              className="w-full text-center text-xs font-bold text-green-600 hover:underline"
            >
              {isLogin ? t.noAccount : t.haveAccount}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-4xl h-[90vh] sm:h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 my-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-green-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-xl">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">{t.parentPanel}</h2>
              <p className="text-green-100 text-[10px] font-bold uppercase tracking-widest">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title={t.logout}
            >
              <LogOut size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-green-50 p-2 gap-2 border-b">
          <button 
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'config' ? 'bg-green-600 text-white shadow-md' : 'text-green-600 hover:bg-green-100'}`}
          >
            {t.edit}
          </button>
          <button 
            onClick={loadMyGames}
            className={`flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'my-games' ? 'bg-green-600 text-white shadow-md' : 'text-green-600 hover:bg-green-100'}`}
          >
            <LayoutGrid size={14} /> {t.myGames}
          </button>
          <button 
            onClick={loadHistory}
            className={`flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-green-600 text-white shadow-md' : 'text-green-600 hover:bg-green-100'}`}
          >
            <History size={14} /> {t.history}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-gray-50">
          {/* Image Zoom Modal */}
          <AnimatePresence>
            {zoomImage && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
                onClick={() => setZoomImage(null)}
              >
                <button className="absolute top-4 right-4 text-white p-2">
                  <X size={32} />
                </button>
                <motion.img 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  src={zoomImage} 
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
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
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 transition-all"
                >
                  <PlusCircle size={16} /> {t.newGame}
                </button>
                {localCheckpoints.length > 0 && (
                  <button 
                    onClick={onPrint}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg font-bold text-xs hover:bg-purple-100 transition-all"
                  >
                    <Printer size={16} /> {t.printQR}
                  </button>
                )}
              </div>

              {/* Verification Method Selection */}
              <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 mb-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{t.verificationMethod}</label>
                <div className="flex gap-2">
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
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-2 ${
                      localMethod === 'qr' 
                        ? 'bg-green-600 border-green-600 text-white shadow-md' 
                        : 'bg-white border-gray-100 text-gray-400 hover:border-green-200'
                    }`}
                  >
                    <QrCode size={16} /> {t.qrMethod}
                  </button>
                  <button 
                    onClick={() => setLocalMethod('passcode')}
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-2 ${
                      localMethod === 'passcode' 
                        ? 'bg-yellow-500 border-yellow-500 text-white shadow-md' 
                        : 'bg-white border-gray-100 text-gray-400 hover:border-yellow-200'
                    }`}
                  >
                    <Lock size={16} /> {t.passcodeMethod}
                  </button>
                  <button 
                    onClick={() => setLocalMethod('gps')}
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-2 ${
                      localMethod === 'gps' 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                        : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
                    }`}
                  >
                    <MapPin size={16} /> {t.gpsMethod}
                  </button>
                </div>

                {localMethod === 'gps' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-gray-100 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.gpsThreshold}</label>
                          <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{localGpsThreshold}m</span>
                        </div>
                        <input 
                          type="range" 
                          min="3" 
                          max="100" 
                          step="1"
                          value={localGpsThreshold}
                          onChange={(e) => setLocalGpsThreshold(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-[10px] text-gray-400 italic">{t.accuracyHint}</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.gpsViewMode}</label>
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                          {(['radar', 'map', 'satellite'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setLocalGpsViewMode(mode)}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                localGpsViewMode === mode 
                                  ? 'bg-white text-blue-600 shadow-sm' 
                                  : 'text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              {t[mode]}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 italic">{t.viewModeHint}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              {localCheckpoints.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{t.emptyRoute}</p>
                </div>
              )}

              {localCheckpoints.map((cp, index) => (
                <div key={cp.id} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200 relative group">
                  <div className="absolute -top-2 -left-2 bg-green-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black shadow-md z-10 text-sm">
                    {index + 1}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Left Side: Inputs */}
                    <div className="md:col-span-9 space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5 ml-1">{t.stepName}</label>
                          <input 
                            type="text" 
                            value={cp.name}
                            onChange={(e) => updateCheckpoint(cp.id, { name: e.target.value })}
                            className="w-full p-2.5 text-base font-bold rounded-lg border-2 border-gray-100 focus:border-green-500 focus:bg-white bg-gray-50 outline-none transition-all"
                            placeholder={language === 'pl' ? 'Gdzie ukryjesz kod?' : 'Where will you hide the code?'}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5 ml-1">{t.stepHint}</label>
                          <textarea 
                            value={cp.hint}
                            onChange={(e) => updateCheckpoint(cp.id, { hint: e.target.value })}
                            className="w-full p-2.5 text-sm font-medium rounded-lg border-2 border-gray-100 focus:border-green-500 focus:bg-white bg-gray-50 outline-none transition-all h-16 resize-none"
                            placeholder={language === 'pl' ? 'Podpowiedź dla dzieci...' : 'Hint for children...'}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5 ml-1">{t.stepTask}</label>
                          <input 
                            type="text" 
                            value={cp.task}
                            onChange={(e) => updateCheckpoint(cp.id, { task: e.target.value })}
                            className="w-full p-2.5 text-sm font-bold rounded-lg border-2 border-gray-100 focus:border-purple-500 focus:bg-white bg-gray-50 outline-none transition-all"
                            placeholder={language === 'pl' ? 'Co muszą zrobić?' : 'What do they have to do?'}
                          />
                        </div>
                        {localMethod === 'passcode' && (
                          <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5 ml-1">{t.passcode}</label>
                            <input 
                              type="text" 
                              value={cp.passcode || ''}
                              onChange={(e) => updateCheckpoint(cp.id, { passcode: e.target.value.toUpperCase() })}
                              className="w-full p-2.5 text-sm font-bold rounded-lg border-2 border-gray-100 focus:border-yellow-500 focus:bg-white bg-gray-50 outline-none transition-all"
                              placeholder={t.passcodePlaceholder}
                            />
                          </div>
                        )}
                        {localMethod === 'gps' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5 ml-1">{t.latitude}</label>
                              <input 
                                type="number" 
                                step="any"
                                value={cp.lat || ''}
                                onChange={(e) => updateCheckpoint(cp.id, { lat: parseFloat(e.target.value) })}
                                className="w-full p-2.5 text-sm font-bold rounded-lg border-2 border-gray-100 focus:border-blue-500 focus:bg-white bg-gray-50 outline-none transition-all"
                                placeholder="52.2297"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5 ml-1">{t.longitude}</label>
                              <div className="flex gap-2">
                                <input 
                                  type="number" 
                                  step="any"
                                  value={cp.lng || ''}
                                  onChange={(e) => updateCheckpoint(cp.id, { lng: parseFloat(e.target.value) })}
                                  className="flex-1 p-2.5 text-sm font-bold rounded-lg border-2 border-gray-100 focus:border-blue-500 focus:bg-white bg-gray-50 outline-none transition-all"
                                  placeholder="21.0122"
                                />
                                <button 
                                  onClick={() => getCurrentLocation(cp.id)}
                                  className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border-2 border-blue-100 hover:bg-blue-100 transition-all flex items-center justify-center"
                                  title={t.getCurrentLocation}
                                >
                                  <MapPin size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button 
                          onClick={() => updateCheckpoint(cp.id, { requirePhoto: !cp.requirePhoto })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-bold text-[11px] transition-all ${
                            cp.requirePhoto 
                              ? 'bg-purple-600 border-purple-600 text-white shadow-sm' 
                              : 'bg-white border-gray-200 text-gray-400 hover:border-purple-200'
                          }`}
                        >
                          <Camera size={14} />
                          {cp.requirePhoto ? t.photo : (language === 'pl' ? 'BEZ ZDJĘCIA' : 'NO PHOTO')}
                        </button>
                        <button 
                          onClick={() => updateCheckpoint(cp.id, { requireEvaluation: !cp.requireEvaluation })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-bold text-[11px] transition-all ${
                            cp.requireEvaluation 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                              : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200'
                          }`}
                        >
                          <Star size={14} />
                          {cp.requireEvaluation ? t.evalRequired : t.evalNotRequired}
                        </button>
                        <button 
                          onClick={() => updateCheckpoint(cp.id, { requireAudio: !cp.requireAudio })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-bold text-[11px] transition-all ${
                            cp.requireAudio 
                              ? 'bg-red-600 border-red-600 text-white shadow-sm' 
                              : 'bg-white border-gray-200 text-gray-400 hover:border-red-200'
                          }`}
                        >
                          <Mic size={14} />
                          {cp.requireAudio ? t.audioRequired : t.audioNotRequired}
                        </button>
                        <div className="px-2 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100 font-mono font-bold text-[11px]">
                          {t.qrNumber}{cp.qrNumber}
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Image Upload */}
                    <div className="md:col-span-3 flex flex-col items-center justify-start gap-1.5">
                      <label className="w-full cursor-pointer group/img">
                        <div className="aspect-square w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center overflow-hidden group-hover/img:border-green-400 transition-all">
                          {cp.image ? (
                            <img src={cp.image} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center text-gray-300">
                              <ImageIcon size={24} />
                              <span className="text-[9px] font-bold mt-1 uppercase">{t.photo}</span>
                            </div>
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(cp.id, e)} />
                      </label>
                      {cp.image && (
                        <button 
                          onClick={() => updateCheckpoint(cp.id, { image: undefined })}
                          className="text-[9px] font-bold text-red-400 hover:text-red-600 uppercase tracking-wider"
                        >
                          {t.delete}
                        </button>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => removeCheckpoint(cp.id)}
                    className="absolute top-2 right-2 p-1.5 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title={t.deleteStep}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button 
                onClick={addCheckpoint}
                className="w-full py-6 border-4 border-dashed border-gray-200 rounded-2xl text-gray-300 hover:text-green-500 hover:border-green-300 hover:bg-green-50/30 transition-all flex flex-col items-center gap-1 group"
              >
                <Plus size={32} className="group-hover:scale-110 transition-transform" />
                <span className="font-black text-sm uppercase tracking-widest">{t.addStep}</span>
              </button>
            </>
          ) : activeTab === 'my-games' ? (
            <div className="space-y-4">
              {isLoadingGames ? (
                <div className="flex flex-col items-center py-12 text-gray-400">
                  <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4" />
                  <p className="text-sm font-bold">{t.loadingGames}</p>
                </div>
              ) : userGames.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <LayoutGrid size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="text-sm">{t.noGames}</p>
                  <button 
                    onClick={startNewGame}
                    className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg font-bold text-sm"
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
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        gameId === game.id 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 bg-white hover:border-green-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono font-black text-green-700">{game.id}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShareGame(game);
                            }}
                            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                          >
                            <Share2 size={14} />
                          </button>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            {new Date(game.createdAt).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-700 mb-1">
                        {game.checkpoints.length} {t.points}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium truncate">
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
                  className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase hover:bg-gray-300 transition-all flex items-center gap-2"
                >
                  {isSeeding ? <div className="w-3 h-3 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" /> : <Plus size={12} />}
                  Testuj Historię (Dodaj Dane)
                </button>
              </div>
              {isLoadingSessions ? (
                <div className="flex flex-col items-center py-12 text-gray-400">
                  <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4" />
                  <p className="text-sm font-bold">{t.loadingHistory}</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <History size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="text-sm">{t.noSessions}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {sessions.map(session => (
                    <div key={session.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      <button 
                        onClick={() => toggleSession(session)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-green-100 p-2 rounded-lg">
                            <Calendar size={20} className="text-green-600" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-black text-gray-800 uppercase text-sm">{session.teamName}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">
                              {new Date(session.timestamp).toLocaleString(language === 'pl' ? 'pl-PL' : 'en-US')} • {session.members.length} {t.people}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`text-gray-300 transition-transform ${selectedSession?.id === session.id ? 'rotate-90' : ''}`} />
                      </button>

                      {selectedSession?.id === session.id && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex flex-wrap gap-2">
                            {session.members.map(m => (
                              <span key={m} className="px-2 py-1 bg-white border border-gray-200 rounded-md text-[10px] font-bold text-gray-600">
                                {m}
                              </span>
                            ))}
                          </div>

                          <div className="space-y-3">
                            {session.results ? (
                              session.results.map((res, idx) => {
                                const cp = checkpoints.find(c => c.id === res.checkpointId);
                                return (
                                  <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-black text-green-600 uppercase">{t.step} #{idx + 1}: {cp?.name || t.unknown}</span>
                                      {res.bestPerformer && (
                                        <span className="flex items-center gap-1 text-[10px] font-black text-yellow-600 uppercase">
                                          <Star size={10} fill="currentColor" /> {res.bestPerformer}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      {res.photo && (
                                        <button 
                                          onClick={() => setZoomImage(res.photo!)}
                                          className="w-20 h-20 rounded-md overflow-hidden border border-gray-100 hover:ring-2 hover:ring-green-500 transition-all"
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
                                            className="w-full h-8 scale-90 origin-left" 
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="flex flex-col items-center py-6 text-gray-400">
                                <div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin mb-2" />
                                <p className="text-[9px] font-bold uppercase">{t.loading}</p>
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
        <div className="p-3 sm:p-4 bg-white border-t flex flex-col sm:flex-row items-center gap-3">
          <a href="https://buycoffee.to/atlogic" target="_blank" rel="noreferrer" className="flex-shrink-0">
            <img 
              src="https://buycoffee.to/static/img/share/share-button-primary.png" 
              style={{ width: '166px', height: '43px' }} 
              alt="Postaw mi kawę na buycoffee.to" 
              referrerPolicy="no-referrer"
            />
          </a>
          <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
            <button 
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-600 font-black rounded-lg hover:bg-gray-200 transition-colors uppercase tracking-wider text-sm"
            >
              {t.cancel}
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-[2] py-3 text-white font-black rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm ${
                isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:scale-[1.01] active:scale-95'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-3 border-white/30 border-t-white rounded-full animate-spin" />
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
          <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-auto">
              <div className="p-6 bg-green-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tight">{t.shareGame}</h3>
                <button onClick={() => setShareGame(null)} className="p-2 hover:bg-white/20 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 flex flex-col items-center gap-6">
                <div className="p-4 bg-white rounded-2xl border-4 border-green-50 shadow-inner">
                  <QRCodeSVG 
                    value={`${window.location.origin}${window.location.pathname}?game=${shareGame.id}`}
                    size={200}
                    level="H"
                  />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-green-700 tracking-widest mb-1">{shareGame.id}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase">{t.scanToPlay}</p>
                </div>
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?game=${shareGame.id}`;
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-full py-4 bg-gray-100 text-gray-600 font-black rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
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
