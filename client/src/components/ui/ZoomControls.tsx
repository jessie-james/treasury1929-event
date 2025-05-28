import { ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleTooltips?: () => void;
  showTooltips?: boolean;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleTooltips,
  showTooltips,
  minZoom = 0.5,
  maxZoom = 3,
  className = ''
}: ZoomControlsProps) {
  const zoomPercentage = Math.round(zoom * 100);
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 bg-white rounded-lg shadow-md border p-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className="h-8 w-8 rounded-md"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <Badge variant="outline" className="text-xs px-2 py-1 min-w-[50px] text-center">
          {zoomPercentage}%
        </Badge>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className="h-8 w-8 rounded-md"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onReset}
          className="h-8 w-8 rounded-md"
          aria-label="Reset zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      
      {onToggleTooltips && (
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleTooltips}
          className={`h-8 w-8 rounded-md ${showTooltips ? 'bg-blue-50 border-blue-200' : ''}`}
          aria-label="Toggle tooltips"
        >
          <Info className={`h-4 w-4 ${showTooltips ? 'text-blue-500' : ''}`} />
        </Button>
      )}
    </div>
  );
}

export function FloatingZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleTooltips,
  showTooltips,
  minZoom = 0.5,
  maxZoom = 3,
  className = ''
}: ZoomControlsProps) {
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <div className={`absolute right-4 top-4 flex flex-col gap-2 z-10 ${className}`}>
      <Button
        variant="secondary"
        size="icon"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        className="rounded-full w-10 h-10 bg-white shadow-md border hover:bg-gray-50"
        aria-label="Zoom in"
      >
        <ZoomIn className="h-5 w-5" />
      </Button>
      
      <Button
        variant="secondary"
        size="icon"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        className="rounded-full w-10 h-10 bg-white shadow-md border hover:bg-gray-50"
        aria-label="Zoom out"
      >
        <ZoomOut className="h-5 w-5" />
      </Button>
      
      <Button
        variant="secondary"
        size="icon"
        onClick={onReset}
        className="rounded-full w-10 h-10 bg-white shadow-md border hover:bg-gray-50"
        aria-label="Reset zoom"
      >
        <RotateCcw className="h-5 w-5" />
      </Button>
      
      {onToggleTooltips && (
        <Button
          variant="secondary"
          size="icon"
          onClick={onToggleTooltips}
          className={`rounded-full w-10 h-10 shadow-md border hover:bg-gray-50 ${
            showTooltips ? 'bg-blue-50 border-blue-200' : 'bg-white'
          }`}
          aria-label="Toggle tooltips"
        >
          <Info className={`h-5 w-5 ${showTooltips ? 'text-blue-500' : ''}`} />
        </Button>
      )}
    </div>
  );
}