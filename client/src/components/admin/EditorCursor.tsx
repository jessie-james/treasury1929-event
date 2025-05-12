import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface EditorCursorProps {
  editorId: string;
  position: { x: number; y: number };
  zIndex?: number;
}

export function EditorCursor({ editorId, position, zIndex = 1000 }: EditorCursorProps) {
  const [visible, setVisible] = useState(true);
  
  // Get a color based on editor ID (simple hash function)
  const getEditorColor = (id: string) => {
    const hash = Array.from(id).reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Generate HSL color with good saturation and lightness
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 80%, 60%)`;
  };
  
  // Auto-hide cursor after 5 seconds of inactivity
  useEffect(() => {
    setVisible(true);
    
    const timer = setTimeout(() => {
      setVisible(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [position]);
  
  if (!visible) return null;
  
  const color = getEditorColor(editorId);
  const shortId = editorId.substring(0, 4);
  
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ 
        left: position.x,
        top: position.y,
        zIndex
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Cursor */}
      <div className="relative">
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ 
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
            transform: 'translate(-4px, -4px)' 
          }}
        >
          <path 
            d="M1 1L11 21L14 14L21 11L1 1Z" 
            fill={color} 
            stroke="white" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        
        {/* Editor ID Label */}
        <div 
          className="absolute left-4 top-0 px-1.5 py-0.5 text-xs text-white rounded-sm whitespace-nowrap"
          style={{ 
            backgroundColor: color,
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}
        >
          {shortId}
        </div>
      </div>
    </motion.div>
  );
}