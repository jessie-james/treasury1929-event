import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, RotateCcw, Trash2, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Venue, Stage, Table } from '@shared/schema';

interface VenueLayoutDesignerProps {
  venue: Venue;
  onSave: (venueData: { venue: Venue; stages: Stage[]; tables: Table[] }) => void;
  initialStages?: Stage[];
  initialTables?: Table[];
  readonly?: boolean;
}

interface CanvasObject {
  id: string;
  type: 'venue' | 'stage' | 'table';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  data: any;
}

type WorkflowStep = 1 | 2 | 3;

export function VenueLayoutDesigner({
  venue,
  onSave,
  initialStages = [],
  initialTables = [],
  readonly = false
}: VenueLayoutDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
  const [venueObject, setVenueObject] = useState<CanvasObject | null>(null);
  const [stages, setStages] = useState<CanvasObject[]>([]);
  const [tables, setTables] = useState<CanvasObject[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  
  // Table configuration
  const [tableSize, setTableSize] = useState(8);
  const [tableType, setTableType] = useState<'full' | 'half'>('full');
  const [seatCount, setSeatCount] = useState(4);
  const [showStageLines, setShowStageLines] = useState(false);
  
  // Status
  const [status, setStatus] = useState('Welcome! Start by creating your venue boundaries.');
  
  // Mouse interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent) => {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, [canvas]);

  // Check if mouse is over an object
  const getObjectAtPosition = useCallback((x: number, y: number) => {
    // Check venue first (only if on step 1)
    if (venueObject && currentStep === 1 &&
        x >= venueObject.x && x <= venueObject.x + venueObject.width &&
        y >= venueObject.y && y <= venueObject.y + venueObject.height) {
      return venueObject;
    }
    
    // Check stages (only if on step 2)
    if (currentStep === 2) {
      for (const stage of stages) {
        if (x >= stage.x && x <= stage.x + stage.width &&
            y >= stage.y && y <= stage.y + stage.height) {
          return stage;
        }
      }
    }
    
    // Check tables (only if on step 3)
    if (currentStep === 3) {
      for (const table of tables) {
        const dimensions = getTableDimensions(table.data.tableSize);
        const tableRadius = dimensions.tableRadius;
        const centerX = table.x + tableRadius;
        const centerY = table.y + tableRadius;
        const isHalf = table.data.shape === 'half';
        
        if (isHalf) {
          // For half circle tables, include the entire table + seats area
          const seatRadius = dimensions.seatRadius;
          const gap = dimensions.gap;
          const totalRadius = tableRadius + seatRadius + gap;
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const angle = Math.atan2(y - centerY, x - centerX);
          const normalizedAngle = ((angle + Math.PI) % (2 * Math.PI));
          
          // Half circle covers bottom half (π to 2π radians) including seats
          if (distance <= totalRadius + 15 && normalizedAngle >= Math.PI && normalizedAngle <= 2 * Math.PI) {
            return table;
          }
        } else {
          // For full circle tables, include seats in selection area
          const seatRadius = dimensions.seatRadius;
          const gap = dimensions.gap;
          const totalRadius = tableRadius + seatRadius + gap;
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          if (distance <= totalRadius + 15) {
            return table;
          }
        }
      }
    }
    
    return null;
  }, [venueObject, stages, tables, currentStep]);

  // Initialize venue object
  useEffect(() => {
    if (venue.bounds) {
      setVenueObject({
        id: 'venue',
        type: 'venue',
        x: venue.bounds.x,
        y: venue.bounds.y,
        width: venue.bounds.width,
        height: venue.bounds.height,
        rotation: 0,
        data: venue
      });
    }
  }, [venue]);

  // Initialize stages and tables
  useEffect(() => {
    const stageObjects = initialStages.map(stage => ({
      id: `stage-${stage.id}`,
      type: 'stage' as const,
      x: stage.x,
      y: stage.y,
      width: stage.width,
      height: stage.height,
      rotation: stage.rotation || 0,
      data: stage
    }));
    setStages(stageObjects);

    const tableObjects = initialTables.map(table => ({
      id: `table-${table.id}`,
      type: 'table' as const,
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height,
      rotation: table.rotation || 0,
      data: { ...table, tableSize: table.tableSize || 8, shape: table.shape || 'full' }
    }));
    setTables(tableObjects);
  }, [initialStages, initialTables]);

  // Get next table number
  const getNextTableNumber = useCallback(() => {
    if (tables.length === 0) return 1;
    const existingNumbers = tables.map(t => t.data.tableNumber).sort((a, b) => a - b);
    for (let i = 1; i <= Math.max(...existingNumbers) + 1; i++) {
      if (!existingNumbers.includes(i)) return i;
    }
    return Math.max(...existingNumbers) + 1;
  }, [tables]);

  // Canvas drawing functions
  const drawVenue = useCallback((obj: CanvasObject) => {
    if (!ctx) return;
    
    ctx.save();
    ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
    ctx.rotate((obj.rotation * Math.PI) / 180);
    
    // Venue boundary
    ctx.fillStyle = 'rgba(240, 248, 255, 0.3)';
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    
    ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
    ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
    
    ctx.restore();
  }, [ctx]);

  const drawStage = useCallback((obj: CanvasObject) => {
    if (!ctx) return;
    
    ctx.save();
    ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
    ctx.rotate((obj.rotation * Math.PI) / 180);
    
    // Stage
    ctx.fillStyle = '#333';
    ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
    
    // Stage label
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE', 0, 5);
    
    // Selection highlight
    if (selectedObjects.includes(obj.id)) {
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 3;
      ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
    }
    
    ctx.restore();
  }, [ctx, selectedObjects]);

  // Get table dimensions based on your exact size configuration
  const getTableDimensions = useCallback((tableSize: number) => {
    const sizeConfig = {
      1: { tableRadius: 25, seatRadius: 8,  gap: 8  }, // Tiny
      2: { tableRadius: 30, seatRadius: 10, gap: 10 }, // Small  
      3: { tableRadius: 35, seatRadius: 12, gap: 12 }, // Compact
      4: { tableRadius: 40, seatRadius: 14, gap: 14 }, // Medium-Small
      5: { tableRadius: 45, seatRadius: 16, gap: 16 }, // Medium
      6: { tableRadius: 50, seatRadius: 18, gap: 18 }, // Medium-Large
      7: { tableRadius: 55, seatRadius: 19, gap: 19 }, // Large
      8: { tableRadius: 60, seatRadius: 20, gap: 20 }, // Extra Large (default)
      9: { tableRadius: 70, seatRadius: 22, gap: 22 }  // Jumbo
    };
    
    return sizeConfig[tableSize as keyof typeof sizeConfig] || sizeConfig[8];
  }, []);

  const drawTable = useCallback((obj: CanvasObject) => {
    if (!ctx) return;
    
    const { tableSize, shape, tableNumber, capacity } = obj.data;
    const dimensions = getTableDimensions(tableSize);
    const { tableRadius, seatRadius } = dimensions;
    const isHalf = shape === 'half';
    const isSelected = selectedObjects.includes(obj.id);
    const count = Math.max(1, Math.min(8, capacity)); // 1-8 seats allowed
    
    ctx.save();
    ctx.translate(obj.x + tableRadius, obj.y + tableRadius);
    ctx.rotate((obj.rotation * Math.PI) / 180);
    
    // Add shadow
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    // Table surface - Light gray as per your spec
    ctx.fillStyle = isSelected ? '#d0d0d0' : '#e0e0e0';
    ctx.strokeStyle = isSelected ? '#333' : '#555';
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
    
    // Table number (scale with table size)
    const fontSize = Math.max(12, Math.min(24, 10 + tableSize * 1.5));
    ctx.fillStyle = '#333'; // Dark gray text
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textY = isHalf ? -tableRadius * 0.5 : 0; // Higher for half tables
    ctx.fillText(tableNumber.toString(), 0, textY);
    
    // Draw seats around the table
    if (count > 0) {
      const seatOffset = tableRadius + seatRadius; // Seats touch table edge
      
      for (let i = 0; i < count; i++) {
        let angle;
        
        if (isHalf) {
          // Half Circle Tables - Smart positioning
          if (count === 1) {
            angle = 270; // Single seat at the back center
          } else if (count === 2) {
            const angles = [225, 315]; // 90° total spread
            angle = angles[i];
          } else if (count === 3) {
            const angles = [220, 270, 320]; // 100° total spread
            angle = angles[i];
          } else {
            // 4+ seats: use 40° spacing method
            const totalSpan = (count - 1) * 40;
            const startAngle = 270 - (totalSpan / 2);
            angle = startAngle + (i * 40);
          }
        } else {
          // Full Circle Tables - Even distribution
          angle = i * (360 / count); // Evenly spaced around 360°
        }
        
        const rad = angle * Math.PI / 180;
        const seatX = seatOffset * Math.cos(rad);
        const seatY = seatOffset * Math.sin(rad);
        
        // Add shadow for seats
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        
        // Seat circle - Green color as per your spec
        ctx.fillStyle = '#4CAF50'; // Green seat color
        ctx.strokeStyle = '#2E7D32'; // Darker green border
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
        
        // Seat number (scale with seat size)
        const seatFontSize = Math.max(8, Math.min(16, seatRadius - 4));
        ctx.fillStyle = 'white'; // White text on green seats
        ctx.font = `bold ${seatFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), seatX, seatY);
      }
    }
    
    // Selection indicator - subtle highlight as per your spec
    if (isSelected) {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      if (isHalf) {
        ctx.arc(0, 0, tableRadius + 8, Math.PI, 2 * Math.PI);
      } else {
        ctx.arc(0, 0, tableRadius + 8, 0, 2 * Math.PI);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    

    
    // Selection highlight
    if (selectedObjects.includes(obj.id)) {
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, tableRadius + 10, 0, 2 * Math.PI);
      ctx.stroke();
    }
    
    ctx.restore();
  }, [ctx, selectedObjects, showStageLines, stages]);

  // Main draw function - redraws everything including stage lines when tables move
  const draw = useCallback(() => {
    if (!canvas || !ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw venue
    if (venueObject) {
      drawVenue(venueObject);
    }
    
    // Draw stages
    stages.forEach(drawStage);
    
    // Draw tables (stage lines are drawn within each table)
    tables.forEach(drawTable);
    
    // Draw global stage lines that update with table positions
    if (showStageLines && stages.length > 0 && tables.length > 0) {
      stages.forEach(stage => {
        tables.forEach(table => {
          ctx.strokeStyle = '#8B5CF6';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.globalAlpha = 0.6;
          
          // Dynamic stage-to-table lines that update when tables move
          const stageCenterX = stage.x + stage.width / 2;
          const stageCenterY = stage.y + stage.height / 2;
          const tableCenterX = table.x + table.width / 2;
          const tableCenterY = table.y + table.height / 2;
          
          ctx.beginPath();
          ctx.moveTo(stageCenterX, stageCenterY);
          ctx.lineTo(tableCenterX, tableCenterY);
          ctx.stroke();
          
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        });
      });
    }
  }, [canvas, ctx, venueObject, stages, tables, drawVenue, drawStage, drawTable, showStageLines]);

  // Redraw when objects change
  useEffect(() => {
    draw();
  }, [draw]);

  // Action handlers
  const createVenue = useCallback(() => {
    const newVenue: CanvasObject = {
      id: 'venue',
      type: 'venue',
      x: 100,
      y: 100,
      width: 800,
      height: 500,
      rotation: 0,
      data: venue
    };
    setVenueObject(newVenue);
    setStatus('Venue created! Resize and position it as needed, then click "Next: Add Stage".');
  }, [venue]);

  const addStage = useCallback(() => {
    if (!venueObject) return;
    
    const newStage: CanvasObject = {
      id: `stage-${Date.now()}`,
      type: 'stage',
      x: venueObject.x + venueObject.width / 2 - 100,
      y: venueObject.y + 50,
      width: 200,
      height: 100,
      rotation: 0,
      data: {
        venueId: venue.id,
        name: 'Main Stage',
        x: venueObject.x + venueObject.width / 2 - 100,
        y: venueObject.y + 50,
        width: 200,
        height: 100,
        rotation: 0,
        isActive: true
      }
    };
    
    setStages(prev => [...prev, newStage]);
    setStatus('Stage added! You can resize and reposition it, then continue to tables.');
  }, [venueObject, venue.id]);

  const addTable = useCallback(() => {
    if (!venueObject) return;
    
    const tableNumber = getNextTableNumber();
    const size = Math.max(40, Math.min(120, tableSize * 10));
    
    const newTable: CanvasObject = {
      id: `table-${Date.now()}`,
      type: 'table',
      x: venueObject.x + venueObject.width / 2 - size / 2,
      y: venueObject.y + venueObject.height / 2 - size / 2,
      width: size,
      height: size,
      rotation: 0,
      data: {
        venueId: venue.id,
        tableNumber,
        capacity: seatCount,
        floor: 'main',
        x: venueObject.x + venueObject.width / 2 - size / 2,
        y: venueObject.y + venueObject.height / 2 - size / 2,
        width: size,
        height: size,
        shape: tableType,
        tableSize,
        status: 'available',
        zone: null,
        priceCategory: 'standard',
        isLocked: false,
        rotation: 0
      }
    };
    
    setTables(prev => [...prev, newTable]);
    setStatus(`Table ${tableNumber} added! Double-click tables to duplicate them.`);
  }, [venueObject, venue.id, getNextTableNumber, tableSize, seatCount, tableType]);

  const deleteSelected = useCallback(() => {
    setStages(prev => prev.filter(s => !selectedObjects.includes(s.id)));
    setTables(prev => prev.filter(t => !selectedObjects.includes(t.id)));
    setSelectedObjects([]);
    setStatus('Selected objects deleted.');
  }, [selectedObjects]);

  const selectAll = useCallback(() => {
    const allIds = [...stages.map(s => s.id), ...tables.map(t => t.id)];
    setSelectedObjects(allIds);
  }, [stages, tables]);

  // Update selected tables with current settings
  const updateSelectedTables = useCallback(() => {
    const selectedTables = selectedObjects.filter(id => tables.some(t => t.id === id));
    
    if (selectedTables.length === 0) {
      setStatus('No tables selected for update. Select a table first!');
      return;
    }
    
    const dimensions = getTableDimensions(tableSize);
    const canvasSize = dimensions.tableRadius * 2 + dimensions.seatRadius * 2 + dimensions.gap * 2;
    
    setTables(prev => prev.map(table => {
      if (selectedObjects.includes(table.id)) {
        return {
          ...table,
          width: canvasSize,
          height: canvasSize,
          data: {
            ...table.data,
            capacity: seatCount,
            shape: tableType,
            tableSize,
            width: canvasSize,
            height: canvasSize
          }
        };
      }
      return table;
    }));
    setStatus(`Updated ${selectedTables.length} table(s) - Size: ${tableSize}, Type: ${tableType}, Seats: ${seatCount}`);
  }, [selectedObjects, tables, tableSize, seatCount, tableType, getTableDimensions]);

  // Table duplication with exact configuration copying
  const duplicateTable = useCallback((originalTable: CanvasObject) => {
    if (!venueObject) return;
    
    const tableNumber = getNextTableNumber();
    const dimensions = getTableDimensions(originalTable.data.tableSize);
    const canvasSize = dimensions.tableRadius * 2 + dimensions.seatRadius * 2 + dimensions.gap * 2;
    
    const duplicatedTable: CanvasObject = {
      id: `table-${Date.now()}`,
      type: 'table',
      x: originalTable.x + 100,
      y: originalTable.y + 100,
      width: canvasSize,
      height: canvasSize,
      rotation: originalTable.rotation, // Copy exact rotation
      data: {
        venueId: venue.id,
        tableNumber,
        capacity: originalTable.data.capacity,    // Copy exact seat count
        floor: 'main',
        x: originalTable.x + 100,
        y: originalTable.y + 100,
        width: canvasSize,
        height: canvasSize,
        shape: originalTable.data.shape,          // Copy exact type
        tableSize: originalTable.data.tableSize, // Copy exact size
        status: 'available',
        zone: null,
        priceCategory: 'standard',
        isLocked: false,
        rotation: originalTable.rotation
      }
    };
    
    setTables(prev => [...prev, duplicatedTable]);
    setStatus(`Table ${tableNumber} duplicated from Table ${originalTable.data.tableNumber} (Size: ${originalTable.data.tableSize}, Type: ${originalTable.data.shape}, Seats: ${originalTable.data.capacity})!`);
  }, [venueObject, venue.id, getNextTableNumber, getTableDimensions]);

  // Rotate selected tables
  const rotateSelectedTables = useCallback((direction: 'left' | 'right') => {
    const selectedTables = selectedObjects.filter(id => tables.some(t => t.id === id));
    
    if (selectedTables.length === 0) {
      setStatus('No tables selected for rotation. Select a table first!');
      return;
    }
    
    const rotationAmount = direction === 'left' ? -15 : 15;
    
    setTables(prev => prev.map(table => {
      if (selectedObjects.includes(table.id)) {
        const newRotation = (table.rotation + rotationAmount) % 360;
        return {
          ...table,
          rotation: newRotation,
          data: {
            ...table.data,
            rotation: newRotation
          }
        };
      }
      return table;
    }));
    
    setStatus(`Rotated ${selectedTables.length} table(s) ${direction === 'left' ? 'counter-clockwise' : 'clockwise'} by 15°`);
  }, [selectedObjects, tables]);

  const resetAll = useCallback(() => {
    setVenueObject(null);
    setStages([]);
    setTables([]);
    setSelectedObjects([]);
    setCurrentStep(1);
    setStatus('Everything reset. Start by creating your venue boundaries.');
  }, []);

  const handleSave = useCallback(() => {
    if (!venueObject) return;
    
    const venueData = {
      ...venue,
      bounds: {
        x: venueObject.x,
        y: venueObject.y,
        width: venueObject.width,
        height: venueObject.height
      }
    };
    
    const stagesData = stages.map(s => s.data);
    const tablesData = tables.map(t => ({
      ...t.data,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      rotation: t.rotation
    }));
    
    onSave({ venue: venueData, stages: stagesData, tables: tablesData });
  }, [venue, venueObject, stages, tables, onSave]);

  // Update status based on current step
  useEffect(() => {
    switch (currentStep) {
      case 1:
        setStatus('Welcome! Start by creating your venue boundaries.');
        break;
      case 2:
        setStatus('Decide if you want to add a stage to your venue.');
        break;
      case 3:
        setStatus('Now you can add tables to your venue. Double-click tables to duplicate them.');
        break;
    }
  }, [currentStep]);

  const stepIsActive = (step: WorkflowStep) => step === currentStep;
  const stepIsCompleted = (step: WorkflowStep) => step < currentStep || (step === 2 && currentStep === 3 && stages.length === 0);

  return (
    <div className="flex gap-6 p-6 max-w-7xl mx-auto">
      {/* Control Panel */}
      <div className="w-80 space-y-4">
        {/* Step 1: Create Venue */}
        <Card className={cn(
          "border-2",
          stepIsActive(1) && "border-blue-500 bg-blue-50",
          stepIsCompleted(1) && "border-green-500 bg-green-50"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white",
                stepIsCompleted(1) ? "bg-green-500" : "bg-blue-500"
              )}>
                1
              </div>
              Create Your Venue Space
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={createVenue} 
              disabled={readonly || currentStep !== 1}
              className="w-full"
            >
              {venueObject ? 'Venue Created' : 'Create Venue Rectangle'}
            </Button>
            
            {venueObject && currentStep === 1 && (
              <div className="space-y-2 p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium">Venue Controls:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Input 
                      type="number" 
                      value={venueObject.width}
                      onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        setVenueObject(prev => prev ? { 
                          ...prev, 
                          width: newWidth,
                          data: { ...prev.data, width: newWidth }
                        } : null);
                      }}
                      min={200}
                      max={1000}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Input 
                      type="number" 
                      value={venueObject.height}
                      onChange={(e) => {
                        const newHeight = Number(e.target.value);
                        setVenueObject(prev => prev ? { 
                          ...prev, 
                          height: newHeight,
                          data: { ...prev.data, height: newHeight }
                        } : null);
                      }}
                      min={200}
                      max={700}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <Button 
              onClick={() => setCurrentStep(2)} 
              disabled={!venueObject}
              variant="outline"
              className="w-full"
            >
              Continue to Stages
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Add Stage */}
        <Card className={cn(
          "border-2",
          stepIsActive(2) && "border-blue-500 bg-blue-50",
          stepIsCompleted(2) && "border-green-500 bg-green-50"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white",
                stepIsCompleted(2) ? "bg-green-500" : "bg-blue-500"
              )}>
                2
              </div>
              Add Stage (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => setCurrentStep(1)}
              variant="secondary"
              className="w-full"
            >
              ← Back: Edit Venue
            </Button>
            <Button 
              onClick={addStage}
              disabled={readonly || currentStep !== 2 || !venueObject || stages.length > 0}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {stages.length > 0 ? 'Stage Added' : 'Add Stage'}
            </Button>
            
            {stages.length > 0 && currentStep === 2 && (
              <div className="space-y-2 p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium">Stage Controls:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Input 
                      type="number" 
                      value={stages[0]?.width || 200}
                      onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        setStages(prev => prev.map(stage => ({ 
                          ...stage, 
                          width: newWidth, 
                          data: { ...stage.data, width: newWidth }
                        })));
                      }}
                      min={50}
                      max={500}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Input 
                      type="number" 
                      value={stages[0]?.height || 100}
                      onChange={(e) => {
                        const newHeight = Number(e.target.value);
                        setStages(prev => prev.map(stage => ({ 
                          ...stage, 
                          height: newHeight, 
                          data: { ...stage.data, height: newHeight }
                        })));
                      }}
                      min={50}
                      max={300}
                      className="h-8"
                    />
                  </div>
                </div>
                <Button 
                  onClick={() => setStages([])}
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Remove Stage
                </Button>
              </div>
            )}
            
            <Button 
              onClick={() => setCurrentStep(3)}
              disabled={currentStep !== 2}
              variant="outline"
              className="w-full"
            >
              {stages.length > 0 ? 'Continue to Tables' : 'Skip (No Stage)'}
            </Button>
          </CardContent>
        </Card>

        {/* Step 3: Add Tables */}
        <Card className={cn(
          "border-2",
          stepIsActive(3) && "border-blue-500 bg-blue-50",
          stepIsCompleted(3) && "border-green-500 bg-green-50"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white",
                stepIsCompleted(3) ? "bg-green-500" : "bg-blue-500"
              )}>
                3
              </div>
              Design Table Layout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setCurrentStep(2)}
              variant="secondary"
              className="w-full"
            >
              ← Back: Edit Stage
            </Button>
            
            <Separator />
            
            <div className="space-y-3">
              <div>
                <Label>Table Size</Label>
                <Select value={tableSize.toString()} onValueChange={(v) => setTableSize(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9].map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        Size {size} {size <= 3 ? '(Small)' : size <= 6 ? '(Medium)' : '(Large)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Table Type</Label>
                <Select value={tableType} onValueChange={(v: 'full' | 'half') => setTableType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Circle</SelectItem>
                    <SelectItem value="half">Half Circle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Seat Count</Label>
                <Input 
                  type="number" 
                  value={seatCount} 
                  onChange={(e) => setSeatCount(Number(e.target.value))}
                  min={1}
                  max={12}
                />
              </div>
              
              {selectedObjects.length > 0 && selectedObjects.some(id => tables.some(t => t.id === id)) && (
                <div>
                  <Label>Rotate Selected Tables</Label>
                  <div className="flex gap-2 mt-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setTables(prev => prev.map(table => 
                          selectedObjects.includes(table.id) 
                            ? { 
                                ...table, 
                                rotation: (table.rotation - 15) % 360,
                                data: { ...table.data, rotation: (table.data.rotation - 15) % 360 }
                              }
                            : table
                        ));
                      }}
                    >
                      ↺ -15°
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setTables(prev => prev.map(table => 
                          selectedObjects.includes(table.id) 
                            ? { 
                                ...table, 
                                rotation: (table.rotation + 15) % 360,
                                data: { ...table.data, rotation: (table.data.rotation + 15) % 360 }
                              }
                            : table
                        ));
                      }}
                    >
                      ↻ +15°
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="stage-lines"
                  checked={showStageLines}
                  onCheckedChange={(checked) => setShowStageLines(!!checked)}
                />
                <Label htmlFor="stage-lines">Show Stage Lines</Label>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Button 
                onClick={addTable}
                disabled={readonly || currentStep !== 3 || !venueObject}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </Button>
              
              <Button 
                onClick={updateSelectedTables}
                disabled={readonly || selectedObjects.filter(id => tables.some(t => t.id === id)).length === 0}
                variant="outline"
                className="w-full mb-2"
              >
                Update Selected Tables
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={deleteSelected}
                  disabled={readonly || selectedObjects.length === 0}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
                <Button 
                  onClick={selectAll}
                  disabled={readonly || (stages.length === 0 && tables.length === 0)}
                  variant="outline"
                  size="sm"
                >
                  <MousePointer2 className="w-4 h-4 mr-1" />
                  Select All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Final Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gray-500">
                🔄
              </div>
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!readonly && (
              <>
                <Button 
                  onClick={handleSave}
                  disabled={!venueObject}
                  className="w-full"
                >
                  Save Layout
                </Button>
                <Button 
                  onClick={resetAll}
                  variant="destructive"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Everything
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Canvas Area */}
      <div className="flex-1">
        <div className="border rounded-lg shadow-sm bg-white">
          <canvas
            ref={canvasRef}
            width={1000}
            height={700}
            className="block border rounded-lg cursor-crosshair"
            onMouseDown={(e) => {
              const pos = getMousePos(e);
              const obj = getObjectAtPosition(pos.x, pos.y);
              
              if (obj) {
                setIsDragging(true);
                setDragStartPos(pos);
                setDraggedObjectId(obj.id);
                
                // Select the clicked object
                if (e.shiftKey) {
                  // Shift+click: toggle selection
                  setSelectedObjects(prev => 
                    prev.includes(obj.id) 
                      ? prev.filter(id => id !== obj.id)
                      : [...prev, obj.id]
                  );
                } else {
                  // Regular click: select only this object (unless it's already selected with others)
                  if (selectedObjects.includes(obj.id) && selectedObjects.length > 1) {
                    // Keep multiple selection if clicking on an already selected object
                  } else {
                    setSelectedObjects([obj.id]);
                  }
                }
              } else {
                // Click on empty space: clear selection
                setSelectedObjects([]);
              }
            }}
            onDoubleClick={(e) => {
              if (currentStep !== 3) return;
              
              const pos = getMousePos(e);
              const clickedTable = tables.find(table => {
                return pos.x >= table.x && pos.x <= table.x + table.width &&
                       pos.y >= table.y && pos.y <= table.y + table.height;
              });
              
              if (clickedTable) {
                duplicateTable(clickedTable);
              }
            }}
            onMouseMove={(e) => {
              if (!isDragging || !draggedObjectId) return;
              
              const pos = getMousePos(e);
              const deltaX = pos.x - dragStartPos.x;
              const deltaY = pos.y - dragStartPos.y;
              
              if (draggedObjectId === 'venue' && venueObject && currentStep === 1) {
                setVenueObject(prev => prev ? {
                  ...prev,
                  x: Math.max(0, prev.x + deltaX),
                  y: Math.max(0, prev.y + deltaY)
                } : null);
              } else {
                // Update stages
                setStages(prev => prev.map(stage => 
                  stage.id === draggedObjectId 
                    ? { ...stage, x: stage.x + deltaX, y: stage.y + deltaY }
                    : stage
                ));
                
                // Update tables
                setTables(prev => prev.map(table => 
                  table.id === draggedObjectId 
                    ? { 
                        ...table, 
                        x: Math.max(0, table.x + deltaX), 
                        y: Math.max(0, table.y + deltaY),
                        data: { 
                          ...table.data, 
                          x: Math.max(0, table.data.x + deltaX), 
                          y: Math.max(0, table.data.y + deltaY) 
                        }
                      }
                    : table
                ));
              }
              
              setDragStartPos(pos);
            }}
            onMouseUp={() => {
              setIsDragging(false);
              setDraggedObjectId(null);
            }}
          />
        </div>
        
        {/* Status Bar */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-center text-blue-800 font-medium">{status}</p>
        </div>
        
        {/* Info */}
        {selectedObjects.length > 0 && (
          <div className="mt-2 p-3 bg-gray-50 border rounded-lg">
            <p className="text-sm text-gray-600">
              Selected: {selectedObjects.length} object(s)
              {tables.length > 0 && ` • Tables: ${tables.length}`}
              {stages.length > 0 && ` • Stages: ${stages.length}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}