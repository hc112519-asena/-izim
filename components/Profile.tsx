import React, { useState, useEffect, useRef } from 'react';
import { auth, db, doc, getDoc, setDoc, Timestamp } from '../firebase';

const Profile: React.FC = () => {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) {
        // If no user, we might be in passcode mode
        setLoading(false);
        return;
      }
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setProfileData(userSnap.data());
          setEditForm(userSnap.data());
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleImageClick = () => {
    if (!auth.currentUser) {
      alert("Giriş kodu ile oturum açtığınızda profil fotoğrafı değiştirilemez. Lütfen Google ile giriş yapın.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Dosya boyutu çok büyük (Maksimum 2MB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        if (auth.currentUser) {
          try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userRef, { photoURL: base64String }, { merge: true });
            setProfileData((prev: any) => ({ ...prev, photoURL: base64String }));
          } catch (error) {
            console.error("Error updating photo:", error);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
      setProfileData(editForm);
      setIsEditing(false);
      return;
    }
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, editForm, { merge: true });
      setProfileData(editForm);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Profil kaydedilirken bir hata oluştu.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-arch-paper">
        <div className="w-12 h-12 border-4 border-arch-clay border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const defaultUser = {
    displayName: 'HATİCE CEYLAN',
    role: 'admin',
    uid: 'HC-2024-ADMIN',
    specialization: 'Arkeolojik Çizim ve 3D Modelleme',
    education: 'Arkeoloji ve Sanat Tarihi',
    institution: 'Hatice Ceylan Atölyesi',
    experience: '15+ Yıl',
    bio: 'Geçmişin izlerini, geleceğin teknolojisiyle buluşturarak her bir fırça darbesinde tarihi yeniden canlandırıyoruz.',
    createdAt: { toDate: () => new Date() }
  };

  const user = profileData || defaultUser;

  return (
    <div className="flex flex-col h-full bg-arch-paper overflow-y-auto p-8 space-y-8">
      {/* Profile ID Card Section */}
      <div className="max-w-4xl mx-auto w-full flex flex-col lg:flex-row bg-white border-2 border-arch-clay shadow-2xl rounded-lg overflow-hidden transform lg:-rotate-1">
        {/* Photo and Seal */}
        <div className="w-full lg:w-64 bg-arch-sand p-6 flex flex-col items-center border-b lg:border-b-0 lg:border-r border-arch-clay relative">
          
          {/* Gold Leaf Frame for Photo */}
          <div className="gold-leaf-border mb-4">
            <div 
              onClick={handleImageClick}
              className="w-32 h-40 md:w-40 md:h-48 bg-stone-300 shadow-inner relative overflow-hidden grayscale hover:grayscale-0 transition-all cursor-pointer group"
            >
              <img 
                src={user.photoURL || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop'} 
                alt="Profil" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-[10px] font-bold uppercase tracking-widest px-2 text-center">Değiştir</span>
              </div>
              
              {/* Ornate corner accents */}
              <div className="ornate-corner corner-tl"></div>
              <div className="ornate-corner corner-tr"></div>
              <div className="ornate-corner corner-bl"></div>
              <div className="ornate-corner corner-br"></div>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          
          <div className="absolute top-2 right-2 opacity-20 transform rotate-12 pointer-events-none">
            <div className="w-20 h-20 border-4 border-arch-clay rounded-full flex items-center justify-center font-serif font-bold text-xs text-center uppercase p-2 leading-tight">
              Kültür & Sanat Arşivi
            </div>
          </div>
          <div className="text-center">
            <p className="font-hand text-xl text-arch-clay">{user.displayName || 'İsimsiz Araştırmacı'}</p>
            <p className="text-[10px] uppercase tracking-widest text-arch-dark font-bold">{user.role === 'admin' ? 'Baş Arkeolog' : 'Arkeolog / Çizim Uzmanı'}</p>
          </div>
        </div>

        {/* Details Section */}
        <div className="flex-1 p-4 md:p-8 font-serif">
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-arch-sand pb-4 mb-6 gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-arch-dark tracking-tighter">SAHA KİMLİK KARTI</h2>
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest">T.C. Kültür ve Turizm Bakanlığı Akreditasyonu</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm font-bold text-arch-clay">ID: {user.uid?.substring(0, 8).toUpperCase()}</p>
              <p className="text-[10px] text-gray-400">Kayıt: {user.createdAt?.toDate().toLocaleDateString() || '---'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 md:gap-y-6 text-sm">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Uzmanlık Alanı</p>
              {isEditing ? (
                <input 
                  className="w-full border-b border-arch-sand outline-none focus:border-arch-clay"
                  value={editForm.specialization || ''}
                  onChange={e => setEditForm({...editForm, specialization: e.target.value})}
                />
              ) : (
                <p className="text-arch-dark">{user.specialization || 'Belirtilmedi'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Eğitim</p>
              {isEditing ? (
                <input 
                  className="w-full border-b border-arch-sand outline-none focus:border-arch-clay"
                  value={editForm.education || ''}
                  onChange={e => setEditForm({...editForm, education: e.target.value})}
                />
              ) : (
                <p className="text-arch-dark">{user.education || 'Belirtilmedi'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Bağlı Kurum</p>
              {isEditing ? (
                <input 
                  className="w-full border-b border-arch-sand outline-none focus:border-arch-clay"
                  value={editForm.institution || ''}
                  onChange={e => setEditForm({...editForm, institution: e.target.value})}
                />
              ) : (
                <p className="text-arch-dark">{user.institution || 'Belirtilmedi'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Saha Deneyimi</p>
              {isEditing ? (
                <input 
                  className="w-full border-b border-arch-sand outline-none focus:border-arch-clay"
                  value={editForm.experience || ''}
                  onChange={e => setEditForm({...editForm, experience: e.target.value})}
                />
              ) : (
                <p className="text-arch-dark">{user.experience || 'Belirtilmedi'}</p>
              )}
            </div>
          </div>

          <div className="mt-8 p-4 bg-arch-sand/20 rounded border border-arch-sand italic text-sm text-gray-600">
            {isEditing ? (
              <textarea 
                className="w-full bg-transparent outline-none"
                rows={2}
                value={editForm.bio || ''}
                onChange={e => setEditForm({...editForm, bio: e.target.value})}
              />
            ) : (
              `"${user.bio || 'Geçmişin izlerini, geleceğin teknolojisiyle buluşturarak her bir fırça darbesinde tarihi yeniden canlandırıyoruz.'}"`
            )}
          </div>

          <div className="mt-6 flex justify-end">
            {isEditing ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-1 text-xs border border-arch-sand rounded uppercase tracking-widest hover:bg-gray-50"
                >
                  İptal
                </button>
                <button 
                  onClick={handleSave}
                  className="px-4 py-1 text-xs bg-arch-clay text-white rounded uppercase tracking-widest hover:bg-arch-dark"
                >
                  Kaydet
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-[10px] font-bold text-arch-clay uppercase tracking-widest hover:underline"
              >
                Kartı Düzenle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats and Achievements */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Çizilen Harita', val: '42' },
          { label: 'Eser İllüstrasyonu', val: '128' },
          { label: '3D Rekonstrüksiyon', val: '15' },
          { label: 'Saha Raporu', val: '64' },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-4 rounded-lg border border-arch-sand shadow-sm text-center">
            <p className="text-2xl font-serif font-bold text-arch-clay">{stat.val}</p>
            <p className="text-[10px] uppercase font-bold text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Archive Gallery Preview */}
      <div className="max-w-4xl mx-auto w-full space-y-6 pb-20">
        <div className="flex justify-between items-end border-b border-arch-sand pb-2">
          <h3 className="font-serif text-xl text-arch-dark">Dijital Saha Arşivi</h3>
          <button className="text-[10px] font-bold text-arch-clay uppercase tracking-widest hover:text-arch-dark transition-colors flex items-center gap-2 group">
            Tüm Arşivi Görüntüle 
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { id: 'arch-1', title: 'Sagalassos Sütun Başlığı', img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop' },
            { id: 'arch-2', title: 'Geç Roma Seramikleri', img: 'https://images.unsplash.com/photo-1608447714925-599deeb5a682?q=80&w=400&auto=format&fit=crop' },
            { id: 'arch-3', title: 'Stratigrafik Kesit Çizimi', img: 'https://images.unsplash.com/photo-1599114166081-d40b9ee8f24b?q=80&w=400&auto=format&fit=crop' },
            { id: 'arch-4', title: 'Bronz Çağı Aletleri', img: 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?q=80&w=400&auto=format&fit=crop' },
          ].map(item => (
            <div key={item.id} className="group cursor-pointer">
              <div className="aspect-[3/4] bg-white border-2 border-arch-sand p-2 shadow-sm group-hover:shadow-xl transition-all duration-500 transform group-hover:-translate-y-2 group-hover:rotate-1">
                <div className="w-full h-full overflow-hidden relative">
                  <img 
                    src={item.img} 
                    alt={item.title} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-arch-dark/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[9px] uppercase font-bold text-arch-clay tracking-widest">{item.title}</p>
                <p className="text-[8px] text-gray-400 font-serif">Envanter No: 2024/SEC-0{item.id.split('-')[1]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;