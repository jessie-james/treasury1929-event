import React, { useRef, useEffect, useMemo, useCallback } from 'react';

interface VenueTable {
  id: number;
  tableNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  shape: 'half' | 'full';
  rotation: number;
  status: 'available' | 'sold' | 'hold';
  tableSize?: number;
}

interface VenueStage {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface Props {
  tables: VenueTable[];
  stages: VenueStage[];
  isEditorMode?: boolean;
  onTableSelect?: (table: VenueTable) => void;
  selectedTables?: number[];
  className?: string;
}

export function TableLayoutCanvas({ 
  tables, 
  stages, 
  isEditorMode = false, 
  onTableSelect,
  selectedTables,
  className 
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ELDERLY-FRIENDLY: Scale up the entire venue layout for mobile accessibility
  const venueDimensions = useMemo(() => {
    if (!tables || tables.length === 0) {
      return { width: 1500, height: 1000 };
    }

    const positions = tables.map(table => ({
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height
    }));

    const minX = Math.min(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxX = Math.max(...positions.map(p => p.x + p.width));
    const maxY = Math.max(...positions.map(p => p.y + p.height));

    // Scale up the venue proportionally for mobile - preserve spacing ratios
    const baseWidth = maxX - minX + 200;
    const baseHeight = maxY - minY + 150;
    const mobileScale = 1.5; // Scale everything up by 1.5x for mobile
    
    return {
      width: Math.max(baseWidth * mobileScale, 1500),
      height: Math.max(baseHeight * mobileScale, 1000),
    };
  }, [tables]);

  // ELDERLY-FRIENDLY: Larger table visuals while preserving venue spacing
  const getTableDimensions = useCallback((tableSize: number) => {
    // Base sizes that match venue designer proportions
    const baseSizeConfig = {
      1: { tableRadius: 18, seatRadius: 6,  gap: 6  }, // Small - 40px
      2: { tableRadius: 22, seatRadius: 7,  gap: 7  }, // Medium - 60px  
      3: { tableRadius: 26, seatRadius: 9,  gap: 9  }, // Large - 72px
      4: { tableRadius: 30, seatRadius: 10, gap: 10 }, // Extra Large - 88px
      5: { tableRadius: 34, seatRadius: 11, gap: 11 }  // XXL - for very large tables
    };
    
    // Scale up for mobile accessibility (2.2x for easy tapping)
    const mobileScale = 2.2;
    const baseConfig = baseSizeConfig[tableSize as keyof typeof baseSizeConfig] || baseSizeConfig[4];
    
    return {
      tableRadius: baseConfig.tableRadius * mobileScale,
      seatRadius: baseConfig.seatRadius * mobileScale,
      gap: baseConfig.gap * mobileScale
    };
  }, []);

  // MOBILE-FRIENDLY: Scale table positions while preserving venue spacing
  const drawTable = useCallback((ctx: CanvasRenderingContext2D, table: VenueTable) => {
    const isSelected = selectedTables && selectedTables.includes(table.id);
    const isAvailable = table.status === 'available';
    const isOnHold = table.status === 'hold';
    const isSold = table.status === 'sold';
    const isHalf = table.shape === 'half';
    
    console.log(`🎨 Drawing table ${table.tableNumber}:`, { isSelected, selectedTables, tableId: table.id });
    
    // Use tableSize from database or calculate from width/height as fallback
    let tableSize = table.tableSize || 4;
    if (!table.tableSize && table.width && table.height) {
      const avgSize = (table.width + table.height) / 2;
      if (avgSize <= 45) tableSize = 1;
      else if (avgSize <= 65) tableSize = 2;
      else if (avgSize <= 75) tableSize = 3;
      else if (avgSize <= 90) tableSize = 4;
      else tableSize = 5;
    }
    
    const dimensions = getTableDimensions(tableSize);
    const { tableRadius, seatRadius } = dimensions;
    const count = Math.max(1, Math.min(8, table.capacity));
    
    // Scale positions proportionally for mobile (same scale as canvas)
    const mobileScale = 1.5;
    const scaledX = table.x * mobileScale;
    const scaledY = table.y * mobileScale;
    
    ctx.save();
    ctx.translate(scaledX + tableRadius, scaledY + tableRadius);
    ctx.rotate((table.rotation * Math.PI) / 180);
    
    // Add shadow
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    // Table surface - exact colors as VenueLayoutDesigner
    if (isSold) {
      ctx.fillStyle = '#ef4444'; // Red for sold
      ctx.strokeStyle = '#dc2626';
    } else if (isOnHold) {
      ctx.fillStyle = '#f59e0b'; // Orange for on hold
      ctx.strokeStyle = '#d97706';
    } else if (isSelected) {
      ctx.fillStyle = '#3b82f6'; // Blue for selected - more visible
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 4; // Thick border for selected
    } else {
      ctx.fillStyle = '#22c55e'; // Green for available
      ctx.strokeStyle = '#16a34a';
    }
    
    ctx.lineWidth = 2;
    
    if (isHalf) {
      // Half circle table - positioned at bottom
      ctx.beginPath();
      ctx.arc(0, 0, tableRadius, Math.PI, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Full circle table
      ctx.beginPath();
      ctx.arc(0, 0, tableRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    
    // Reset shadow for text and seats
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // ELDERLY-FRIENDLY: Much larger, more visible table numbers for 70+ users
    const fontSize = Math.max(24, Math.min(48, 15 + tableSize * 3)); // Doubled font size
    ctx.fillStyle = 'white'; // White text for better contrast
    ctx.strokeStyle = '#333'; // Dark outline for readability
    ctx.lineWidth = 3;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textY = isHalf ? -tableRadius * 0.5 : 0;
    
    // Draw text with outline for maximum visibility
    ctx.strokeText(table.tableNumber.toString(), 0, textY);
    ctx.fillText(table.tableNumber.toString(), 0, textY);
    
    // Draw seats around the table
    if (count > 0) {
      const seatOffset = tableRadius + seatRadius;
      
      for (let i = 0; i < count; i++) {
        let angle;
        
        if (isHalf) {
          // Half Circle Tables - Smart positioning
          if (count === 1) {
            angle = 270;
          } else if (count === 2) {
            const angles = [225, 315];
            angle = angles[i];
          } else if (count === 3) {
            const angles = [220, 270, 320];
            angle = angles[i];
          } else {
            // 4+ seats: use 40° spacing method
            const totalSpan = (count - 1) * 40;
            const startAngle = 270 - (totalSpan / 2);
            angle = startAngle + (i * 40);
          }
        } else {
          // Full Circle Tables - Even distribution
          angle = i * (360 / count);
        }
        
        const rad = angle * Math.PI / 180;
        const seatX = seatOffset * Math.cos(rad);
        const seatY = seatOffset * Math.sin(rad);
        
        // Add shadow for seats
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        
        // Seat circle - Grey color
        ctx.fillStyle = '#6B7280';
        ctx.strokeStyle = '#4B5563';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.arc(seatX, seatY, seatRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Reset shadow for seat text
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Seat number - EXACT same as VenueLayoutDesigner
        const seatFontSize = Math.max(8, Math.min(16, seatRadius - 4));
        ctx.fillStyle = 'white';
        ctx.font = `bold ${seatFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), seatX, seatY);
      }
    }
    
    // Selection highlight
    if (isSelected) {
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, tableRadius + 10, 0, 2 * Math.PI);
      ctx.stroke();
    }
    
    ctx.restore();
  }, [selectedTables, getTableDimensions]);

  // Draw stage function with scaled positions
  const drawStage = useCallback((ctx: CanvasRenderingContext2D, stage: VenueStage) => {
    const mobileScale = 1.5;
    const scaledX = stage.x * mobileScale;
    const scaledY = stage.y * mobileScale;
    const scaledWidth = stage.width * mobileScale;
    const scaledHeight = stage.height * mobileScale;
    
    ctx.save();
    ctx.translate(scaledX + scaledWidth / 2, scaledY + scaledHeight / 2);
    ctx.rotate((stage.rotation * Math.PI) / 180);
    
    // Stage
    ctx.fillStyle = '#333';
    ctx.fillRect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
    
    // Stage label (larger for mobile)
    ctx.fillStyle = 'white';
    ctx.font = '21px Arial'; // Scaled up from 14px
    ctx.textAlign = 'center';
    ctx.fillText('STAGE', 0, 8);
    
    ctx.restore();
  }, []);

  // Main draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stages
    stages.forEach(stage => drawStage(ctx, stage));
    
    // Draw tables
    tables.forEach(table => drawTable(ctx, table));
    
  }, [tables, stages, drawTable, drawStage, selectedTables]);

  // Handle canvas click for table selection - FIXED click detection
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onTableSelect || isEditorMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    console.log('🖱️ Click detected:', { x, y, canvasWidth: canvas.width, canvasHeight: canvas.height });
    
    // Find clicked table using scaled positions
    const mobileScale = 1.5;
    for (const table of tables) {
      let tableSize = table.tableSize || 4;
      if (!table.tableSize && table.width && table.height) {
        const avgSize = (table.width + table.height) / 2;
        if (avgSize <= 45) tableSize = 1;
        else if (avgSize <= 65) tableSize = 2;
        else if (avgSize <= 75) tableSize = 3;
        else if (avgSize <= 90) tableSize = 4;
        else tableSize = 5;
      }
      
      const dimensions = getTableDimensions(tableSize);
      const tableRadius = dimensions.tableRadius;
      
      // Use scaled positions (same as drawing function)
      const scaledX = table.x * mobileScale;
      const scaledY = table.y * mobileScale;
      const centerX = scaledX + tableRadius;
      const centerY = scaledY + tableRadius;
      
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      console.log(`📍 Table ${table.tableNumber}: center(${centerX}, ${centerY}), radius: ${tableRadius}, distance: ${distance}`);
      
      if (distance <= tableRadius + 15) { // Add tolerance
        console.log(`✅ Table ${table.tableNumber} clicked!`, table);
        if (table.status === 'available') {
          onTableSelect(table);
        }
        break;
      }
    }
  }, [tables, onTableSelect, isEditorMode, getTableDimensions, selectedTables]);

  // Draw when data changes
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={venueDimensions.width}
      height={venueDimensions.height}
      onClick={handleCanvasClick}
      className={className}
      style={{
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        cursor: isEditorMode ? 'default' : 'pointer',
        maxWidth: '100%',
        height: 'auto',
        display: 'block',
        backgroundColor: 'white'
      }}
    />
  );
}