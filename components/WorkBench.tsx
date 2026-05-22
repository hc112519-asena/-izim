import React, { useRef, useState, useEffect } from 'react';
import { DrawingTool, AppMode, ArchaeologicalPeriod, ToolType } from '../types';
import { auth, db, doc, setDoc, Timestamp, handleFirestoreError, OperationType } from '../firebase';

interface WorkBenchProps {
  mode: AppMode;
}

const WorkBench: React.FC<WorkBenchProps> = ({ mode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  
  // Tool State
  const [color, setColor] = useState('#2b2b2b');
  const [lineWidth, setLineWidth] = useState(2);
  const [showGrid, setShowGrid] = useState(mode === AppMode.EXCAVATION_PLANNING);
  const [selectedPeriod, setSelectedPeriod] = useState<ArchaeologicalPeriod>(ArchaeologicalPeriod.ROMAN);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.PEN);
  const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  const [artifactTitle, setArtifactTitle] = useState('İsimsiz Buluntu');
  const [isSaving, setIsSaving] = useState(false);

  const [isToolsOpen, setIsToolsOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          setContext(ctx);
          
          // Archaeological Drafting Paper Base
          ctx.fillStyle = '#fdfbf7';
          ctx.fillRect(0, 0, rect.width, rect.height);
          
          if (showGrid) drawGrid(ctx, rect.width, rect.height);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mode, showGrid]);

  useEffect(() => {
    setShowGrid(mode === AppMode.EXCAVATION_PLANNING);
  }, [mode]);

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = '#e6dec8';
    ctx.lineWidth = 0.5;
    const step = 20; // Finer grid for archaeological precision
    
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Secondary coarser grid
    ctx.strokeStyle = '#d6d1c2';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += step * 5) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step * 5) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!context || !canvasRef.current) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (activeTool === ToolType.FILL) {
      handleFloodFill(Math.floor(x * dpr), Math.floor(y * dpr));
      return;
    }

    setIsDrawing(true);
    setStartPos({ x, y });
    setSnapshot(context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));

    context.beginPath();
    context.moveTo(x, y);
  };

  const handleFloodFill = (startX: number, startY: number) => {
    if (!context || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const targetR = parseInt(color.slice(1, 3), 16);
    const targetG = parseInt(color.slice(3, 5), 16);
    const targetB = parseInt(color.slice(5, 7), 16);
    
    const startIdx = (startY * canvas.width + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    if (targetR === startR && targetG === startG && targetB === startB && startA === 255) return;

    const stack = [[startX, startY]];
    const visited = new Uint8Array(canvas.width * canvas.height);

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      
      const idx = (y * canvas.width + x) * 4;
      if (visited[y * canvas.width + x]) continue;
      
      if (data[idx] === startR && data[idx + 1] === startG && data[idx + 2] === startB && data[idx + 3] === startA) {
        data[idx] = targetR;
        data[idx + 1] = targetG;
        data[idx + 2] = targetB;
        data[idx + 3] = 255;
        visited[y * canvas.width + x] = 1;

        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }
    }
    context.putImageData(imageData, 0, 0);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context || !canvasRef.current || !startPos) return;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    context.strokeStyle = activeTool === ToolType.ERASER ? '#fdfbf7' : color;
    context.lineWidth = lineWidth;

    if (activeTool === ToolType.PEN || activeTool === ToolType.ERASER) {
      context.lineTo(x, y);
      context.stroke();
    } else if (activeTool === ToolType.RECTANGLE || activeTool === ToolType.CIRCLE) {
      if (snapshot) context.putImageData(snapshot, 0, 0);
      context.beginPath();
      if (activeTool === ToolType.RECTANGLE) {
        context.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        context.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        context.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!context) return;
    context.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    context.fillStyle = '#fdfbf7';
    context.fillRect(0, 0, rect.width, rect.height);
    if (showGrid) drawGrid(context, rect.width, rect.height);
  };

  const downloadDrawing = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `HC-ARKEOLOJI-${mode.toLowerCase()}-${selectedPeriod.replace(' ', '-')}-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  const saveToArchive = async () => {
    if (!canvasRef.current || !auth.currentUser) {
      alert("Lütfen önce giriş yapın.");
      return;
    }
    
    setIsSaving(true);
    let collectionName = '';
    try {
      const dataUrl = canvasRef.current.toDataURL();
      const docId = `HC-${Date.now()}`;
      
      if (mode === AppMode.ARTIFACT_ILLUSTRATION) {
        collectionName = 'artifacts';
        await setDoc(doc(db, collectionName, docId), {
          id: docId,
          title: artifactTitle,
          inventoryNo: `ARC-${Date.now().toString().slice(-6)}`,
          period: selectedPeriod,
          imageUrl: dataUrl,
          createdBy: auth.currentUser.uid,
          createdAt: Timestamp.now()
        });
      } else {
        collectionName = mode === AppMode.MAP_DRAWING ? 'maps' : 'plans';
        await setDoc(doc(db, collectionName, docId), {
          id: docId,
          title: artifactTitle || (mode === AppMode.MAP_DRAWING ? 'Kartografik Çizim' : 'Kazı Planı'),
          data: dataUrl,
          createdBy: auth.currentUser.uid,
          createdAt: Timestamp.now()
        });
      }
      
      alert('Çizim başarıyla dijital arşive kaydedildi.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName || 'archive');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-arch-paper relative shadow-inner overflow-hidden">
      {/* Drafting Table Tools Toggle (Mobile) */}
      <button 
        onClick={() => setIsToolsOpen(!isToolsOpen)}
        className="md:hidden absolute top-4 right-4 z-30 bg-arch-clay text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-xl"
      >
        {isToolsOpen ? '✕' : '🖋'}
      </button>

      {/* Drafting Table Tools */}
      <div className={`
        absolute top-4 left-4 md:top-6 md:left-6 z-20 flex flex-col gap-4 bg-white/95 border-2 border-arch-clay p-4 shadow-2xl rounded-sm w-[200px] transition-all duration-300
        ${isToolsOpen ? 'translate-x-0 opacity-100' : '-translate-x-[250px] opacity-0 pointer-events-none'}
      `}>
        <div className="flex items-center gap-2 border-b border-arch-sand pb-2 mb-2">
           <span className="text-arch-clay">🖋</span>
           <h3 className="text-[10px] font-serif font-black uppercase tracking-widest text-arch-dark">Ekipman Kutusu</h3>
        </div>

        {/* Tool Selection */}
        <div className="grid grid-cols-5 gap-1 mb-2">
          {[
            { type: ToolType.PEN, icon: '🖋', label: 'Kalem' },
            { type: ToolType.ERASER, icon: '🧽', label: 'Silgi' },
            { type: ToolType.FILL, icon: '🪣', label: 'Doldur' },
            { type: ToolType.RECTANGLE, icon: '⬜', label: 'Dikdörtgen' },
            { type: ToolType.CIRCLE, icon: '⭕', label: 'Daire' },
          ].map(t => (
            <button
              key={t.type}
              onClick={() => setActiveTool(t.type)}
              className={`p-2 rounded-sm border transition-all flex flex-col items-center justify-center gap-1 ${activeTool === t.type ? 'bg-arch-clay text-white border-arch-clay' : 'bg-white text-arch-clay border-arch-sand hover:bg-arch-sand/20'}`}
              title={t.label}
            >
              <span className="text-xs">{t.icon}</span>
            </button>
          ))}
        </div>
        
        {/* Period Selector (Only for Artifact Illustration) */}
        {mode === AppMode.ARTIFACT_ILLUSTRATION && (
          <>
            <div className="space-y-1 mb-2">
              <label className="text-[8px] font-bold text-gray-400 uppercase">Buluntu Başlığı</label>
              <input 
                type="text"
                value={artifactTitle}
                onChange={(e) => setArtifactTitle(e.target.value)}
                className="w-full text-[10px] p-1 border border-arch-sand bg-arch-paper outline-none font-serif font-bold text-arch-dark focus:border-arch-clay"
              />
            </div>
            <div className="space-y-1 mb-2">
              <label className="text-[8px] font-bold text-gray-400 uppercase">Buluntu Dönemi</label>
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as ArchaeologicalPeriod)}
                className="w-full text-[10px] p-1 border border-arch-sand bg-arch-paper outline-none font-serif font-bold text-arch-dark focus:border-arch-clay"
              >
                {Object.values(ArchaeologicalPeriod).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Layer Selector (Only for Excavation Planning) */}
        {mode === AppMode.EXCAVATION_PLANNING && (
          <div className="space-y-1 mb-2">
            <label className="text-[8px] font-bold text-gray-400 uppercase">Stratigrafik Katman</label>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentLayer(Math.max(1, currentLayer - 1))}
                className="bg-arch-sand px-2 py-1 text-[10px] font-bold"
              >
                -
              </button>
              <span className="flex-1 text-center text-[10px] font-bold text-arch-dark">Katman {currentLayer}</span>
              <button 
                onClick={() => setCurrentLayer(currentLayer + 1)}
                className="bg-arch-sand px-2 py-1 text-[10px] font-bold"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Compass Rotation (Only for Map Drawing) */}
        {mode === AppMode.MAP_DRAWING && (
          <div className="space-y-1 mb-2">
            <label className="text-[8px] font-bold text-gray-400 uppercase">Pusula Yönü ({rotation}°)</label>
            <input 
              type="range" 
              min="0" 
              max="360" 
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full h-1 bg-arch-sand rounded-lg appearance-none cursor-pointer accent-arch-clay"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {[
            { c: '#2b2b2b', n: 'Mürekkep' },
            { c: '#a67c52', n: 'Toprak' },
            { c: '#b91c1c', n: 'Kritik' },
            { c: '#1d4ed8', n: 'Su' },
          ].map(t => (
            <button 
              key={t.c}
              onClick={() => setColor(t.c)} 
              className={`flex items-center gap-2 p-1 rounded-sm border transition-all ${color === t.c ? 'bg-arch-sand border-arch-clay' : 'border-transparent hover:bg-gray-50'}`}
              title={t.n}
            >
              <div className="w-4 h-4 rounded-full border border-gray-400" style={{ backgroundColor: t.c }} />
              <span className="text-[8px] font-bold uppercase text-gray-500">{t.n}</span>
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[8px] font-bold text-gray-400 uppercase">
             <span>Uç Kalınlığı</span>
             <span>{lineWidth}px</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="8" 
            step="0.5"
            value={lineWidth} 
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-full h-1 bg-arch-sand rounded-lg appearance-none cursor-pointer accent-arch-clay" 
          />
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-arch-sand">
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={`text-[9px] font-bold uppercase tracking-widest p-2 flex items-center justify-between border transition-all ${showGrid ? 'bg-arch-clay text-white' : 'bg-white text-arch-clay border-arch-clay'}`}
          >
            Izgara Modu <span>{showGrid ? 'aç' : 'kapat'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button 
              onClick={clearCanvas}
              className="p-2 border border-red-200 text-red-600 text-[9px] font-bold uppercase hover:bg-red-50 transition-colors"
            >
              Sil
            </button>
            <button 
              onClick={saveToArchive}
              disabled={isSaving}
              className={`p-2 bg-arch-dark text-white text-[9px] font-bold uppercase transition-all shadow-md ${isSaving ? 'opacity-50' : 'hover:bg-black'}`}
            >
              {isSaving ? 'Kaydediliyor...' : 'Arşivle'}
            </button>
          </div>
          
          <button 
            onClick={() => {
              const img = canvasRef.current?.toDataURL();
              const event = new CustomEvent('OPEN_ASSISTANT_WITH_CONTEXT', { 
                detail: { 
                  image: img, 
                  message: `Bu ${mode === AppMode.ARTIFACT_ILLUSTRATION ? 'buluntu çizimini' : mode === AppMode.MAP_DRAWING ? 'haritayı' : 'kazı planını'} analiz edebilir misin?` 
                } 
              });
              window.dispatchEvent(event);
            }}
            className="w-full mt-2 p-3 bg-white border-2 border-arch-clay text-arch-clay text-[10px] font-black uppercase tracking-widest hover:bg-arch-clay hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span>🏺</span> ASİSTANA SOR
          </button>
        </div>
      </div>

      {/* Main Drafting Surface */}
      <div className="flex-1 overflow-hidden p-8 cursor-crosshair relative">
         {/* Perspective guide overlay decorative */}
         <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
            <div className="w-[800px] h-[800px] border border-arch-clay rounded-full"></div>
            <div className="absolute w-full h-px bg-arch-clay"></div>
            <div className="absolute h-full w-px bg-arch-clay"></div>
         </div>

         <div className="w-full h-full bg-white shadow-inner border border-arch-sand relative z-0">
            <canvas
              ref={canvasRef}
              className="w-full h-full block touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            
            {/* Hatice Ceylan Atelier Watermark */}
            <div className="absolute bottom-4 left-4 opacity-40 select-none pointer-events-none text-left z-10">
               <div className="text-[10px] font-bold text-arch-clay/60 uppercase tracking-[0.25em] font-serif">HATİCE CEYLAN ATÖLYESİ</div>
               <div className="text-[8px] font-serif text-arch-dark/40 tracking-wider">Mülkiyet & Lisans Sahibi • Sınırlı Saha Lisansı • © 2026</div>
            </div>
            
            {/* North Arrow Decorative */}
            <div 
              className="absolute top-6 right-6 opacity-40 select-none pointer-events-none flex flex-col items-center transition-transform duration-300"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
               <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[25px] border-b-arch-clay mb-1"></div>
               <span className="font-serif font-bold text-xs text-arch-clay">N</span>
            </div>

            {/* Selected Period Display */}
            {mode === AppMode.ARTIFACT_ILLUSTRATION && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-arch-clay/10 px-4 py-1 rounded-full border border-arch-clay/20 pointer-events-none">
                 <span className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-arch-clay">Dönem: {selectedPeriod}</span>
              </div>
            )}

            {/* Scale Bar for visual context */}
            <div className="absolute bottom-6 left-6 opacity-30 select-none pointer-events-none">
               <div className="flex items-center gap-1">
                  <div className="flex border border-arch-dark">
                     <div className="w-8 h-2 bg-arch-dark"></div>
                     <div className="w-8 h-2 bg-white"></div>
                     <div className="w-8 h-2 bg-arch-dark"></div>
                  </div>
                  <span className="text-[9px] font-bold text-arch-dark">5cm</span>
               </div>
            </div>

            {/* Corner Label */}
            <div className="absolute bottom-6 right-8 text-arch-clay font-hand text-4xl opacity-20 select-none pointer-events-none transform -rotate-2">
              {mode === AppMode.MAP_DRAWING ? 'Kartografya' : 
               mode === AppMode.EXCAVATION_PLANNING ? 'Stratigrafi' : 
               'Teknik Çizim'}
            </div>
         </div>
      </div>
    </div>
  );
};

export default WorkBench;