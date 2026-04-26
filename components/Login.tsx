import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup } from '../firebase';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onLogin();
    } catch (err) {
      console.error("Login error:", err);
      setError("Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasscodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default passcode is 1125 (from email) or 2024
    if (passcode === '1125' || passcode === '2024' || passcode === '1923') {
      onLogin();
    } else {
      setError("Geçersiz giriş kodu. Lütfen tekrar deneyin.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1a1612] p-4 overflow-y-auto">
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
      
      <div className="max-w-md w-full bg-[#f4ece1] p-6 md:p-10 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-[#d4c5b3] relative overflow-hidden my-auto">
        {/* Decorative Corner Ornaments */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-arch-clay/30 rounded-tl-lg"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-arch-clay/30 rounded-tr-lg"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-arch-clay/30 rounded-bl-lg"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-arch-clay/30 rounded-br-lg"></div>

        {/* Wax Seal Decorative */}
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-24 h-24 bg-arch-clay rounded-full shadow-inner flex items-center justify-center opacity-10 rotate-12 pointer-events-none">
          <span className="text-white text-4xl font-serif font-bold">HC</span>
        </div>
        
        <div className="text-center mb-10 relative">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-arch-clay/10 rounded-full flex items-center justify-center border-2 border-arch-clay/20">
              <span className="text-3xl">🏺</span>
            </div>
          </div>
          <h1 className="font-serif text-3xl font-bold text-arch-dark leading-none uppercase tracking-tighter">
            HATİCE CEYLAN <br/> 
            <span className="text-arch-clay text-xl tracking-widest block mt-2">DİJİTAL KAZI ATÖLYESİ</span>
          </h1>
          <div className="flex items-center justify-center gap-4 my-6">
            <div className="h-[1px] bg-arch-sand flex-1"></div>
            <div className="text-arch-clay text-xs">EST. 2024</div>
            <div className="h-[1px] bg-arch-sand flex-1"></div>
          </div>
          <p className="font-hand text-2xl text-arch-dark/70 italic">"Geçmişin İzlerini Geleceğe Çiziyoruz"</p>
        </div>

        <div className="space-y-8 relative z-10">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-sm text-xs font-bold animate-shake">
              <span className="uppercase tracking-widest block mb-1">Uyarı:</span>
              {error}
            </div>
          )}

          {!showPasscode ? (
            <div className="space-y-4">
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-4 bg-white border-2 border-arch-sand hover:border-arch-clay text-arch-dark font-serif font-bold py-5 rounded-sm shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-[0.2em] disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                {loading ? 'Mühür Doğrulanıyor...' : 'Google ile Oturum Aç'}
              </button>

              <div className="flex items-center gap-4 py-2">
                <div className="h-[1px] bg-arch-sand flex-1"></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">veya</span>
                <div className="h-[1px] bg-arch-sand flex-1"></div>
              </div>

              <button 
                onClick={() => setShowPasscode(true)}
                className="w-full py-3 text-[11px] text-arch-clay font-bold uppercase tracking-[0.3em] hover:text-arch-dark transition-colors border border-transparent hover:border-arch-sand rounded-sm"
              >
                Giriş Kodu Kullan
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasscodeLogin} className="space-y-6">
              <div className="bg-white/50 p-6 border border-arch-sand rounded-sm">
                <label className="block text-[10px] font-bold text-arch-clay uppercase tracking-[0.3em] mb-4 text-center">Arşiv Erişim Kodu</label>
                <input 
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-transparent border-b-2 border-arch-sand p-2 text-center text-4xl tracking-[0.5em] font-serif focus:border-arch-clay outline-none transition-all placeholder:opacity-20"
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-arch-dark text-white font-serif font-bold py-5 rounded-sm shadow-xl hover:bg-black transition-all uppercase tracking-[0.3em] flex items-center justify-center gap-3"
              >
                <span>KAZIYA BAŞLA</span>
                <span className="text-xl">⛏</span>
              </button>
              <button 
                type="button"
                onClick={() => setShowPasscode(false)}
                className="w-full text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-arch-clay transition-colors"
              >
                ← Yöntem Değiştir
              </button>
            </form>
          )}
          
          <div className="flex flex-col items-center gap-2 pt-4">
            <div className="w-8 h-[1px] bg-arch-sand"></div>
            <p className="text-[9px] text-center text-gray-400 uppercase tracking-[0.2em] leading-relaxed max-w-[200px]">
              Bu terminal Hatice Ceylan'ın arkeolojik çalışmaları için özel olarak mühürlenmiştir.
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-10 pt-6 border-t border-arch-sand/50 flex justify-between items-end">
          <div className="space-y-1">
            <div className="text-[8px] font-bold uppercase text-gray-400 tracking-widest">Sistem Durumu</div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <div className="text-[10px] font-mono text-arch-dark">ARCH-OS v2.4 ACTIVE</div>
            </div>
          </div>
          <div className="relative">
            <div className="w-12 h-12 border-2 border-arch-clay/40 rounded-full flex items-center justify-center text-[8px] font-bold text-arch-clay -rotate-12 uppercase">
              Official<br/>Seal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;