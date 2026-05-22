import React, { useState, useEffect, useRef } from 'react';
import { auth, db, doc, getDoc, setDoc, Timestamp, collection, onSnapshot } from '../firebase';
import { deleteDoc } from 'firebase/firestore';

const Profile: React.FC = () => {
  const defaultUser = {
    displayName: 'HATİCE CEYLAN',
    role: 'admin',
    uid: 'HC-2024-ADMIN',
    specialization: 'Arkeolojik Çizim ve 3D Modelleme',
    education: 'Arkeoloji ve Sanat Tarihi',
    institution: 'Hatice Ceylan Atölyesi',
    experience: '15+ Yıl',
    bio: 'Geçmişin izlerini, geleceğin teknolojisiyle buluşturarak her bir fırça darbesinde tarihi yeniden canlandırıyoruz.',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
    createdAt: { toDate: () => new Date() }
  };

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(defaultUser);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Whitelist management states
  const [whitelistEmails, setWhitelistEmails] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  
  const user = profileData || defaultUser;
  const isAdminUser = user.role === 'admin' || auth.currentUser?.email?.toLowerCase() === 'hc112519@gmail.com';

  useEffect(() => {
    if (!isAdminUser) return;
    
    // Subscribe to whitelist collection real-time
    const unsubscribe = onSnapshot(collection(db, 'whitelist'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docRef) => {
        list.push({ id: docRef.id, ...docRef.data() });
      });
      setWhitelistEmails(list);
    }, (error) => {
      console.error("Error reading whitelist collection:", error);
    });

    return () => unsubscribe();
  }, [isAdminUser, user.role]);

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToAuth = newEmail.trim().toLowerCase();
    if (!emailToAuth) return;
    
    // Simple regex check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailToAuth)) {
      alert("Lütfen geçerli bir e-posta adresi yazın.");
      return;
    }

    setAddingEmail(true);
    try {
      await setDoc(doc(db, 'whitelist', emailToAuth), {
        email: emailToAuth,
        authorizedBy: auth.currentUser?.email || 'Hatice Ceylan',
        createdAt: Timestamp.now()
      });
      setNewEmail('');
    } catch (error) {
      console.error("Error whitelisting user:", error);
      alert("Yetkilendirme sırasında bir hata oldu: " + (error instanceof Error ? error.message : "Bilinmeyen Hata"));
    } finally {
      setAddingEmail(false);
    }
  };

  const handleRemoveWhitelist = async (emailId: string) => {
    if (!window.confirm(`${emailId} adresinin sınırsız erişim yetkisini iptal etmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'whitelist', emailId));
    } catch (error) {
      console.error("Error removing whitelisted user:", error);
      alert("Yetki iptali sırasında hata oluştu.");
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      // Check localStorage first
      const localData = localStorage.getItem('arch_profile_data');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setProfileData(parsed);
          setEditForm(parsed);
        } catch (e) {
          console.error("Local storage parse error", e);
        }
      }

      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const cloudData = userSnap.data();
          // Merge with default user to ensure all fields exist
          const merged = { ...defaultUser, ...cloudData };
          setProfileData(merged);
          setEditForm(merged);
          localStorage.setItem('arch_profile_data', JSON.stringify(merged));
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset value to allow re-upload of same file
      fileInputRef.current.click();
    }
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
        
        // Use a base of current profile data or default user
        const baseData = profileData || defaultUser;
        const newData = { ...baseData, photoURL: base64String };
        
        setProfileData(newData);
        setEditForm((prev: any) => ({ ...prev, photoURL: base64String }));
        localStorage.setItem('arch_profile_data', JSON.stringify(newData));
        window.dispatchEvent(new CustomEvent('PROFILE_UPDATED'));

        if (auth.currentUser) {
          try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userRef, { photoURL: base64String }, { merge: true });
          } catch (error) {
            console.error("Error updating photo:", error);
          }
        }
      };
      reader.onerror = () => {
        alert("Dosya okunurken bir hata oluştu.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    // Always save to localStorage
    localStorage.setItem('arch_profile_data', JSON.stringify(editForm));
    setProfileData(editForm);
    setIsEditing(false);

    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, editForm, { merge: true });
      } catch (error) {
        console.error("Error saving profile:", error);
        alert("Profil buluta kaydedilirken bir hata oluştu, ancak yerel olarak saklandı.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-arch-paper">
        <div className="w-12 h-12 border-4 border-arch-clay border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
              className="w-32 h-40 md:w-40 md:h-48 bg-stone-300 shadow-inner relative overflow-hidden grayscale hover:grayscale-0 transition-all cursor-pointer group border-2 border-arch-clay/20"
            >
              <img 
                src={user.photoURL || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop'} 
                alt="Profil" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                <span className="text-white text-xl mb-1">📷</span>
                <span className="text-white text-[10px] font-bold uppercase tracking-widest px-2 text-center">Resmi Değiştir</span>
              </div>
              
              {/* Ornate corner accents */}
              <div className="ornate-corner corner-tl"></div>
              <div className="ornate-corner corner-tr"></div>
              <div className="ornate-corner corner-bl"></div>
              <div className="ornate-corner corner-br"></div>
            </div>
          </div>

          <button 
            onClick={handleImageClick}
            className="mb-4 text-[9px] font-bold text-arch-clay uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full border border-arch-sand hover:bg-white transition-colors"
          >
            FOTOĞRAF YÜKLE
          </button>

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

      {/* Whitelist Authorization Panel for Admins */}
      {isAdminUser && (
        <div className="max-w-4xl mx-auto w-full bg-white border-2 border-arch-clay shadow-xl p-6 md:p-8 rounded-lg relative overflow-hidden font-serif">
          {/* Decorative brass-themed header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-arch-sand pb-4 mb-6 gap-4">
             <div>
                <h3 className="text-xl md:text-2xl font-bold text-arch-dark tracking-tight uppercase flex items-center gap-2">
                   <span>📜</span> Atölye Yetkilendirme Paneli
                </h3>
                <p className="text-[10px] md:text-xs text-stone-500 uppercase tracking-widest mt-0.5 font-sans">Saha Terminali Erişim Lisans Kontrolü</p>
             </div>
             <div className="bg-amber-50 border border-amber-200 py-1 px-3 rounded-full flex items-center gap-1.5 shadow-inner">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                <span className="text-[9px] font-bold text-amber-800 uppercase tracking-widest font-sans">Yönetici Modu</span>
             </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed mb-6 font-sans">
             Kazı Atölyesi'ne sınırsız ücretsiz erişim sağlamak istediğiniz çalışma arkadaşlarınızın e-posta adreslerini aşağıya ekleyin. Bu listede yer almayan misafir kullanıcılar günlük en fazla <strong>30 dakika</strong> çalışma hakkına sahip olacak ve limit dolduğunda premium lisansa yönlendirilecektir.
          </p>

          <form onSubmit={handleAddWhitelist} className="flex flex-col sm:flex-row gap-3 mb-6 font-sans">
             <input
                type="email"
                placeholder="Örn: meslektas@kurum.edu.tr"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={addingEmail}
                className="flex-1 bg-stone-50 border-2 border-arch-sand focus:border-arch-clay hover:border-stone-400 outline-none p-3 text-sm rounded shadow-inner transition-colors"
                required
             />
             <button
                type="submit"
                disabled={addingEmail}
                className="bg-arch-clay hover:bg-arch-dark text-white font-bold text-xs uppercase tracking-widest py-3 px-6 rounded shadow-md transition-all flex items-center justify-center gap-2"
              >
                {addingEmail ? (
                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                   <span>➕ ERİŞİM YETKİSİ VER</span>
                )}
             </button>
          </form>

          {/* Whitelisted emails table */}
          <div>
             <h4 className="text-xs font-serif font-black text-arch-dark uppercase tracking-widest mb-3 pb-1 border-b border-arch-sand">
                Aktif Yetkilendirilmiş Araştırmacılar ({whitelistEmails.length})
             </h4>

             {whitelistEmails.length === 0 ? (
                <div className="text-center py-8 bg-stone-50 border border-dashed border-stone-350 rounded font-sans text-xs text-stone-500">
                   Sizin dışınızda henüz hiçbir araştırmacı yetkilendirilmemiş. Atölye şu an genel kullanıma 30 dk limitli, size özel ise sınırsızdır.
                </div>
             ) : (
                <div className="overflow-x-auto rounded border border-arch-sand shadow-sm bg-stone-50/50">
                   <table className="w-full text-left font-sans text-xs border-collapse">
                      <thead>
                         <tr className="bg-arch-sand/30 border-b border-arch-sand text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                            <th className="p-3">Araştırmacı E-postası</th>
                            <th className="p-3">Yetkilendiren</th>
                            <th className="p-3">Eklenme Tarihi</th>
                            <th className="p-3 text-right">Erişim Yönetimi</th>
                         </tr>
                      </thead>
                      <tbody>
                         {whitelistEmails.map((entry) => (
                            <tr key={entry.id} className="border-b border-arch-sand/50 hover:bg-white transition-colors">
                               <td className="p-3 font-mono font-bold text-arch-dark">{entry.email}</td>
                               <td className="p-3 text-stone-500">{entry.authorizedBy || 'Admin'}</td>
                               <td className="p-3 text-stone-400">
                                  {entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleDateString() : '---'}
                               </td>
                               <td className="p-3 text-right">
                                  <button
                                     type="button"
                                     onClick={() => handleRemoveWhitelist(entry.id)}
                                     className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 font-bold uppercase tracking-wider px-2.5 py-1 rounded border border-red-200 transition-colors"
                                  >
                                     Erişimi Kaldır 🗑
                                  </button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             )}
          </div>
        </div>
      )}

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