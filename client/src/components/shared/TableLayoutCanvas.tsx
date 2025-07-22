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

  // ELDERLY-FRIENDLY: EXTRA large canvas with huge tables for 70+ users on phones
  const venueDimensions = useMemo(() => {
    if (!tables || tables.length === 0) {
      return { width: 2000, height: 1400 };
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

    // ELDERLY-FRIENDLY: Much larger canvas with huge spacing for big tables
    return {
      width: Math.max(maxX - minX + 600, 2000), // Much bigger with massive padding
      height: Math.max(maxY - minY + 500, 1400), // Much taller for huge tables
    };
  }, [tables]);

  // ELDERLY-FRIENDLY: MUCH larger table sizes for 70+ users on phones (44px minimum touch target)
  const getTableDimensions = useCallback((tableSize: number) => {
    const sizeConfig = {
      1: { tableRadius: 50, seatRadius: 12, gap: 12 }, // Small - 100px diameter (was 25)
      2: { tableRadius: 65, seatRadius: 15, gap: 15 }, // Medium - 130px diameter (was 32)  
      3: { tableRadius: 80, seatRadius: 18, gap: 18 }, // Large - 160px diameter (was 38)
      4: { tableRadius: 95, seatRadius: 20, gap: 20 }, // Extra Large - 190px diameter (was 45)
      5: { tableRadius: 110, seatRadius: 22, gap: 22 } // XXL - 220px diameter (was 52)
    };
    
    return sizeConfig[tableSize as keyof typeof sizeConfig] || sizeConfig[4];
  }, []);

  // EXACT same drawTable function as VenueLayoutDesigner
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
    
    ctx.save();
    ctx.translate(table.x + tableRadius, table.y + tableRadius);
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

  // Draw stage function
  const drawStage = useCallback((ctx: CanvasRenderingContext2D, stage: VenueStage) => {
    ctx.save();
    ctx.translate(stage.x + stage.width / 2, stage.y + stage.height / 2);
    ctx.rotate((stage.rotation * Math.PI) / 180);
    
    // Stage
    ctx.fillStyle = '#333';
    ctx.fillRect(-stage.width / 2, -stage.height / 2, stage.width, stage.height);
    
    // Stage label
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE', 0, 5);
    
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
    
    // Find clicked table
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
      const centerX = table.x + tableRadius;
      const centerY = table.y + tableRadius;
      
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