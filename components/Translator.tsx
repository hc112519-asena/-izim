import React, { useState } from 'react';
import { translateDescription } from '../services/geminiService';

const Translator: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [targetLang, setTargetLang] = useState('English');
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!input) return;
    setLoading(true);
    const res = await translateDescription(input, targetLang);
    setOutput(res);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-12 bg-arch-paper overflow-y-auto">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        
        {/* Input */}
        <div className="flex flex-col gap-2">
          <label className="font-serif text-arch-dark font-bold text-lg">Orijinal Metin (Açıklama)</label>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="h-64 p-4 rounded-lg border-2 border-arch-sand bg-white focus:border-arch-clay outline-none resize-none font-serif text-lg leading-relaxed shadow-inner"
            placeholder="Buluntu açıklaması veya saha notları girin..."
          />
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2 relative">
          <div className="flex justify-between items-center">
            <label className="font-serif text-arch-dark font-bold text-lg">Çeviri</label>
            <select 
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-white border border-arch-clay rounded px-2 py-1 text-sm focus:outline-none"
            >
              <option value="English">İngilizce</option>
              <option value="Turkish">Türkçe</option>
              <option value="German">Almanca</option>
              <option value="French">Fransızca</option>
              <option value="Italian">İtalyanca</option>
            </select>
          </div>
          
          <div className="h-64 p-4 rounded-lg border-2 border-arch-sand bg-stone-50 overflow-y-auto font-serif text-lg leading-relaxed italic text-gray-700 shadow-sm relative">
            {loading ? (
                <div className="absolute inset-0 flex items-center justify-center text-arch-clay animate-pulse">Çevriliyor...</div>
            ) : output || <span className="text-gray-400">Çeviri burada görünecek...</span>}
          </div>
        </div>

      </div>
      
      <div className="mt-8 flex gap-4">
        <button 
          onClick={handleTranslate}
          disabled={loading}
          className="px-8 py-3 bg-arch-clay text-white font-serif font-bold text-xl rounded shadow-lg hover:bg-arch-dark transition-colors disabled:opacity-50"
        >
          Şimdi Çevir
        </button>

        {output && (
          <button 
            onClick={() => {
              const event = new CustomEvent('OPEN_ASSISTANT_WITH_CONTEXT', { 
                detail: { 
                  message: `Aşağıdaki metin ve çevirisi hakkında arkeolojik bir tartışma yapmak istiyorum:\n\nOrijinal: ${input}\n\nÇeviri: ${output}` 
                } 
              });
              window.dispatchEvent(event);
            }}
            className="px-8 py-3 bg-white border-2 border-arch-clay text-arch-clay font-serif font-bold text-xl rounded shadow-lg hover:bg-arch-sand transition-colors"
          >
            Asistanla Tartış
          </button>
        )}
      </div>
    </div>
  );
};

export default Translator;