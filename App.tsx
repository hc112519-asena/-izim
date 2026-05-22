import React, { useState, useEffect, Component, ReactNode } from 'react';
import { AppMode, AIJobType } from './types';
import WorkBench from './components/WorkBench';
import AIStudio from './components/AIStudio';
import Translator from './components/Translator';
import EpigraphyReader from './components/EpigraphyReader';
import VoiceControl from './components/VoiceControl';
import ChatAssistant from './components/ChatAssistant';
import Profile from './components/Profile';
import Login from './components/Login';
import { auth, onAuthStateChanged, db, doc, getDoc, setDoc, Timestamp } from './firebase';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-arch-paper p-8">
          <div className="max-w-md w-full bg-white border-2 border-red-200 p-8 rounded-lg shadow-xl text-center">
            <h2 className="font-serif text-2xl text-red-600 mb-4 uppercase">Sistem Hatası</h2>
            <p className="text-sm text-gray-600 mb-6">Uygulama yüklenirken teknik bir sorun oluştu. Lütfen sayfayı yenileyin.</p>
            <pre className="text-[10px] bg-red-50 p-4 rounded overflow-auto text-left mb-6 max-h-40">
              {JSON.stringify(this.state.error, null, 2)}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="bg-arch-clay text-white px-6 py-2 rounded font-serif uppercase tracking-widest hover:bg-arch-dark transition-all"
            >
              Yeniden Dene
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error';
}

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [aiTab, setAiTab] = useState<AIJobType>(AIJobType.IMAGE_EDITING);
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', timestamp: new Date(), message: 'Atölye terminali başlatıldı.', type: 'info' },
    { id: '2', timestamp: new Date(), message: 'Hatice Ceylan oturumu doğrulandı.', type: 'success' },
  ]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ id: Date.now().toString(), timestamp: new Date(), message, type }, ...prev].slice(0, 5));
  };
  
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  const [headerAvatar, setHeaderAvatar] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isPasscodeLogin, setIsPasscodeLogin] = useState(false);
  
  // Access limit & monetization states
  const [isUnlimited, setIsUnlimited] = useState<boolean>(true);
  const [isCheckingUnlimited, setIsCheckingUnlimited] = useState<boolean>(true);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30 * 60);
  const [showLimitLock, setShowLimitLock] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Check local storage first for avatar
      const localData = localStorage.getItem('arch_profile_data');
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed.photoURL) setHeaderAvatar(parsed.photoURL);
      }

      if (user) {
        setIsLoggedIn(true);
        setIsPasscodeLogin(false);
        if (!headerAvatar) setHeaderAvatar(user.photoURL);
        
        // Verify access rights & whitelist state
        const userEmail = user.email?.toLowerCase();
        if (userEmail === 'hc112519@gmail.com') {
          setIsUnlimited(true);
          setIsCheckingUnlimited(false);
        } else {
          try {
            const whitelistRef = doc(db, 'whitelist', userEmail || '');
            const whitelistSnap = await getDoc(whitelistRef);
            if (whitelistSnap.exists()) {
              setIsUnlimited(true);
            } else {
              setIsUnlimited(false);
            }
          } catch (e) {
            console.error("Error checking user whitelist status:", e);
            // Default to limited on error to act safe
            setIsUnlimited(false);
          }
          setIsCheckingUnlimited(false);
        }
        
        // Sync user to Firestore
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              role: 'archaeologist',
              createdAt: Timestamp.now()
            });
          } else {
            const cloudData = userSnap.data();
            if (cloudData.photoURL) {
              setHeaderAvatar(cloudData.photoURL);
              localStorage.setItem('arch_profile_data', JSON.stringify(cloudData));
            }
          }
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }
      } else if (!isPasscodeLogin) {
        setIsLoggedIn(false);
        setHeaderAvatar(null);
        setIsUnlimited(true);
        setIsCheckingUnlimited(false);
      }
      setIsAuthReady(true);
    });

    const handleProfileUpdate = () => {
      const localData = localStorage.getItem('arch_profile_data');
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed.photoURL) setHeaderAvatar(parsed.photoURL);
      }
    };
    window.addEventListener('PROFILE_UPDATED', handleProfileUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('PROFILE_UPDATED', handleProfileUpdate);
    };
  }, [isPasscodeLogin]);

  const handlePasscodeLogin = () => {
    setIsLoggedIn(true);
    setIsPasscodeLogin(true);
    setHeaderAvatar(null);
    setIsUnlimited(true);
    setIsCheckingUnlimited(false);
  };

  // Load user's logged minutes for the current day
  useEffect(() => {
    if (isCheckingUnlimited) return;
    if (isUnlimited) {
      setShowLimitLock(false);
      return;
    }

    const loadDailyUsage = async () => {
      const todayDate = new Date().toISOString().split('T')[0];
      const uid = auth.currentUser?.uid || 'guest';
      const storageKey = `arch_usage_${uid}_${todayDate}`;
      
      const localMin = localStorage.getItem(storageKey);
      let startMinutes = localMin ? parseFloat(localMin) : 0;
      
      let initialSecs = Math.max(0, (30 - startMinutes) * 60);
      setRemainingSeconds(initialSecs);
      if (initialSecs <= 0) {
        setShowLimitLock(true);
      }

      if (auth.currentUser) {
        const logId = `${uid}_${todayDate}`;
        try {
          const logRef = doc(db, 'usage_logs', logId);
          const snap = await getDoc(logRef);
          if (snap.exists()) {
            const cloudMinutes = snap.data().minutesUsed || 0;
            const actualMinutes = Math.max(startMinutes, cloudMinutes);
            localStorage.setItem(storageKey, actualMinutes.toString());
            const calculatedSecs = Math.max(0, (30 - actualMinutes) * 60);
            setRemainingSeconds(calculatedSecs);
            if (calculatedSecs <= 0) {
              setShowLimitLock(true);
            }
          } else {
            await setDoc(logRef, {
              uid,
              date: todayDate,
              minutesUsed: startMinutes,
              lastActiveAt: Timestamp.now()
            });
          }
        } catch (e) {
          console.error("Failed to load daily usage logs:", e);
        }
      }
    };

    loadDailyUsage();
  }, [isUnlimited, isCheckingUnlimited, isLoggedIn]);

  const syncUsageToFirestore = async (minutes: number) => {
    if (!auth.currentUser) return;
    const todayDate = new Date().toISOString().split('T')[0];
    const logId = `${auth.currentUser.uid}_${todayDate}`;
    try {
      await setDoc(doc(db, 'usage_logs', logId), {
        uid: auth.currentUser.uid,
        date: todayDate,
        minutesUsed: parseFloat(minutes.toFixed(2)),
        lastActiveAt: Timestamp.now()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to sync daily usage logic:", e);
    }
  };

  // Timer Tick Mechanism (Updates LocalStorage every second)
  useEffect(() => {
    if (isCheckingUnlimited || isUnlimited || !isLoggedIn || showLimitLock) return;

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        const next = Math.max(0, prev - 1);
        
        const todayDate = new Date().toISOString().split('T')[0];
        const uid = auth.currentUser?.uid || 'guest';
        const storageKey = `arch_usage_${uid}_${todayDate}`;
        const minutesUsed = 30 - (next / 60);
        localStorage.setItem(storageKey, minutesUsed.toString());

        if (next <= 0) {
          setShowLimitLock(true);
          clearInterval(timer);
          syncUsageToFirestore(minutesUsed);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCheckingUnlimited, isUnlimited, isLoggedIn, showLimitLock]);

  // Periodic Cloud Sync (Every 30 seconds)
  useEffect(() => {
    if (isCheckingUnlimited || isUnlimited || !isLoggedIn || showLimitLock) return;

    const syncInterval = setInterval(() => {
      const minutesUsed = 30 - (remainingSeconds / 60);
      syncUsageToFirestore(minutesUsed);
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [isCheckingUnlimited, isUnlimited, isLoggedIn, showLimitLock, remainingSeconds]);

  const NavButton = ({ mode, label, icon }: { mode: AppMode, label: string, icon: string }) => (
    <button
      onClick={() => {
        setCurrentMode(mode);
        if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
      }}
      className={`
        w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all duration-300 group
        ${currentMode === mode 
          ? 'bg-arch-clay text-white shadow-lg translate-x-1' 
          : 'text-arch-dark hover:bg-arch-sand/50'
        }
      `}
    >
      <span className={`text-xl w-6 text-center transition-transform group-hover:scale-125 ${currentMode === mode ? 'text-white' : 'text-arch-clay'}`}>
        {icon}
      </span>
      {isSidebarOpen && <span className="font-serif font-bold text-[11px] uppercase tracking-widest">{label}</span>}
    </button>
  );

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-arch-paper">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-arch-clay border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-serif text-arch-clay uppercase tracking-widest text-xs">Arşiv Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handlePasscodeLogin} />;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-dust-pattern relative">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Field Journal Style */}
      <aside 
        className={`
          fixed inset-y-0 left-0 lg:relative flex-shrink-0 bg-[#fdfbf7] border-r-2 border-arch-sand flex flex-col transition-all duration-300 z-50 shadow-2xl
          ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarOpen ? 'lg:w-64' : 'lg:w-16'}
        `}
      >
        <div className="h-24 flex items-center justify-center border-b border-arch-sand bg-white/50 relative px-4 overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="w-full h-full bg-[radial-gradient(#a67c52_1px,transparent_1px)] bg-[length:10px_10px]"></div>
          </div>
          
          {isSidebarOpen ? (
             <div className="text-center z-10">
               <h1 className="font-serif font-bold text-arch-dark text-sm leading-tight uppercase tracking-tighter border-b border-arch-clay pb-1">
                 HATİCE CEYLAN
               </h1>
               <p className="font-hand text-arch-clay text-lg mt-1">Saha Günlüğü</p>
             </div>
          ) : (
             <span className="font-serif font-bold text-arch-clay text-2xl">HC</span>
          )}
          
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3 top-10 bg-arch-clay text-white rounded-full w-6 h-6 hidden lg:flex items-center justify-center text-xs shadow-md hover:bg-arch-dark transition-colors z-30"
          >
            {isSidebarOpen ? '‹' : '›'}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
          <NavButton mode={AppMode.DASHBOARD} label="Masaüstü" icon="⌂" />
          
          <div className="relative py-2">
             <div className="absolute inset-0 flex items-center" aria-hidden="true">
               <div className="w-full border-t border-arch-sand"></div>
             </div>
             <div className="relative flex justify-center">
               <span className={`bg-[#fdfbf7] px-2 text-[9px] uppercase font-black text-arch-sand tracking-[0.2em] ${!isSidebarOpen && 'hidden'}`}>
                 Teknik Belgeleme
               </span>
             </div>
          </div>

          <NavButton mode={AppMode.MAP_DRAWING} label="Harita Çizimi" icon="🗺" />
          <NavButton mode={AppMode.EXCAVATION_PLANNING} label="Kazı Planı" icon="📐" />
          <NavButton mode={AppMode.ARTIFACT_ILLUSTRATION} label="Buluntu Çizimi" icon="🏺" />
          
          <div className="relative py-2">
             <div className="absolute inset-0 flex items-center" aria-hidden="true">
               <div className="w-full border-t border-arch-sand"></div>
             </div>
             <div className="relative flex justify-center">
               <span className={`bg-[#fdfbf7] px-2 text-[9px] uppercase font-black text-arch-sand tracking-[0.2em] ${!isSidebarOpen && 'hidden'}`}>
                 Analiz
               </span>
             </div>
          </div>

          <NavButton mode={AppMode.AI_STUDIO} label="YZ Laboratuvarı" icon="✨" />
          <NavButton mode={AppMode.EPIGRAPHY} label="Kitabe Çözümleme" icon="📜" />
          <NavButton mode={AppMode.TRANSLATION} label="Saha Çevirisi" icon="🌐" />
          
          <div className="mt-auto pt-6 border-t border-arch-sand">
            <NavButton mode={AppMode.PROFILE} label="Kimlik Kartı" icon="👤" />
          </div>
        </nav>

        <div className="p-4 bg-arch-sand/10 text-[9px] text-center text-arch-clay font-serif uppercase tracking-widest border-t border-arch-sand">
           {isSidebarOpen ? "Saha Kaydı No: 2024/ARC-X" : "HC"}
        </div>
      </aside>

      {/* Main Content Area - Drafting Table Visual */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-dust-pattern">
        
        {/* Top Navigation Strip - Brass/Wood Style */}
        <header className="h-16 bg-white border-b-2 border-arch-sand flex items-center justify-between px-4 md:px-8 shadow-md z-10 relative">
           <div className="absolute top-0 left-0 w-full h-1 bg-arch-clay opacity-50"></div>
           
           <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsMobileMenuOpen(true)}
               className="lg:hidden text-arch-dark p-2 hover:bg-arch-sand rounded-md"
             >
               <span className="text-2xl">☰</span>
             </button>
             <h2 className="font-serif text-[10px] md:text-sm text-arch-dark uppercase tracking-widest font-bold flex items-center gap-2 md:gap-3">
               <span className="w-2 h-2 bg-arch-clay rounded-full animate-pulse hidden sm:block"></span>
               <span className="truncate max-w-[150px] sm:max-w-none">
                 {currentMode === AppMode.DASHBOARD && "Ana Terminal"}
                 {currentMode === AppMode.MAP_DRAWING && "Kartografik Belgeleme"}
                 {currentMode === AppMode.EXCAVATION_PLANNING && "Stratigrafik Planlama"}
                 {currentMode === AppMode.ARTIFACT_ILLUSTRATION && "Teknik İllüstrasyon"}
                 {currentMode === AppMode.AI_STUDIO && "YZ Laboratuvarı"}
                 {currentMode === AppMode.EPIGRAPHY && "Kitabe Çözümleme Laboratuvarı"}
                  {currentMode === AppMode.TRANSLATION && "Saha Çevirisi"}
                 {currentMode === AppMode.PROFILE && "Kimlik Kartı"}
               </span>
             </h2>
           </div>
           
           <div className="flex items-center gap-6">
             {/* Scale Bar Visual */}
             <div className="hidden lg:flex items-center gap-2 mr-8">
                <div className="flex h-1 w-20 bg-arch-dark">
                   <div className="w-1/4 h-full bg-white"></div>
                   <div className="w-1/4 h-full bg-arch-dark"></div>
                   <div className="w-1/4 h-full bg-white"></div>
                </div>
                <span className="text-[8px] font-bold text-arch-clay uppercase">Scale 1:50</span>
             </div>

              {/* Access State & Remaining Time Badge */}
              {!isCheckingUnlimited && (
                <div className="flex items-center gap-2 mr-2">
                  {isUnlimited ? (
                    <div className="hidden sm:flex items-center gap-2 bg-[#f9f5ea] border border-[#dcb871] px-3 py-1.5 rounded-sm shadow-sm select-none">
                      <span className="text-amber-600 text-[10px] animate-pulse">👑</span>
                      <span className="text-[9px] font-serif font-black text-[#8a6a2a] uppercase tracking-widest leading-none">
                        TAM YETKİLİ LİSANS (SINIRSIZ)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-[#f4f1ea] border border-[#dfdabf] px-3 py-1.5 rounded-sm shadow-inner select-none animate-fade-in">
                      <span className={`text-[11px] font-serif font-bold ${remainingSeconds < 300 ? 'text-rose-600 animate-pulse' : 'text-[#483d32]'}`}>
                        ⏳ {formatTime(remainingSeconds)}
                      </span>
                      <span className="text-[8px] font-serif hover:text-arch-clay transition-colors text-stone-500 uppercase tracking-widest hidden md:inline border-l border-stone-300 pl-2">
                        GÜNLÜK SAHA SÜRESİ
                      </span>
                    </div>
                  )}
                </div>
              )}

             <button 
               onClick={() => setCurrentMode(AppMode.PROFILE)}
               className={`w-10 h-10 rounded-full overflow-hidden p-[2px] bg-gold-leaf shadow-md transition-all
                 ${currentMode === AppMode.PROFILE ? 'ring-4 ring-gold-mid/30 scale-110' : 'hover:scale-105'}
               `}
             >
               <div className="w-full h-full rounded-full overflow-hidden bg-white">
                 {headerAvatar ? (
                   <img src={headerAvatar} alt="H" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
                 ) : (
                   <span className="bg-arch-sand text-arch-dark w-full h-full flex items-center justify-center font-serif text-lg">H</span>
                 )}
               </div>
             </button>
           </div>
        </header>

        {/* Content Area - The "Drafting Paper" feel */}
        <div className="flex-1 relative overflow-auto p-4 lg:p-8">
           {currentMode === AppMode.DASHBOARD && (
             <div className="max-w-6xl mx-auto">
                {/* Hero Section - Scattered Table Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 items-start">
                   
                   {/* Main Photo - Pinned appearance */}
                   <div className="lg:col-span-7 relative group">
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-4 bg-arch-sand/80 shadow-sm z-10 opacity-60"></div>
                      <div className="p-4 bg-white shadow-[0_10px_50px_rgba(0,0,0,0.1)] border-t border-arch-sand rotate-1 group-hover:rotate-0 transition-all duration-700">
                        <img 
                          src="https://images.unsplash.com/photo-1599930113854-d6d7fd521f10?q=80&w=1200&auto=format&fit=crop" 
                          alt="Excavation Site" 
                          className="w-full h-96 object-cover grayscale contrast-125 brightness-90 hover:grayscale-0 transition-all duration-1000"
                        />
                        <div className="mt-4 flex justify-between items-end">
                           <div>
                             <h3 className="font-serif text-xl text-arch-dark uppercase tracking-tighter">Saha Envanteri #24</h3>
                             <p className="font-hand text-arch-clay text-lg leading-none">Kazı alanından güncel görünüm, Sektör B</p>
                           </div>
                           <div className="text-[10px] text-gray-400 font-serif uppercase tracking-widest text-right">
                             Ref: 38° 25' N / 27° 09' E<br/>Elev: 124m
                           </div>
                        </div>
                      </div>
                      {/* Pinned notes decorative element */}
                      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-yellow-50/80 shadow-md p-4 rotate-3 border-l-2 border-yellow-200 hidden md:block">
                         <p className="font-hand text-blue-900 text-sm">Katman 4'teki seramikler belgelenmeli.</p>
                      </div>
                   </div>

                   {/* Desktop Controls - Modern tech integrated into old style */}
                   <div className="lg:col-span-5 space-y-6">
                      <div className="bg-arch-paper/90 p-8 border-2 border-arch-clay/30 rounded-sm shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-arch-clay/10 rounded-bl-full flex items-center justify-center">
                           <span className="text-arch-clay text-xl">⚓</span>
                        </div>
                        
                        <h2 className="font-serif text-3xl text-arch-dark mb-6 tracking-tighter uppercase leading-none border-l-4 border-arch-clay pl-4">
                          ATÖLYE<br/><span className="text-arch-clay">TERMINALİ</span>
                        </h2>
                        
                        <p className="text-sm text-gray-600 font-sans leading-relaxed mb-8 border-b border-arch-sand pb-6">
                          Arkeolojik buluntuların teknik çizimi, stratigrafik veri girişi ve yapay zeka destekli rekonstrüksiyon işlemleri için hazır. Lütfen bir birim seçin.
                        </p>

                        <div className="flex flex-col gap-3">
                          <button 
                            onClick={() => setCurrentMode(AppMode.PROFILE)}
                            className="w-full flex items-center justify-between p-4 bg-arch-clay text-white rounded hover:bg-arch-dark transition-all group shadow-md"
                          >
                            <div className="text-left">
                              <span className="block text-[10px] uppercase font-bold tracking-[0.2em] opacity-80 mb-1">Erişim Yetkisi</span>
                              <span className="font-serif text-lg font-bold">HATİCE CEYLAN</span>
                            </div>
                            <div className="text-2xl group-hover:translate-x-1 transition-transform">👤</div>
                          </button>

                          {/* Quick Text to Image Button */}
                          <button 
                            onClick={() => {
                              setAiTab(AIJobType.TEXT_TO_IMAGE);
                              setCurrentMode(AppMode.AI_STUDIO);
                            }}
                            className="w-full flex items-center justify-between p-4 bg-arch-dark text-white rounded hover:bg-black transition-all group shadow-md border border-arch-clay/30"
                          >
                            <div className="text-left">
                              <span className="block text-[10px] uppercase font-bold tracking-[0.2em] opacity-80 mb-1">Hızlı Araç</span>
                              <span className="font-serif text-lg font-bold">METİNDEN GÖRSELE</span>
                            </div>
                            <div className="text-2xl group-hover:rotate-12 transition-transform">✨</div>
                          </button>
                        </div>
                      </div>

                      {/* Compass/Orientation UI element */}
                      <div className="bg-white/50 p-6 border border-arch-sand flex items-center justify-around rounded-sm">
                         <div className="text-center">
                            <div className="text-3xl mb-1">🧭</div>
                            <span className="text-[9px] font-bold uppercase text-arch-clay">Yönelim</span>
                         </div>
                         <div className="h-10 w-px bg-arch-sand"></div>
                         <div className="text-center">
                            <div className="text-xl font-serif text-arch-dark font-bold">22.4°C</div>
                            <span className="text-[9px] font-bold uppercase text-arch-clay">Saha Isısı</span>
                         </div>
                         <div className="h-10 w-px bg-arch-sand"></div>
                         <div className="text-center">
                            <div className="text-xl font-serif text-arch-dark font-bold">64%</div>
                            <span className="text-[9px] font-bold uppercase text-arch-clay">Nem Oranı</span>
                         </div>
                      </div>

                      {/* Recent Activity Log */}
                      <div className="bg-white p-6 rounded-lg border border-arch-sand shadow-sm">
                         <h3 className="font-serif text-lg text-arch-dark mb-4 border-b border-arch-sand pb-2">Son Aktiviteler</h3>
                         <div className="space-y-3">
                            {logs.map(log => (
                              <div key={log.id} className="flex items-center gap-3 text-xs">
                                 <span className="text-gray-400 font-mono">{log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                 <span className={`w-2 h-2 rounded-full ${log.type === 'success' ? 'bg-green-500' : log.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                                 <span className="text-arch-dark">{log.message}</span>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>

                {/* Service Grid - Technical Blueprint Look */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                  {[
                    { title: "Harita Çizimi", desc: "Kartografik veriler ve topoğrafya", mode: AppMode.MAP_DRAWING, icon: "🗺", accent: "border-blue-200" },
                    { title: "Kazı Planı", desc: "Açma ve tabaka planlaması", mode: AppMode.EXCAVATION_PLANNING, icon: "📐", accent: "border-stone-300" },
                    { title: "Buluntu Çizimi", desc: "Teknik eser illüstrasyonu ve dönem kaydı", mode: AppMode.ARTIFACT_ILLUSTRATION, icon: "🏺", accent: "border-amber-300" },
                    { title: "YZ Laboratuvarı", desc: "Metinden Görsele, 3D Modelleme ve Restorasyon", mode: AppMode.AI_STUDIO, icon: "✨", accent: "border-purple-200" },
                    { title: "Kitabe Çözümleme", desc: "Yapay zeka asistanı ile epigrafi okuması, transkripsiyonu ve tarihsel analizi", mode: AppMode.EPIGRAPHY, icon: "📜", accent: "border-orange-300" },
                    { title: "Saha Çevirisi", desc: "Epigrafik belgeler, saha notları ve buluntular için çok dilli çeviri servisi", mode: AppMode.TRANSLATION, icon: "🌐", accent: "border-emerald-300" }
                  ].map((card, idx) => (
                    <button 
                      key={card.title}
                      onClick={() => setCurrentMode(card.mode)}
                      className={`p-6 bg-white/80 border-b-4 ${card.accent} rounded-sm shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all text-left group flex flex-col h-full`}
                    >
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-3xl opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all">{card.icon}</span>
                        <span className="text-[10px] font-serif font-black text-arch-clay">0{idx + 1}</span>
                      </div>
                      <h4 className="font-serif font-bold text-lg text-arch-dark uppercase tracking-tighter mb-2">{card.title}</h4>
                      <p className="text-xs text-gray-500 font-sans leading-tight mb-4 flex-1">{card.desc}</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-arch-clay uppercase tracking-widest pt-4 border-t border-arch-sand">
                         Modüle Gir <span>→</span>
                      </div>
                    </button>
                  ))}
                </div>
             </div>
           )}

           {(currentMode === AppMode.MAP_DRAWING || 
             currentMode === AppMode.EXCAVATION_PLANNING || 
             currentMode === AppMode.ARTIFACT_ILLUSTRATION) && (
               <div className="h-full w-full bg-white shadow-2xl border-4 border-white overflow-hidden relative rounded-sm">
                  <div className="absolute top-2 left-2 z-20 pointer-events-none opacity-20">
                     <div className="flex gap-1">
                        <div className="w-1 h-8 bg-arch-clay"></div>
                        <div className="w-1 h-4 bg-arch-clay"></div>
                        <div className="w-1 h-6 bg-arch-clay"></div>
                     </div>
                  </div>
                  <WorkBench mode={currentMode} />
               </div>
           )}

           {currentMode === AppMode.AI_STUDIO && (
              <div className="h-full w-full bg-arch-dark/5 p-2 rounded-sm border border-arch-sand overflow-hidden">
                <AIStudio initialTab={aiTab} key={aiTab} />
              </div>
           )}
           
           {currentMode === AppMode.TRANSLATION && <Translator />}

            {currentMode === AppMode.EPIGRAPHY && <EpigraphyReader />}

           {currentMode === AppMode.PROFILE && <Profile />}
        </div>

        {/* Voice Assistant - Discreet Radio Style */}
        <VoiceControl onNavigate={setCurrentMode} />
        
        {/* Persistent Chat Assistant Widget */}
        <ChatAssistant currentMode={currentMode} />

        {/* Limit Over Lock Screen with authentic visual style */}
        {showLimitLock && !isUnlimited && (
          <div className="fixed inset-0 z-[150] bg-[#1d1915]/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
            
            <div className="max-w-xl w-full bg-[#fcf8f2] border-4 border-[#bca891] rounded-sm p-8 md:p-12 relative shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-center my-auto transition-all transform animate-pop text-stone-900">
              
              {/* Wax seal watermark */}
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-arch-clay rounded-full shadow-inner flex items-center justify-center opacity-10 rotate-12 pointer-events-none">
                <span className="text-white text-5xl font-serif font-bold">HC</span>
              </div>

              {/* Expired header icon */}
              <div className="inline-block mb-6 relative">
                <div className="w-20 h-20 bg-[#fef2f2] border-2 border-[#fecaca] rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-4xl">⏳</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-600 rounded-full border-2 border-[#fcf8f2] flex items-center justify-center animate-bounce">
                  <span className="text-white text-xs font-bold leading-none">!</span>
                </div>
              </div>

              <h2 className="font-serif text-3xl font-black text-[#483d32] tracking-tighter uppercase mb-4 leading-tight">
                SÜRE SINIRI DOLDU
              </h2>
              
              <p className="font-sans text-sm text-stone-600 leading-relaxed mb-6">
                Hatice Ceylan Dijital Kazı ve Çizim Atölyesi'ne göstermiş olduğunuz ilgi için teşekkür ederiz.
              </p>

              <div className="bg-[#f0e4d2]/50 border-y border-[#dfd2be] p-5 my-6 text-left space-y-3">
                <p className="font-sans text-xs text-stone-700 leading-relaxed">
                  Bu atölye Hatice Ceylan'ın arkeolojik çalışmaları için tasarlanmış özel mülk bir saha terminalidir. Whitelist durumunda olmayan ve misafir olarak giriş yapan kullanıcıların günlük kullanım limiti <strong className="text-arch-clay font-bold font-serif">30 dakika</strong> ile sınırlandırılmıştır.
                </p>
                <p className="font-serif font-bold text-[11px] text-arch-dark uppercase tracking-wider">
                  Erişiminizi Devam Ettirmek İçin:
                </p>
                <ul className="text-xs text-stone-600 list-disc list-inside space-y-1 font-sans pl-1">
                  <li>Hatice Hanım ile iletişime geçerek e-posta adresinizi <span className="font-semibold text-arch-clay">süresiz ücretsiz erişim listesine (whitelist)</span> ekletebilirsiniz.</li>
                  <li>Hemen çalışmaya devam etmek için Atölye Premium Lisansı satın alabilirsiniz.</li>
                </ul>
              </div>

              {/* Premium Upgrade Simulation */}
              <div className="space-y-4">
                <button
                  onClick={() => {
                    alert(
                      "💎 Ödeme Ağ Geçidi Simülasyonu:\n\nPremium üyelik ödemesi başarıyla simüle edildikten sonra sistem, e-posta adresinizi geçici olarak 'Premium Katılımcı' statüsüne yükselterek sınırsız erişim tanımlayacaktır."
                    );
                    setIsUnlimited(true);
                    setShowLimitLock(false);
                    addLog("Premium lisansı satın alındı. Sınırsız erişim aktif.", "success");
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#c5a059] to-[#ecd49c] hover:from-[#b08b49] hover:to-[#dec286] text-stone-900 border-2 border-amber-300 font-serif font-black py-4 px-6 rounded-sm shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-0.5"
                >
                  <span>💎</span>
                  <span className="uppercase tracking-[0.2em] text-xs">PREMIUM SÜRÜME GEÇ (Simülasyon)</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      const email = auth.currentUser?.email || "";
                      const mailtoUrl = `mailto:hc112519@gmail.com?subject=Kazı%20Atölyesi%20Erişim%20İzni&body=Merhaba%20Hatice%20Hanım,%20${email}%20e-posta%20adresimle%20Atölyenize%20ücretsiz%20erişim%20talep%20ediyorum.`;
                      window.location.href = mailtoUrl;
                    }}
                    className="w-full text-center p-3 border border-stone-300 hover:border-arch-clay text-stone-700 hover:text-arch-dark font-bold text-[11px] uppercase tracking-wider rounded-sm transition-all"
                  >
                    ✉ Atölye ile İletişim
                  </button>
                  <button
                    onClick={async () => {
                      await auth.signOut();
                      window.location.reload();
                    }}
                    className="w-full text-center p-3 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-[11px] uppercase tracking-wider rounded-sm transition-all"
                  >
                    ← ÇıKıŞ YAP / DEĞİŞTİR
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#dfd2be] text-[9px] text-stone-400 font-serif uppercase tracking-[0.2em]">
                 Hatice Ceylan Dijital Kazı Atölyesi © 2026/ARC-X
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
    </ErrorBoundary>
  );
};

export default App;