import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Pen, Highlighter, Circle, Undo2, Redo2, Trash2, Settings, X, Type, Move } from 'lucide-react';

function ScribbleApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const laserPointerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [canvasColor, setCanvasColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(2);
  const [strokeHistory, setStrokeHistory] = useState<any[]>([]);
  const [currentStroke, setCurrentStroke] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [penStyle, setPenStyle] = useState<'pencil' | 'pen' | 'highlighter' | 'laser' | 'text' | 'move'>('pencil');
  const [highlighterOpacity, setHighlighterOpacity] = useState(0.3);
  const [laserPointerPosition, setLaserPointerPosition] = useState({ x: 0, y: 0 });
  const [showLaserPointer, setShowLaserPointer] = useState(false);
  const [laserColor, setLaserColor] = useState('#ff0000');
  const [fontSize, setFontSize] = useState(16);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      redrawCanvas();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (penStyle === 'laser' && !isDrawing) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setLaserPointerPosition({ x, y });
        setShowLaserPointer(true);
      }
    };

    const handleMouseLeave = () => {
      if (penStyle === 'laser') {
        setShowLaserPointer(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [penStyle, isDrawing]);

  const configurePenStyle = (ctx: CanvasRenderingContext2D, style: string, color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    
    switch (style) {
      case 'pencil':
        ctx.globalAlpha = 1.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        break;
      case 'pen':
        ctx.globalAlpha = 1.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = width * 1.5;
        break;
      case 'highlighter':
        ctx.globalAlpha = highlighterOpacity;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'square';
        ctx.lineWidth = width * 2;
        break;
      case 'laser':
        ctx.globalAlpha = 0.5;
        break;
      case 'text':
      case 'move':
        ctx.globalAlpha = 1.0;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = color;
        break;
      default:
        ctx.globalAlpha = 1.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
    }
  };

  const isPointInText = (x: number, y: number, textStroke: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.font = `${textStroke.fontSize}px sans-serif`;
    const metrics = ctx.measureText(textStroke.text);
    const height = textStroke.fontSize;

    return (
      x >= textStroke.x &&
      x <= textStroke.x + metrics.width &&
      y >= textStroke.y - height &&
      y <= textStroke.y
    );
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = canvasColor;
    ctx.globalAlpha = 1.0;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    strokeHistory.forEach((stroke, index) => {
      if (stroke.type === 'text') {
        configurePenStyle(ctx, 'text', stroke.color, stroke.width);
        ctx.fillText(stroke.text, stroke.x, stroke.y);

        // Highlight selected text when in move mode
        if (penStyle === 'move' && index === selectedTextIndex) {
          const metrics = ctx.measureText(stroke.text);
          const height = stroke.fontSize;
          ctx.strokeStyle = 'rgba(66, 153, 225, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(
            stroke.x - 4,
            stroke.y - height - 4,
            metrics.width + 8,
            height + 8
          );
        }
      } else if (stroke.points.length > 0) {
        ctx.beginPath();
        configurePenStyle(ctx, stroke.style, stroke.color, stroke.width);
        
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        
        ctx.stroke();
      }
    });
    
    ctx.globalAlpha = 1.0;
  };

  useEffect(() => {
    redrawCanvas();
  }, [strokeHistory, canvasColor, selectedTextIndex, penStyle]);

  useEffect(() => {
    let animationFrameId: number;
    let opacity = 1;
    
    const renderLaserPointer = () => {
      if (penStyle === 'laser' && showLaserPointer) {
        const laser = laserPointerRef.current;
        if (laser) {
          laser.style.left = `${laserPointerPosition.x}px`;
          laser.style.top = `${laserPointerPosition.y}px`;
          laser.style.boxShadow = `0 0 10px 2px ${laserColor}`;
          laser.style.backgroundColor = laserColor;
          laser.style.opacity = opacity.toString();
          
          opacity = 0.6 + Math.sin(Date.now() / 200) * 0.4;
        }
        animationFrameId = requestAnimationFrame(renderLaserPointer);
      }
    };
    
    renderLaserPointer();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [penStyle, showLaserPointer, laserPointerPosition, laserColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (penStyle === 'laser') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (penStyle === 'move') {
      // Find if we clicked on any text
      const textIndex = strokeHistory.findIndex(
        (stroke) => stroke.type === 'text' && isPointInText(x, y, stroke)
      );

      if (textIndex !== -1) {
        setSelectedTextIndex(textIndex);
        setIsDraggingText(true);
        const text = strokeHistory[textIndex];
        setDragOffset({
          x: x - text.x,
          y: y - text.y
        });
      } else {
        setSelectedTextIndex(null);
      }
      return;
    }

    if (penStyle === 'text') {
      setTextPosition({ x, y });
      setIsEditingText(true);
      if (textInputRef.current) {
        textInputRef.current.style.left = `${x}px`;
        textInputRef.current.style.top = `${y}px`;
        textInputRef.current.focus();
      }
      return;
    }
    
    setIsDrawing(true);
    setCurrentStroke([{ x, y }]);
    setRedoStack([]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (isDraggingText && selectedTextIndex !== null) {
      const newHistory = [...strokeHistory];
      newHistory[selectedTextIndex] = {
        ...newHistory[selectedTextIndex],
        x: x - dragOffset.x,
        y: y - dragOffset.y
      };
      setStrokeHistory(newHistory);
      return;
    }

    if (!isDrawing || penStyle === 'laser' || penStyle === 'text' || penStyle === 'move') return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setCurrentStroke(prev => [...prev, { x, y }]);
    
    ctx.beginPath();
    configurePenStyle(ctx, penStyle, strokeColor, lineWidth);
    
    if (currentStroke.length > 0) {
      const lastPoint = currentStroke[currentStroke.length - 1];
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1.0;
  };

  const endDrawing = () => {
    if (isDraggingText) {
      setIsDraggingText(false);
      return;
    }

    if (!isDrawing || penStyle === 'laser' || penStyle === 'text' || penStyle === 'move') return;
    
    setIsDrawing(false);
    
    if (currentStroke.length > 0) {
      const newStroke = {
        points: currentStroke,
        color: strokeColor,
        width: lineWidth,
        style: penStyle
      };
      
      setStrokeHistory(prev => [...prev, newStroke]);
      setCurrentStroke([]);
    }
  };

  const handleTextSubmit = () => {
    if (textInput && textPosition) {
      const newTextStroke = {
        type: 'text',
        text: textInput,
        x: textPosition.x,
        y: textPosition.y + fontSize,
        color: strokeColor,
        fontSize: fontSize,
        width: lineWidth
      };
      
      setStrokeHistory(prev => [...prev, newTextStroke]);
      setTextInput('');
      setTextPosition(null);
      setIsEditingText(false);
      setRedoStack([]);
    }
  };

  const handleUndo = () => {
    if (strokeHistory.length === 0) return;
    
    const newHistory = [...strokeHistory];
    const removedStroke = newHistory.pop();
    
    setStrokeHistory(newHistory);
    if (removedStroke) {
      setRedoStack(prev => [...prev, removedStroke]);
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const newRedoStack = [...redoStack];
    const strokeToRestore = newRedoStack.pop();
    
    setRedoStack(newRedoStack);
    if (strokeToRestore) {
      setStrokeHistory(prev => [...prev, strokeToRestore]);
    }
  };

  const handleClear = () => {
    setStrokeHistory([]);
    setRedoStack([]);
    redrawCanvas();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className={`absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-500">Tool</span>
              <div className="flex space-x-2">
                {[
                  { id: 'pencil', icon: Pencil },
                  { id: 'pen', icon: Pen },
                  { id: 'highlighter', icon: Highlighter },
                  { id: 'laser', icon: Circle },
                  { id: 'text', icon: Type },
                  { id: 'move', icon: Move }
                ].map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPenStyle(id as any)}
                    className={`p-2 rounded-md transition-colors ${
                      penStyle === id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={id.charAt(0).toUpperCase() + id.slice(1)}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              {penStyle === 'laser' ? (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-500">Laser</span>
                  <input
                    type="color"
                    value={laserColor}
                    onChange={(e) => setLaserColor(e.target.value)}
                    className="h-6 w-6 rounded cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-500">Color</span>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="h-6 w-6 rounded cursor-pointer"
                  />
                </div>
              )}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-500">Canvas</span>
                <input
                  type="color"
                  value={canvasColor}
                  onChange={(e) => setCanvasColor(e.target.value)}
                  className="h-6 w-6 rounded cursor-pointer"
                />
              </div>
            </div>
            
            {penStyle === 'text' ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-500">Font Size</span>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs text-gray-500">{fontSize}px</span>
              </div>
            ) : penStyle !== 'laser' && penStyle !== 'move' && (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-500">Width</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs text-gray-500">{lineWidth}px</span>
              </div>
            )}
            
            {penStyle === 'highlighter' && (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-500">Opacity</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                  value={highlighterOpacity}
                  onChange={(e) => setHighlighterOpacity(parseFloat(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs text-gray-500">{Math.round(highlighterOpacity * 100)}%</span>
              </div>
            )}
            
            <div className="flex space-x-2">
              <button 
                onClick={handleUndo}
                disabled={strokeHistory.length === 0}
                className="p-2 text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                title="Undo"
              >
                <Undo2 size={16} />
              </button>
              <button 
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-2 text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                title="Redo"
              >
                <Redo2 size={16} />
              </button>
              <button 
                onClick={handleClear}
                className="p-2 text-gray-700 rounded hover:bg-gray-100"
                title="Clear"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <button
        onClick={() => setShowControls(!showControls)}
        className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md text-gray-500 hover:bg-gray-50"
      >
        {showControls ? <X size={20} /> : <Settings size={20} />}
      </button>
      
      {penStyle === 'laser' && showLaserPointer && (
        <div 
          ref={laserPointerRef}
          className="absolute w-2 h-2 rounded-full pointer-events-none transition-opacity duration-200 ease-in-out z-20" 
          style={{
            left: laserPointerPosition.x,
            top: laserPointerPosition.y,
            transform: 'translate(-50%, -50%)'
          }}
        />
      )}

      {isEditingText && (
        <textarea
          ref={textInputRef}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleTextSubmit();
            }
          }}
          onBlur={handleTextSubmit}
          className="absolute z-20 bg-transparent border border-blue-400 outline-none resize-none overflow-hidden p-1"
          style={{
            left: textPosition?.x,
            top: textPosition?.y,
            fontSize: `${fontSize}px`,
            color: strokeColor,
            minWidth: '100px',
            minHeight: '1.5em'
          }}
          autoFocus
          placeholder="Type here..."
        />
      )}
      
      <div className="flex-grow overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onTouchStart={startDrawing}
          onMouseMove={draw}
          onTouchMove={draw}
          onMouseUp={endDrawing}
          onTouchEnd={endDrawing}
          onMouseLeave={endDrawing}
          className={`w-full h-full touch-none ${
            penStyle === 'move' ? 'cursor-move' : 'cursor-crosshair'
          }`}
        />
      </div>
    </div>
  );
}

export default ScribbleApp;