import React, { useState, useEffect, useRef } from 'react';
import { decipherInscription, InscriptionAnalysis } from '../services/geminiService';
import { generatePdfReport } from '../services/pdfService';
import { 
  Upload, Sparkles, BookOpen, Clock, Trash2, 
  Download, FileText, Languages, ChevronRight, HelpCircle 
} from 'lucide-react';

interface SavedInscription {
  id: string;
  timestamp: string;
  analysis: InscriptionAnalysis;
  image?: string;
  typedText?: string;
}

const EpigraphyReader: React.FC = () => {
  const [activeSegment, setActiveSegment] = useState<'new' | 'archive'>('new');
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [typedText, setTypedText] = useState('');
  const [hintLanguage, setHintLanguage] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<InscriptionAnalysis | null>(null);
  const [savedInscriptions, setSavedInscriptions] = useState<SavedInscription[]>([]);
  const [viewingSavedItem, setViewingSavedItem] = useState<SavedInscription | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const history = localStorage.getItem('arch_epigraphy_history');
    if (history) {
      try {
        setSavedInscriptions(JSON.parse(history));
      } catch (e) {
        console.error("Error reading epigraphy history:", e);
      }
    }
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir görsel dosyası seçin.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const resetUpload = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runDecipher = async () => {
    if (!selectedImage && !typedText.trim()) {
      alert('Lütfen bir kitabe görseli yükleyin veya çözümlemek istediğiniz metni girin.');
      return;
    }

    setLoading(true);
    setLoadingStep('Görsel taranıyor ve metin bloğu çıkarılıyor...');
    
    // Simulate beautiful progressive steps for ancient deciphering
    const steps = [
      'Görsel taranıyor ve metin bloğu çıkarılıyor...',
      'Yazı karakterleri ve epigrafik örüntüler eşleştiriliyor...',
      'Eski gramer formları, fiil çekimleri ve sözlük taranıyor...',
      'Tarihsel kronoloji ve bölgesel arkeolojik veri tabanı eşleştiriliyor...'
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length - 1) {
        i++;
        setLoadingStep(steps[i]);
      }
    }, 2800);

    try {
      const result = await decipherInscription(
        selectedImage || undefined,
        typedText.trim() || undefined,
        hintLanguage
      );

      clearInterval(interval);
      setLoadingStep('Analiz tamamlandı, rapor hazırlanıyor...');
      
      setAnalysisResult(result);

      // Save to history list
      const newItem: SavedInscription = {
        id: `INS-${Date.now()}`,
        timestamp: new Date().toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        analysis: result,
        image: selectedImage || undefined,
        typedText: typedText.trim() || undefined
      };

      const updatedList = [newItem, ...savedInscriptions];
      setSavedInscriptions(updatedList);
      localStorage.setItem('arch_epigraphy_history', JSON.stringify(updatedList));

    } catch (error) {
      clearInterval(interval);
      console.error(error);
      alert('Kitabe kelimeleri ayrıştırılamadı. Lütfen görselin net olduğundan veya metnin geçerliliğinden emin olun.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleDiscussWithAssistant = (analysis: InscriptionAnalysis) => {
    const event = new CustomEvent('OPEN_ASSISTANT_WITH_CONTEXT', { 
      detail: { 
        message: `Masaüstümdeki şu epigrafik buluntuyu tahlil edelim:\n\n` + 
          `- Dil / Sistem: ${analysis.language} (${analysis.script})\n` +
          `- Tahmini Dönem: ${analysis.period}\n` +
          `- Transkripsiyon: ${analysis.transcription}\n` +
          `- Türkçe Çeviri: ${analysis.translationTr}\n\n` +
          `Lütfen bu kitabenin tarihsel bağlamını ("${analysis.historicalContext}") göz önünde bulundurarak bana daha fazla arkeolojik ayrıntı verir misin?`
      } 
    });
    window.dispatchEvent(event);
  };

  const downloadReport = (item: SavedInscription) => {
    const analysis = item.analysis;
    const reportText = `=====================================================
HATİCE CEYLAN KAZI VE ÇİZİM ATÖLYESİ - EPİGRAFİ RAPORU
=====================================================
Rapor Kodu: ${item.id}
Tarih: ${item.timestamp}

1. METADATA
-----------
Dil          : ${analysis.language}
Yazı Sistemi : ${analysis.script}
Dönem/Tarih  : ${analysis.period}
Korunmuşluk  : ${analysis.preservationState}

2. YAZITMETNİ VE TRANSKRİPSİYON
--------------------------------
[Orijinal / Okunuş]:
${analysis.transcription}

${analysis.transliteration ? `[Harf Çevirisi (Transliteration)]:\n${analysis.transliteration}\n` : ''}

3. TERCÜMELER
-------------
[Türkçe Çeviri]:
${analysis.translationTr}

[İngilizce Çeviri]:
${analysis.translationEn}

4. ARKEOLOJİK VE TARİHSEL BAĞLAM
---------------------------------
${analysis.historicalContext}

5. TEKNİK ÇİZİM VE BELGELEME NOTLARI
------------------------------------
${analysis.drawingTips || 'Belirtilmedi.'}

Rapor Sonu.
Hatice Ceylan Atölyesi YZ Epigrafi Analizörü.`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kitabe_raporu_${item.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteSavedItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bu çözümleme kaydını arşivden silmek istediğinize emin misiniz?')) {
      const filtered = savedInscriptions.filter(item => item.id !== id);
      setSavedInscriptions(filtered);
      localStorage.setItem('arch_epigraphy_history', JSON.stringify(filtered));
      if (viewingSavedItem?.id === id) {
        setViewingSavedItem(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fdfaf5] border border-arch-sand rounded overflow-hidden shadow-lg p-3 md:p-6 select-none">
      
      {/* Banner Header with classical detailing */}
      <div className="border-b-2 border-arch-clay pb-4 mb-6 relative">
        <div className="absolute top-0 right-0 text-[10px] uppercase font-mono text-arch-clay tracking-widest bg-arch-sand/20 px-2 py-0.5 rounded">
          Epigraphy AI v2.5
        </div>
        <h1 className="font-serif font-bold text-xl md:text-2xl text-arch-dark tracking-wide uppercase transition-colors">
          📜 KİTABE OKUMA VE EPİGRAFİ ÇÖZÜMLEME
        </h1>
        <p className="text-xs text-gray-500 mt-1 font-sans">
          Çivi yazıları, antik Grekçe, Latince, Göktürk runikleri, hiyeroglifler ve Osmanlı kitabeleri için yapay zeka tabanlı transkripsiyon, çeviri ve bağlamsal analiz laboratuvarı.
        </p>

        {/* Tab Controls */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => { setActiveSegment('new'); setViewingSavedItem(null); setAnalysisResult(null); }}
            className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
              activeSegment === 'new' && !viewingSavedItem
                ? 'bg-arch-clay text-white border-arch-clay shadow'
                : 'bg-white text-arch-clay border-arch-sand/65 hover:bg-arch-sand/20'
            }`}
          >
            Yeni Çözümleme
          </button>
          
          <button
            onClick={() => setActiveSegment('archive')}
            className={`px-4 py-1.5 rounded relative text-[10px] font-bold uppercase tracking-wider border transition-all ${
              activeSegment === 'archive' || viewingSavedItem
                ? 'bg-arch-clay text-white border-arch-clay shadow'
                : 'bg-white text-arch-clay border-arch-sand/65 hover:bg-arch-sand/20'
            }`}
          >
            Çözümleme Arşivi ({savedInscriptions.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {/* VIEW 1: NEW DECIPHEREMENT */}
        {activeSegment === 'new' && !viewingSavedItem && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
            
            {/* Input Side - cols 5 */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Image Drag and Drop */}
              <div className="bg-white p-4 border border-arch-sand/60 rounded shadow-sm">
                <span className="block font-serif text-xs font-bold text-arch-dark uppercase tracking-wider mb-2">
                  1. Yazıt Görseli (Fotoğraf / Çizim)
                </span>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center transition-all min-h-[220px] relative text-center cursor-pointer ${
                    dragActive ? 'border-arch-clay bg-arch-clay/5' : 'border-arch-sand/50 hover:border-arch-clay bg-arch-paper/30'
                  }`}
                  onClick={handleButtonClick}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />

                  {selectedImage ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 relative" onClick={(e) => e.stopPropagation()}>
                      <img 
                        src={selectedImage} 
                        alt="Uploaded kitabe" 
                        className="max-h-[180px] rounded-sm object-contain border border-arch-sand shadow" 
                      />
                      <button 
                        onClick={resetUpload}
                        className="text-[10px] font-bold text-red-600 hover:underline uppercase tracking-wider"
                      >
                        Görseli Değiştir
                      </button>
                    </div>
                  ) : (
                    <div className="pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-arch-sand/35 flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-5 h-5 text-arch-clay" />
                      </div>
                      <p className="text-xs font-serif font-bold text-arch-dark">Saha fotoğrafını sürükleyin veya seçin</p>
                      <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, WEBP (Çözünürlük ve ışık verimlidir)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Text Helper */}
              <div className="bg-white p-4 border border-arch-sand/60 rounded shadow-sm">
                <span className="block font-serif text-xs font-bold text-arch-dark uppercase tracking-wider mb-2">
                  2. Çevriyazı Varsa (Transkript Karakterler)
                </span>
                <textarea
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  className="w-full h-24 p-3 border border-arch-sand rounded text-xs font-mono outline-none focus:border-arch-clay bg-arch-paper/10 resize-none leading-relaxed"
                  placeholder="Gerekirse yazıt üzerindeki karakterleri buraya kendiniz de yazabilirsiniz... (Örn: ΒΑΣΙΛΕΩΣ ΜΙΘΡΙΔΑΤΟΥ / 𐰜𐰇𐰛:𐱅𐰇𐰼𐰰)"
                />
              </div>

              {/* Language Selector */}
              <div className="bg-white p-4 border border-arch-sand/60 rounded shadow-sm">
                <span className="block font-serif text-xs font-bold text-arch-dark uppercase tracking-wider mb-2">
                  3. Yazıt Alfabesi / Dil Önizleme
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'auto', label: '🤖 Otomatik Tespit' },
                    { value: 'greek', label: '🇬🇷 Antik Grekçe' },
                    { value: 'latin', label: '🇮🇹 Klasik Latince' },
                    { value: 'runic', label: '🏹 Göktürk Rünik' },
                    { value: 'ottoman', label: '🕌 Osmanlıca / Arapça' },
                    { value: 'cuneiform', label: '🏺 Çivi Yazısı' },
                    { value: 'hieroglyphs', label: '👁 Mısır Hiyeroglif' }
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setHintLanguage(lang.value)}
                      className={`px-3 py-2 text-[10px] text-left rounded border transition-all ${
                        hintLanguage === lang.value
                          ? 'bg-arch-clay/10 border-arch-clay text-arch-dark font-black'
                          : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={runDecipher}
                disabled={loading || (!selectedImage && !typedText.trim())}
                className="w-full py-3 bg-arch-clay text-white rounded font-serif font-bold text-xs uppercase tracking-[0.2em] shadow-md hover:bg-arch-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? 'YAZIT ÇÖZÜMLENİYOR...' : 'KİTABEYİ ÇÖZÜMLE'}
              </button>

            </div>

            {/* Results Side - cols 7 */}
            <div className="lg:col-span-7 flex flex-col justify-start">
              {loading ? (
                <div className="flex flex-col items-center justify-center bg-white border-2 border-dashed border-arch-sand/80 rounded h-[450px] p-8 text-center shadow-sm">
                  <div className="w-16 h-16 border-4 border-arch-clay border-t-transparent rounded-full animate-spin mb-6"></div>
                  <h3 className="font-serif text-base text-arch-dark font-bold uppercase tracking-wider mb-2">
                    Epigrafik Filolog YZ Çalışıyor
                  </h3>
                  <p className="text-xs text-gray-500 animate-pulse max-w-sm">
                    {loadingStep}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-8 italic max-w-xs leading-tight">
                    "Kitabelerin şifresini çözmek eski toplumların yasalarını, zaferlerini ve inançlarını açığa çıkarır."
                  </p>
                </div>
              ) : analysisResult ? (
                /* Museum Stone Tablet Look */
                <div className="bg-[#fcf8f0] p-6 border-2 border-arch-clay/40 rounded shadow-lg relative max-w-2xl">
                  {/* Classical decoration accents */}
                  <div className="absolute top-2 left-2 text-[10px] opacity-15">🏛</div>
                  <div className="absolute top-2 right-2 text-[10px] opacity-15">🏛</div>
                  
                  <div className="border border-arch-clay/20 p-4 bg-white rounded shadow-inner">
                    <div className="flex justify-between items-center border-b border-arch-sand pb-3 mb-4">
                      <div>
                        <span className="text-[9px] font-bold text-arch-clay uppercase tracking-widest block">
                          Saha Envanter Tasnifi
                        </span>
                        <h3 className="font-serif font-black text-base text-arch-dark tracking-tight uppercase">
                          {analysisResult.language} Yazıt Kararı
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] bg-arch-clay text-white px-2 py-0.5 rounded uppercase tracking-wider inline-block font-semibold">
                          {analysisResult.script}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-serif mb-6 bg-arch-paper/20 p-3 rounded border border-arch-sand/30">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-sans">TAHMİNİ TARİH / DÖNEM:</span>
                        <span className="text-arch-dark font-bold">{analysisResult.period}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-sans">KORUNMUŞLUK DURUMU:</span>
                        <span className="text-arch-dark font-bold">{analysisResult.preservationState}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Transcription/Characters */}
                      <div className="border border-stone-200 rounded p-4 bg-stone-50">
                        <span className="block text-[10px] font-bold text-arch-clay tracking-wider uppercase mb-1">
                          🔤 Transkripsiyon (Orijinal Karakterler)
                        </span>
                        <p className="font-serif text-arch-dark text-lg md:text-xl font-bold leading-relaxed tracking-wider break-all text-center selection:bg-amber-100 select-text">
                          {analysisResult.transcription}
                        </p>
                      </div>

                      {/* Transliteration */}
                      {analysisResult.transliteration && (
                        <div>
                          <span className="block text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1">
                            🗣 Harf Çevirisi (Transliterasyon)
                          </span>
                          <p className="font-mono text-stone-600 text-[11px] italic leading-relaxed pl-3 border-l-2 border-stone-300">
                            {analysisResult.transliteration}
                          </p>
                        </div>
                      )}

                      {/* Translations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                        <div className="bg-arch-sand/5 p-3 rounded">
                          <span className="block text-[10px] font-bold text-arch-clay tracking-wider uppercase mb-1">
                            🇹🇷 Türkçe Çeviri
                          </span>
                          <p className="font-serif italic text-xs leading-relaxed text-arch-dark">
                            "{analysisResult.translationTr}"
                          </p>
                        </div>
                        <div className="bg-arch-sand/5 p-3 rounded">
                          <span className="block text-[10px] font-bold text-arch-clay tracking-wider uppercase mb-1">
                            🇬🇧 English Translation
                          </span>
                          <p className="font-serif italic text-xs leading-relaxed text-arch-dark">
                            "{analysisResult.translationEn}"
                          </p>
                        </div>
                      </div>

                      {/* Context Analysis */}
                      <div className="pt-3 border-t border-gray-100">
                        <span className="block text-[10px] font-bold text-[#8c6747] tracking-wider uppercase mb-1">
                          📖 Tarihsel Arkaplan ve Önem
                        </span>
                        <p className="text-xs text-stone-600 font-sans leading-relaxed text-justify">
                          {analysisResult.historicalContext}
                        </p>
                      </div>

                      {/* Drawing tips */}
                      {analysisResult.drawingTips && (
                        <div className="pt-3 border-t border-gray-100 bg-[#faf6ef] p-3 rounded border border-amber-200/30">
                          <span className="block text-[10px] font-bold text-arch-clay tracking-wider uppercase mb-1">
                            📐 İllüstratör & Çizim Önerileri
                          </span>
                          <p className="text-xs italic text-stone-600 font-sans leading-relaxed">
                            {analysisResult.drawingTips}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Block */}
                    <div className="mt-8 flex flex-wrap gap-2 pt-4 border-t-2 border-arch-clay/20 justify-end">
                      <button
                        onClick={() => handleDiscussWithAssistant(analysisResult)}
                        className="px-4 py-2 bg-arch-clay text-white font-serif text-[11px] font-bold uppercase rounded hover:bg-arch-dark transition-colors flex items-center gap-1.5 shadow"
                      >
                        <span>🏺</span> ASİSTANLA TARTIŞ
                      </button>
                      <button
                        onClick={() => {
                          const mockSaved: SavedInscription = {
                            id: `INS-ACTIVE`,
                            timestamp: new Date().toLocaleDateString('tr-TR'),
                            analysis: analysisResult,
                            image: selectedImage || undefined
                          };
                          generatePdfReport(mockSaved);
                        }}
                        className="px-4 py-2 bg-[#8c2d19] text-white font-bold text-[11px] uppercase rounded hover:bg-[#6c1d0e] transition-colors flex items-center gap-1.5 shadow"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF RAPORU İNDİR
                      </button>
                      <button
                        onClick={() => {
                          const mockSaved: SavedInscription = {
                            id: `INS-ACTIVE`,
                            timestamp: new Date().toLocaleDateString('tr-TR'),
                            analysis: analysisResult
                          };
                          downloadReport(mockSaved);
                        }}
                        className="px-3 py-2 bg-[#fdfaf5] border border-arch-sand text-stone-600 font-bold text-[10px] uppercase rounded hover:bg-stone-50 transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> TXT OLARAK İNDİR
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center bg-white border-2 border-dashed border-arch-sans-light/30 rounded h-[450px] p-8 text-center shadow-inner text-gray-400">
                  <div className="w-14 h-14 bg-arch-sand/10 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 text-arch-sand" />
                  </div>
                  <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-[#a89984] mb-1">
                    Veri Girişi Bekleniyor
                  </h3>
                  <p className="text-xs text-gray-400 max-w-sm">
                    Lütfen sol sütundaki panelden bir kitabe fotoğrafı yükleyin veya bir çember / silindir mühür transkripti yapıştırın, ardından "Kitabeyi Çözümle" butonuna tıklayın.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: ARCHIVES LIST / DETAILS */}
        {(activeSegment === 'archive' || viewingSavedItem) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
            {/* List Selection Left - cols 4 */}
            <div className="lg:col-span-4 space-y-3 max-h-[550px] overflow-y-auto pr-2 border-r border-arch-sand/30">
              <span className="block font-serif text-xs font-bold text-arch-dark uppercase tracking-wider mb-2">
                Arşiv Kayıtları ({savedInscriptions.length})
              </span>
              
              {savedInscriptions.length === 0 ? (
                <div className="bg-white p-6 text-center border rounded shadow-inner text-xs text-gray-400 font-serif">
                  Kayıtlı kitabe çözümü bulunmuyor.
                </div>
              ) : (
                savedInscriptions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setViewingSavedItem(item)}
                    className={`p-3 rounded border text-left cursor-pointer transition-all ${
                      viewingSavedItem?.id === item.id || (!viewingSavedItem && viewingSavedItem === item) 
                        ? 'bg-arch-clay/10 border-arch-clay shadow-md'
                        : 'bg-white border-arch-sand/50 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold text-arch-clay uppercase">
                        {item.analysis.script}
                      </span>
                      <button
                        onClick={(e) => deleteSavedItem(item.id, e)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="font-serif font-black text-xs text-arch-dark truncate">
                      {item.analysis.language} {item.analysis.period}
                    </h4>
                    <p className="text-[9px] text-[#81726a] font-mono mt-1 italic max-w-full truncate break-all">
                      "{item.analysis.translationTr}"
                    </p>
                    <div className="flex justify-between items-center text-[8px] text-gray-400 mt-2 font-sans">
                      <span>Ref: {item.id}</span>
                      <span>{item.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Archive Item Details right - cols 8 */}
            <div className="lg:col-span-8">
              {viewingSavedItem ? (
                <div className="bg-white border border-arch-sand rounded shadow-md p-6 relative">
                  
                  <div className="flex justify-between items-center border-b border-arch-sand pb-4 mb-4">
                    <div>
                      <span className="text-[8px] font-mono text-gray-400 block">RAPOR ID: {viewingSavedItem.id}</span>
                      <h3 className="font-serif font-black text-base text-arch-dark uppercase">
                        {viewingSavedItem.analysis.language} Epigrafi Kaydı
                      </h3>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => generatePdfReport(viewingSavedItem)}
                        className="p-1 px-2.5 bg-[#8c2d19] hover:bg-[#6c1d0e] text-white text-[9px] font-bold uppercase rounded flex items-center gap-1 shadow transition-all"
                        title="Profesyonel PDF Raporu İndir"
                      >
                        <Download className="w-3 h-3" /> PDF Raporu
                      </button>
                      <button
                        onClick={() => downloadReport(viewingSavedItem)}
                        className="p-1 px-2.5 bg-gray-100 hover:bg-arch-sand text-arch-dark text-[9px] font-bold uppercase rounded border flex items-center gap-1 transition-all"
                        title="Ham TXT Raporu İndir"
                      >
                        <FileText className="w-3 h-3" /> TXT
                      </button>
                      <button
                        onClick={() => handleDiscussWithAssistant(viewingSavedItem.analysis)}
                        className="p-1 px-2.5 bg-white border border-arch-sand text-arch-clay text-[9px] font-bold uppercase rounded flex items-center gap-1 transition-all"
                      >
                        🏺 Tartış
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* If there was an image, display it */}
                    {viewingSavedItem.image && (
                      <div className="md:col-span-4 flex flex-col gap-2">
                        <span className="text-[9px] font-sans font-bold text-gray-400 uppercase">YÜKLENEN BULUNTU:</span>
                        <div className="p-1.5 bg-[#fcf9f2] border rounded shadow-inner flex items-center justify-center">
                          <img 
                            src={viewingSavedItem.image} 
                            alt="Archive" 
                            className="max-h-[160px] object-contain rounded" 
                          />
                        </div>
                      </div>
                    )}

                    <div className={viewingSavedItem.image ? 'md:col-span-8 space-y-4' : 'md:col-span-12 space-y-4'}>
                      <div className="grid grid-cols-2 gap-3 text-[11px] font-serif bg-stone-50 p-2.5 rounded border">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-sans">YAZI TÜRÜ:</span>
                          <strong>{viewingSavedItem.analysis.script}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block font-sans">KRONOLOJİ:</span>
                          <strong>{viewingSavedItem.analysis.period}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block font-sans">KONDİSYON:</span>
                          <strong>{viewingSavedItem.analysis.preservationState}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block font-sans">KAYITLI TARİH:</span>
                          <strong>{viewingSavedItem.timestamp}</strong>
                        </div>
                      </div>

                      {/* Transcription original block */}
                      <div className="p-3 bg-[#faf7f2] border-l-4 border-arch-clay rounded-r">
                        <span className="block text-[9px] font-bold text-arch-clay uppercase mb-1">Transkripsiyon / Karakterler:</span>
                        <p className="font-serif font-black text-arch-dark text-medium tracking-wide leading-relaxed select-text">
                          {viewingSavedItem.analysis.transcription}
                        </p>
                      </div>

                      {/* Transliteration */}
                      {viewingSavedItem.analysis.transliteration && (
                        <div>
                          <span className="block text-[9px] font-sans font-bold text-gray-400 uppercase mb-0.5">Phonetic Transliteration:</span>
                          <p className="font-mono text-xs italic text-stone-600 pl-2.5 border-l border-gray-300">
                            {viewingSavedItem.analysis.transliteration}
                          </p>
                        </div>
                      )}

                      {/* Translations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div>
                          <span className="block text-[9px] font-bold text-arch-clay uppercase mb-0.5">Türkçe Tercüme:</span>
                          <p className="font-serif italic text-xs leading-relaxed text-stone-800 bg-arch-sand/5 p-2 rounded">
                            "{viewingSavedItem.analysis.translationTr}"
                          </p>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-arch-clay uppercase mb-0.5">English Translation:</span>
                          <p className="font-serif italic text-xs leading-relaxed text-stone-800 bg-arch-sand/5 p-2 rounded">
                            "{viewingSavedItem.analysis.translationEn}"
                          </p>
                        </div>
                      </div>

                      {/* Historical Context Description */}
                      <div className="pt-2 border-t border-gray-100">
                        <span className="block text-[9px] font-bold text-[#8c6747] uppercase mb-0.5">Tarihsel Değerlendirme:</span>
                        <p className="text-xs text-stone-600 font-sans leading-relaxed text-justify">
                          {viewingSavedItem.analysis.historicalContext}
                        </p>
                      </div>

                      {/* Draft guidelines */}
                      {viewingSavedItem.analysis.drawingTips && (
                        <div className="p-2.5 bg-[#fbfaf6] rounded border border-gray-200">
                          <span className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">Çizim & Teknik Tavsiyeler:</span>
                          <p className="text-[11px] italic text-stone-600 font-sans">
                            {viewingSavedItem.analysis.drawingTips}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center bg-white border border-[#eae0d5] border-dashed rounded h-[380px] text-center text-gray-400 shadow-inner">
                  <Clock className="w-8 h-8 text-arch-sand mb-2" />
                  <span className="font-serif font-bold text-xs uppercase tracking-wider text-gray-400">
                    Bir Kayıt Seçin
                  </span>
                  <p className="text-[11px] text-gray-400 max-w-xs mt-1">
                    Okuma geçmişindeki detayları incelemek, raporları indirmek ya da arşiv arkaplanlarını karşılaştırmak için sol taraftan bir kitabe kaydı seçin.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EpigraphyReader;
