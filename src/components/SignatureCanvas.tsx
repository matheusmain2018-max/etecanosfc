import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, PenTool, Type, HelpCircle, Check, Info } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  playerName?: string;
  id?: string;
}

export default function SignatureCanvas({ onSave, onClear, playerName = '', id = 'signature-pad' }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#000000'); // Preto Clássico - standard classic contract pen color
  const [penWidth, setPenWidth] = useState(3);
  const [hasSignature, setHasSignature] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Supported premium contrating ink colors - Locked to Black
  const inkColors = [
    { name: 'Preto Clássico', hex: '#000000' },
  ];

  // Initialize Canvas with proper high DPI backing store support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display density
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Initial canvas styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    clearCanvas();
  }, []);

  // Update stroke styles on change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
  }, [penColor, penWidth]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture state for history array before drawing new lines
    const currentSnapshot = canvas.toDataURL();
    setHistory(prev => [...prev, currentSnapshot]);

    const rect = canvas.getBoundingClientRect();
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

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
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

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save live signature data block
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      onSave(dataUrl);
    }
  };

  const handleClear = () => {
    clearCanvas();
    setHasSignature(false);
    setHistory([]);
    if (onClear) onClear();
    onSave(''); // Empty
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevSnapshot = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    const img = new Image();
    img.onload = () => {
      clearCanvas();
      ctx.drawImage(img, 0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      
      // Calculate signature presence by checking remaining entries
      if (history.length === 1 && prevSnapshot === canvas.toDataURL()) {
        setHasSignature(false);
      } else {
        setHasSignature(true);
      }
      onSave(canvas.toDataURL());
    };
    img.src = prevSnapshot;
  };

  // Generate simulated signature auto-writing using italic fonts
  const generateDigitalTextSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    handleClear();
    
    const rect = canvas.getBoundingClientRect();
    
    // Style text signature
    ctx.font = "italic 36px 'Dancing Script', 'Caveat', 'Georgia', cursive, serif";
    ctx.fillStyle = penColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw the name
    const textToDraw = playerName ? playerName : 'Atleta Bilau Lombrado FC';
    ctx.fillText(textToDraw, rect.width / 2, rect.height / 2);
    
    setHasSignature(true);
    onSave(canvas.toDataURL());
  };

  return (
    <div id={`${id}-wrapper`} className="flex flex-col gap-3">
      {/* Signature Header with Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mão / Caneta:</span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
              {inkColors.map((color) => (
                <button
                  key={color.hex}
                  id={`ink-color-${color.hex.replace('#','')}`}
                  type="button"
                  title={color.name}
                  onClick={() => setPenColor(color.hex)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    penColor === color.hex ? 'scale-110 border-amber-500' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Espessura:</span>
            <div className="flex gap-1.5">
              {[2, 3, 5].map((width) => (
                <button
                  key={width}
                  id={`width-tool-${width}`}
                  type="button"
                  onClick={() => setPenWidth(width)}
                  className={`px-2 py-0.5 text-xs rounded font-medium transition-all ${
                    penWidth === width 
                      ? 'bg-red-800 text-amber-300 font-extrabold' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {width === 2 ? 'Fina' : width === 3 ? 'Média' : 'Grossa'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {playerName && (
            <button
              id="autofill-signature-btn"
              type="button"
              onClick={generateDigitalTextSignature}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              title="Gera uma assinatura baseada no nome do jogador"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Gerar Auto</span>
            </button>
          )}

          {history.length > 0 && (
            <button
              id="undo-signature-btn"
              type="button"
              onClick={handleUndo}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Desfazer</span>
            </button>
          )}

          <button
            id="clear-signature-btn"
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors"
          >
            <span>Limpar Área</span>
          </button>
        </div>
      </div>

      {/* Actual Canvas Area */}
      <div className="relative border-x border-b border-slate-200 rounded-b-xl bg-white shadow-inner overflow-hidden">
        
        {/* Background guideline overlays (visible when hasSignature is false) */}
        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-end pb-8 px-6 select-none z-0">
            {/* Dotted Baseline */}
            <div className="border-b border-dashed border-slate-300 w-full mb-4" />
            {/* Instructions */}
            <div className="text-center text-xs text-slate-400 font-medium">
              Assine aqui com a caneta eletrônica
            </div>
          </div>
        )}

        <canvas
          id={id}
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-48 cursor-crosshair touch-none block relative z-10 bg-transparent"
        />

        {/* Ink indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/80 backdrop-blur-xs text-[10px] font-semibold text-slate-500 py-1 px-1.5 rounded-full border border-slate-200">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: penColor }} />
          <span>Caneta Ativa</span>
        </div>
      </div>

      {/* User Helper Message */}
      <div className="flex items-start gap-2 bg-amber-50/75 border border-amber-100 rounded-lg p-2.5">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-relaxed">
          <strong>Modo de Assinatura:</strong> Use o mouse ou a tela de toque para escrever seu nome sobre a linha. Se preferir, clique em <strong>"Gerar Auto"</strong> para assinar com uma fonte cursiva. A caligrafia gerada fará parte do contrato final em PDF.
        </p>
      </div>
    </div>
  );
}
