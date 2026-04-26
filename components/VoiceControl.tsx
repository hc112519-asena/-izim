import React, { useState, useEffect } from 'react';
import { analyzeVoiceCommand, generateSpeech } from '../services/geminiService';
import { AppMode } from '../types';

interface VoiceControlProps {
  onNavigate: (mode: AppMode) => void;
}

const VoiceControl: React.FC<VoiceControlProps> = ({ onNavigate }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');

  const speak = async (text: string) => {
    try {
      const audioUrl = await generateSpeech(text);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error("Speech playback error:", error);
    }
  };

  const handleToggleListen = () => {
    if (isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setFeedback("Tarayıcı desteklenmiyor.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR'; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setFeedback("Dinliyor...");
    setTranscript("");

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setFeedback("Analiz ediliyor...");
      
      const analysis = await analyzeVoiceCommand(text);
      
      let responseText = "";
      if (analysis.action === 'NAVIGATE_MAP') {
        onNavigate(AppMode.MAP_DRAWING);
        responseText = "Kartografya ünitesine geçiliyor.";
      } else if (analysis.action === 'NAVIGATE_PLAN') {
        onNavigate(AppMode.EXCAVATION_PLANNING);
        responseText = "Stratigrafi planlama birimine geçiliyor.";
      } else if (analysis.action === 'NAVIGATE_ARTIFACT') {
        onNavigate(AppMode.ARTIFACT_ILLUSTRATION);
        responseText = "Teknik illüstrasyon istasyonuna geçiliyor.";
      } else if (analysis.action === 'NAVIGATE_AI') {
        onNavigate(AppMode.AI_STUDIO);
        responseText = "Yapay zeka laboratuvarına geçiliyor.";
      } else if (analysis.action === 'NAVIGATE_TRANSLATE') {
        onNavigate(AppMode.TRANSLATION);
        responseText = "Epigrafik çözümleme servisine geçiliyor.";
      } else {
        responseText = "Komut anlaşılamadı, lütfen tekrar deneyin.";
      }
      
      setFeedback(responseText);
      speak(responseText);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error", event.error);
      setFeedback("Dinleme hatası.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className={`transition-all duration-300 transform ${isListening ? 'scale-110' : 'scale-100'}`}>
        <button
          onClick={handleToggleListen}
          className={`
            w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-2xl
            ${isListening ? 'bg-red-600 animate-pulse text-white' : 'bg-arch-dark text-arch-sand hover:bg-black'}
          `}
        >
          {isListening ? '●' : '🎤'}
        </button>
      </div>
      {feedback && (
        <div className="absolute bottom-20 right-0 bg-black/80 text-white text-xs px-3 py-2 rounded whitespace-nowrap backdrop-blur-sm">
          {transcript && <div className="italic text-gray-300">"{transcript}"</div>}
          <div className="font-bold text-arch-sand">{feedback}</div>
        </div>
      )}
    </div>
  );
};

export default VoiceControl;