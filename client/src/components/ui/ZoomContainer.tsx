import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ZoomContainerProps {
  children: React.ReactNode;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  onZoomChange?: (zoom: number) => void;
  className?: string;
}

export function ZoomContainer({
  children,
  minZoom = 0.5,
  maxZoom = 3,
  initialZoom = 1,
  onZoomChange,
  className = ''
}: ZoomContainerProps) {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const updateZoom = useCallback((newZoom: number, centerX?: number, centerY?: number) => {
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
    
    if (centerX !== undefined && centerY !== undefined && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const containerCenterX = rect.width / 2;
      const containerCenterY = rect.height / 2;
      
      // Calculate the offset from container center to zoom point
      const offsetX = centerX - containerCenterX;
      const offsetY = centerY - containerCenterY;
      
      // Adjust pan to keep the zoom point centered
      const zoomFactor = clampedZoom / zoom;
      setPan(prev => ({
        x: prev.x - offsetX * (zoomFactor - 1),
        y: prev.y - offsetY * (zoomFactor - 1)
      }));
    }
    
    setZoom(clampedZoom);
    onZoomChange?.(clampedZoom);
  }, [zoom, minZoom, maxZoom, onZoomChange]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      updateZoom(zoom + delta, centerX, centerY);
    }
  }, [zoom, updateZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ 
        x: touch.clientX - pan.x, 
        y: touch.clientY - pan.y 
      });
    }
  }, [pan]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        container.removeEventListener('wheel', handleWheel);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [handleWheel, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const resetZoom = useCallback(() => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
    onZoomChange?.(initialZoom);
  }, [initialZoom, onZoomChange]);

  const zoomIn = useCallback(() => {
    updateZoom(zoom + 0.2);
  }, [zoom, updateZoom]);

  const zoomOut = useCallback(() => {
    updateZoom(zoom - 0.2);
  }, [zoom, updateZoom]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          userSelect: 'none'
        }}
      >
        {children}
      </div>
      
      {/* Expose zoom controls for parent components */}
      <div style={{ display: 'none' }}>
        <button onClick={zoomIn} data-testid="zoom-in" />
        <button onClick={zoomOut} data-testid="zoom-out" />
        <button onClick={resetZoom} data-testid="zoom-reset" />
        <span data-testid="zoom-level">{zoom}</span>
      </div>
    </div>
  );
}

// Hook to access zoom controls from parent components
export function useZoomControls(containerRef: React.RefObject<HTMLDivElement>) {
  const zoomIn = useCallback(() => {
    containerRef.current?.querySelector('[data-testid="zoom-in"]')?.dispatchEvent(new Event('click'));
  }, [containerRef]);

  const zoomOut = useCallback(() => {
    containerRef.current?.querySelector('[data-testid="zoom-out"]')?.dispatchEvent(new Event('click'));
  }, [containerRef]);

  const resetZoom = useCallback(() => {
    containerRef.current?.querySelector('[data-testid="zoom-reset"]')?.dispatchEvent(new Event('click'));
  }, [containerRef]);

  const getZoomLevel = useCallback(() => {
    const element = containerRef.current?.querySelector('[data-testid="zoom-level"]');
    return element ? parseFloat(element.textContent || '1') : 1;
  }, [containerRef]);

  return { zoomIn, zoomOut, resetZoom, getZoomLevel };
}