import React, { useState } from 'react';
import { AIJobType } from '../types';
import { generateImageFromText, editImageWithPrompt, translateDescription } from '../services/geminiService';

const AIStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AIJobType>(AIJobType.IMAGE_EDITING);
  const [inputText, setInputText] = useState('');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setResultImage(null); // Clear previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAction = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === AIJobType.TEXT_TO_IMAGE) {
        if (!inputText) throw new Error("Lütfen bir açıklama girin.");
        const img = await generateImageFromText(inputText);
        setResultImage(img);
        setHistory(prev => [img, ...prev].slice(0, 10));
      } 
      else if (activeTab === AIJobType.IMAGE_EDITING) {
        if (!sourceImage) throw new Error("Lütfen önce bir görsel yükleyin.");
        if (!inputText) throw new Error("Lütfen düzenlemeyi tarif edin (örn: 'arka planı sil').");
        const img = await editImageWithPrompt(sourceImage, inputText);
        setResultImage(img);
        setHistory(prev => [img, ...prev].slice(0, 10));
      }
      else if (activeTab === AIJobType.RECONSTRUCTION_3D) {
         if (!sourceImage) throw new Error("Lütfen bir 2D çizim yükleyin.");
         // Simulation
         const prompt = "Transform this 2D archaeological sketch into a photorealistic 3D render on a neutral studio background. High detail, ambient occlusion.";
         const img = await editImageWithPrompt(sourceImage, prompt);
         setResultImage(img);
         setHistory(prev => [img, ...prev].slice(0, 10));
      }
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-arch-paper p-4 lg:p-6 gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden">
      
      {/* Sidebar Controls */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <div className="bg-white p-4 rounded-lg border border-arch-clay shadow-sm">
          <h2 className="text-xl font-serif text-arch-dark mb-4 border-b border-arch-sand pb-2">
            YZ Stüdyosu
          </h2>
          
          <div className="flex flex-col gap-2 mb-6">
            <button 
              onClick={() => { setActiveTab(AIJobType.IMAGE_EDITING); setError(''); }}
              className={`p-3 text-left rounded-md transition-all ${activeTab === AIJobType.IMAGE_EDITING ? 'bg-arch-clay text-white' : 'hover:bg-arch-sand text-arch-dark'}`}
            >
              <div className="font-bold">✎ Akıllı Düzenleme</div>
              <div className="text-xs opacity-80">Doğal dille görselleri düzenleyin</div>
            </button>

            <button 
              onClick={() => { setActiveTab(AIJobType.TEXT_TO_IMAGE); setError(''); }}
              className={`p-3 text-left rounded-md transition-all ${activeTab === AIJobType.TEXT_TO_IMAGE ? 'bg-arch-clay text-white' : 'hover:bg-arch-sand text-arch-dark'}`}
            >
              <div className="font-bold">✨ Metinden Görsele</div>
              <div className="text-xs opacity-80">Açıklamalardan görsel oluşturun</div>
            </button>

            <button 
              onClick={() => { setActiveTab(AIJobType.RECONSTRUCTION_3D); setError(''); }}
              className={`p-3 text-left rounded-md transition-all ${activeTab === AIJobType.RECONSTRUCTION_3D ? 'bg-arch-clay text-white' : 'hover:bg-arch-sand text-arch-dark'}`}
            >
              <div className="font-bold">🧊 3D Dönüştürme</div>
              <div className="text-xs opacity-80">2D çizimleri 3D modellere çevirin</div>
            </button>
          </div>

          <div className="space-y-4">
            {/* Image Upload Input - Only if needed */}
            {(activeTab !== AIJobType.TEXT_TO_IMAGE) && (
              <div>
                <label className="block text-sm font-bold text-arch-dark mb-1">Kaynak Görsel</label>
                <div className="relative border-2 border-dashed border-arch-clay/50 rounded-lg p-4 text-center hover:bg-arch-sand/20 transition-colors">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {sourceImage ? (
                    <span className="text-green-700 text-sm font-bold">Görsel Yüklendi ✓</span>
                  ) : (
                    <span className="text-arch-dark text-sm">Yüklemek için Tıklayın veya Sürükleyin</span>
                  )}
                </div>
              </div>
            )}

            {/* Text Input */}
            <div>
              <label className="block text-sm font-bold text-arch-dark mb-1">
                {activeTab === AIJobType.IMAGE_EDITING ? 'Düzenleme Talimatı' : 
                 activeTab === AIJobType.TEXT_TO_IMAGE ? 'Görsel Tanımı' : 'Notlar (İsteğe Bağlı)'}
              </label>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeTab === AIJobType.IMAGE_EDITING ? "Örn: Arka planı kaldır, eskitme filtresi ekle..." : 
                  activeTab === AIJobType.TEXT_TO_IMAGE ? "Örn: Detaylı kulpları olan Antik Roma amforası..." : 
                  "İsteğe bağlı notlar..."
                }
                className="w-full p-3 rounded border border-arch-clay bg-white focus:ring-2 focus:ring-arch-clay focus:outline-none min-h-[100px] font-sans"
              />
            </div>

            <button
              onClick={handleAction}
              disabled={loading}
              className={`w-full py-3 rounded text-white font-bold tracking-wider uppercase transition-all
                ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-arch-dark hover:bg-black shadow-lg'}
              `}
            >
              {loading ? 'Gemini ile İşleniyor...' : 'Oluştur'}
            </button>

            {error && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-sm rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="w-full lg:w-2/3 bg-white border border-arch-sand rounded-lg p-4 lg:p-6 shadow-sm overflow-y-auto flex flex-col items-center justify-center min-h-[300px] relative bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
        
        {sourceImage && activeTab !== AIJobType.TEXT_TO_IMAGE && !resultImage && (
             <img src={sourceImage} alt="Source" className="max-h-full max-w-full object-contain shadow-md rounded" />
        )}

        {resultImage && (
          <div className="relative group">
            <img src={resultImage} alt="Result" className="max-h-[600px] max-w-full object-contain shadow-2xl rounded border-4 border-white" />
            <a 
              href={resultImage} 
              download="hatice-ceylan-yz-sonuc.png"
              className="absolute bottom-4 right-4 bg-white text-arch-dark px-4 py-2 rounded shadow font-bold hover:bg-arch-sand opacity-0 group-hover:opacity-100 transition-opacity"
            >
              İndir
            </a>
          </div>
        )}

        {!sourceImage && !resultImage && (
          <div className="text-center text-arch-clay opacity-50">
            <div className="text-6xl mb-4">❖</div>
            <p className="font-serif text-xl">Hatice Ceylan YZ Atölyesi</p>
            <p className="font-sans text-sm mt-2">Bir araç seçin ve oluşturmaya başlayın.</p>
          </div>
        )}

        {/* History Gallery */}
        {history.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto pb-2">
            {history.map((img, i) => (
              <img 
                key={i} 
                src={img} 
                alt={`History ${i}`} 
                onClick={() => setResultImage(img)}
                className="h-16 w-16 object-cover rounded border border-arch-sand cursor-pointer hover:border-arch-clay transition-all shadow-sm"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIStudio;