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
  
  // Drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const getObjectAtPosition = useCallback((x: number, y: number): CanvasObject | null => {
    // Check venue boundary (only if on step 1)
    if (currentStep === 1 && venueObject) {
      if (x >= venueObject.x && x <= venueObject.x + venueObject.width &&
          y >= venueObject.y && y <= venueObject.y + venueObject.height) {
        return venueObject;
      }
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
        // Use table size for better click detection
        const tableSize = Math.max(40, Math.min(120, table.data.tableSize * 10));
        const centerX = table.x + tableSize / 2;
        const centerY = table.y + tableSize / 2;
        const radius = tableSize / 2 + 5; // Add 5px buffer for easier clicking
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius) {
          return table;
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
        data: venue.bounds
      });
    }
  }, [venue.bounds]);

  // Initialize stages and tables from props
  useEffect(() => {
    if (initialStages.length > 0) {
      const stageObjects = initialStages.map(stage => ({
        id: stage.id.toString(),
        type: 'stage' as const,
        x: stage.x,
        y: stage.y,
        width: stage.width,
        height: stage.height,
        rotation: stage.rotation || 0,
        data: stage
      }));
      setStages(stageObjects);
    }

    if (initialTables.length > 0) {
      const tableObjects = initialTables.map(table => ({
        id: table.id.toString(),
        type: 'table' as const,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        rotation: table.rotation || 0,
        data: table
      }));
      setTables(tableObjects);
    }
  }, [initialStages, initialTables]);

  const drawVenue = useCallback((obj: CanvasObject) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = selectedObjects.includes(obj.id) ? '#dc2626' : '#374151';
    ctx.lineWidth = selectedObjects.includes(obj.id) ? 3 : 2;
    ctx.setLineDash([]);
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    
    // Add venue label
    ctx.fillStyle = '#374151';
    ctx.font = '14px Arial';
    ctx.fillText('Venue Boundary', obj.x + 5, obj.y + 20);
  }, [selectedObjects]);

  const drawStage = useCallback((obj: CanvasObject) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = selectedObjects.includes(obj.id) ? '#dc2626' : '#6366f1';
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE', obj.x + obj.width / 2, obj.y + obj.height / 2 + 4);
    ctx.textAlign = 'left';
  }, [selectedObjects]);

  const drawTable = useCallback((obj: CanvasObject) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tableSize = Math.max(40, Math.min(120, obj.data.tableSize * 10));
    const centerX = obj.x + tableSize / 2;
    const centerY = obj.y + tableSize / 2;
    const radius = tableSize / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((obj.rotation * Math.PI) / 180);

    // Draw table circle
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.fillStyle = obj.data.status === 'available' ? '#10b981' : 
                   obj.data.status === 'occupied' ? '#ef4444' : '#6b7280';
    ctx.fill();
    
    if (selectedObjects.includes(obj.id)) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw table number
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(obj.data.tableNumber?.toString() || 'T', 0, 4);
    ctx.textAlign = 'left';

    ctx.restore();
  }, [selectedObjects]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (let x = 0; x <= canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw venue boundary
    if (venueObject) {
      drawVenue(venueObject);
    }

    // Draw stages
    stages.forEach(stage => drawStage(stage));

    // Draw tables
    tables.forEach(table => drawTable(table));

    // Draw stage sight lines if enabled
    if (showStageLines && stages.length > 0 && tables.length > 0) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      stages.forEach(stage => {
        const stageCenterX = stage.x + stage.width / 2;
        const stageCenterY = stage.y + stage.height / 2;
        
        tables.forEach(table => {
          const tableCenterX = table.x + table.width / 2;
          const tableCenterY = table.y + table.height / 2;
          
          ctx.beginPath();
          ctx.moveTo(stageCenterX, stageCenterY);
          ctx.lineTo(tableCenterX, tableCenterY);
          ctx.stroke();
        });
      });
    }
  }, [venueObject, stages, tables, selectedObjects, showStageLines, drawVenue, drawStage, drawTable]);

  useEffect(() => {
    draw();
  }, [draw]);

  const createVenue = () => {
    if (venueObject) return;
    
    const newVenue: CanvasObject = {
      id: 'venue',
      type: 'venue',
      x: 100,
      y: 100,
      width: 800,
      height: 500,
      rotation: 0,
      data: { x: 100, y: 100, width: 800, height: 500 }
    };
    
    setVenueObject(newVenue);
  };

  const addStage = () => {
    if (!venueObject || stages.length > 0) return;
    
    const newStage: CanvasObject = {
      id: `stage-${Date.now()}`,
      type: 'stage',
      x: venueObject.x + 50,
      y: venueObject.y + 50,
      width: 200,
      height: 100,
      rotation: 0,
      data: {
        name: 'Main Stage',
        width: 200,
        height: 100,
        x: venueObject.x + 50,
        y: venueObject.y + 50
      }
    };
    
    setStages([newStage]);
  };

  const addTable = () => {
    if (!venueObject) return;
    
    const newTable: CanvasObject = {
      id: `table-${Date.now()}`,
      type: 'table',
      x: venueObject.x + Math.random() * (venueObject.width - 80),
      y: venueObject.y + Math.random() * (venueObject.height - 80),
      width: 80,
      height: 80,
      rotation: 0,
      data: {
        tableNumber: tables.length + 1,
        capacity: seatCount,
        tableSize,
        shape: 'round',
        status: 'available',
        x: 0,
        y: 0,
        rotation: 0
      }
    };
    
    newTable.data.x = newTable.x;
    newTable.data.y = newTable.y;
    
    setTables(prev => [...prev, newTable]);
  };

  const updateSelectedTables = () => {
    const selectedTableIds = selectedObjects.filter(id => tables.some(t => t.id === id));
    if (selectedTableIds.length === 0) return;

    setTables(prev => prev.map(table => {
      if (selectedTableIds.includes(table.id)) {
        return {
          ...table,
          data: {
            ...table.data,
            capacity: seatCount,
            tableSize,
            shape: tableType === 'full' ? 'round' : 'half-round'
          }
        };
      }
      return table;
    }));
  };

  const selectAll = () => {
    if (currentStep === 3) {
      setSelectedObjects(tables.map(t => t.id));
    } else if (currentStep === 2) {
      setSelectedObjects(stages.map(s => s.id));
    }
  };

  const deleteSelected = () => {
    const selectedTableIds = selectedObjects.filter(id => tables.some(t => t.id === id));
    setTables(prev => prev.filter(table => !selectedTableIds.includes(table.id)));
    setSelectedObjects([]);
  };

  const resetAll = () => {
    setVenueObject(null);
    setStages([]);
    setTables([]);
    setSelectedObjects([]);
    setCurrentStep(1);
  };

  const handleSave = () => {
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

    const stageData = stages.map(stage => ({
      id: parseInt(stage.id.replace('stage-', '')) || 0,
      venueId: venue.id,
      name: stage.data.name || 'Stage',
      x: stage.x,
      y: stage.y,
      width: stage.width,
      height: stage.height,
      rotation: stage.rotation || 0
    }));

    const tableData = tables.map(table => ({
      id: parseInt(table.id.replace('table-', '')) || 0,
      venueId: venue.id,
      tableNumber: table.data.tableNumber || 1,
      capacity: table.data.capacity || 4,
      floor: 'main',
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height,
      shape: table.data.shape || 'round',
      tableSize: table.data.tableSize || 8,
      status: table.data.status || 'available',
      zone: null,
      priceCategory: 'standard',
      isLocked: false,
      rotation: table.rotation || 0
    }));

    onSave({
      venue: venueData,
      stages: stageData,
      tables: tableData
    });
  };

  const stepIsActive = (step: WorkflowStep) => step === currentStep;
  const stepIsCompleted = (step: WorkflowStep) => step < currentStep || (step === 2 && currentStep === 3 && stages.length === 0);

  return (
    <div className="flex gap-6 h-full">
      {/* Left Sidebar */}
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
              
              <Button 
                onClick={selectAll}
                disabled={readonly || tables.length === 0}
                variant="outline"
                className="w-full"
              >
                <MousePointer2 className="w-4 h-4 mr-2" />
                Select All Tables
              </Button>
              
              <Button 
                onClick={() => setSelectedObjects([])}
                disabled={readonly || selectedObjects.length === 0}
                variant="outline"
                className="w-full"
              >
                Clear Selection
              </Button>
              
              <Button 
                onClick={deleteSelected}
                disabled={readonly || selectedObjects.filter(id => tables.some(t => t.id === id)).length === 0}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
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
                setDraggedObjectId(obj.id);
                setLastMousePos(pos);
                
                if (e.shiftKey) {
                  // Multi-select with Shift
                  setSelectedObjects(prev => 
                    prev.includes(obj.id) 
                      ? prev.filter(id => id !== obj.id)
                      : [...prev, obj.id]
                  );
                } else {
                  setSelectedObjects([obj.id]);
                }
              } else {
                setSelectedObjects([]);
                setIsDragging(false);
                setDraggedObjectId(null);
              }
            }}
            onMouseMove={(e) => {
              if (!isDragging || !draggedObjectId || !lastMousePos) return;
              
              const pos = getMousePos(e);
              const deltaX = pos.x - lastMousePos.x;
              const deltaY = pos.y - lastMousePos.y;
              
              if (draggedObjectId === 'venue' && venueObject && currentStep === 1) {
                setVenueObject(prev => prev ? {
                  ...prev,
                  x: Math.max(0, prev.x + deltaX),
                  y: Math.max(0, prev.y + deltaY)
                } : null);
              } else if (currentStep === 2) {
                // Update stages
                setStages(prev => prev.map(stage => 
                  stage.id === draggedObjectId 
                    ? { ...stage, x: stage.x + deltaX, y: stage.y + deltaY }
                    : stage
                ));
              } else if (currentStep === 3) {
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
              
              setLastMousePos(pos);
            }}
            onMouseUp={() => {
              setIsDragging(false);
              setDraggedObjectId(null);
              setLastMousePos(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}