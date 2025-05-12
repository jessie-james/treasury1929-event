import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EditorPosition {
  x: number;
  y: number;
  editorId: string;
  timestamp: number;
}

interface CollaborationIndicatorProps {
  editorCount: number;
  connected: boolean;
  editorPositions?: Map<string, EditorPosition>;
}

export function CollaborationIndicator({ 
  editorCount, 
  connected,
  editorPositions 
}: CollaborationIndicatorProps) {
  const [activeDot, setActiveDot] = useState(true);

  // Blinking effect for active editors
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      setActiveDot(prev => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, [connected]);

  // Get colors for active editors
  const getEditorColor = (editorId: string) => {
    // Simple hash function to generate consistent colors for editor IDs
    const hash = Array.from(editorId).reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Generate HSL color with good saturation and lightness
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 80%, 60%)`;
  };

  if (!connected) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <Users className="h-4 w-4 mr-1 opacity-50" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            <Badge variant="outline" className="flex items-center gap-1.5 py-1 border border-primary/30 bg-primary/5">
              <div className="relative">
                <Users className="h-3.5 w-3.5 text-primary" />
                <div 
                  className={`absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-green-500 ${activeDot ? 'opacity-100' : 'opacity-50'}`}
                />
              </div>
              <span className="text-xs font-medium">{editorCount} editor{editorCount !== 1 ? 's' : ''}</span>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-0 overflow-hidden">
          <div className="p-3 max-w-[250px]">
            <h4 className="font-medium text-sm mb-2">
              {editorCount > 1 
                ? `${editorCount} people are editing` 
                : `Only you are editing`}
            </h4>
            
            {editorPositions && editorPositions.size > 0 && (
              <div className="space-y-1.5 mt-2">
                {Array.from(editorPositions.entries()).map(([editorId, position]) => {
                  // Only show editors active in the last 30 seconds
                  const isActive = Date.now() - position.timestamp < 30000;
                  if (!isActive) return null;
                  
                  const color = getEditorColor(editorId);
                  
                  return (
                    <div key={editorId} className="flex items-center gap-2">
                      <div 
                        className="h-2.5 w-2.5 rounded-full" 
                        style={{ backgroundColor: color }}
                      />
                      <div className="text-xs">
                        {editorId.substring(0, 4)}... is active
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground mt-2">
              Changes are synchronized in real-time
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}