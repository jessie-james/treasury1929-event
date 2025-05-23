import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Users, RotateCw, RotateCcw, Trash2, MousePointer2, ArrowRight, Square } from 'lucide-react';
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
  const [venueObject, setVenueObject] = useState<CanvasObject | null>(null);
  const [stages, setStages] = useState<CanvasObject[]>([]);
  const [tables, setTables] = useState<CanvasObject[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Find object at position
  const getObjectAtPosition = useCallback((x: number, y: number): CanvasObject | null => {
    // Check venue (only if on step 1)
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
        data: venue
      });
      setCurrentStep(2);
    }
  }, [venue.bounds]);

  // Initialize stages
  useEffect(() => {
    if (initialStages.length > 0) {
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
      if (venueObject) setCurrentStep(3);
    }
  }, [initialStages, venueObject]);

  // Initialize tables
  useEffect(() => {
    if (initialTables.length > 0) {
      const tableObjects = initialTables.map(table => ({
        id: `table-${table.id}`,
        type: 'table' as const,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        rotation: table.rotation || 0,
        data: table
      }));
      setTables(tableObjects);
      if (venueObject) setCurrentStep(3);
    }
  }, [initialTables, venueObject]);

  // Drawing functions
  const drawVenue = useCallback((obj: CanvasObject) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = currentStep === 1 ? '#3b82f6' : '#6b7280';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    
    // Fill with semi-transparent color
    ctx.fillStyle = currentStep === 1 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)';
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  }, [currentStep]);

  const drawStage = useCallback((obj: CanvasObject) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = currentStep === 2 ? '#10b981' : '#6b7280';
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    
    // Add label
    ctx.fillStyle = 'white';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE', obj.x + obj.width / 2, obj.y + obj.height / 2 + 5);
  }, [currentStep]);

  const drawTable = useCallback((obj: CanvasObject) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tableSize = Math.max(40, Math.min(120, obj.data.tableSize * 10));
    const centerX = obj.x + tableSize / 2;
    const centerY = obj.y + tableSize / 2;
    const radius = tableSize / 2;

    // Draw table circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    
    // Set colors based on selection and step
    const isSelected = selectedObjects.includes(obj.id);
    if (isSelected) {
      ctx.fillStyle = '#fca5a5';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
    } else if (currentStep === 3) {
      ctx.fillStyle = '#ddd6fe';
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = '#e5e7eb';
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
    }
    
    ctx.fill();
    ctx.stroke();
    
    // Add table number
    ctx.fillStyle = isSelected ? '#dc2626' : currentStep === 3 ? '#8b5cf6' : '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(obj.data.tableNumber?.toString() || 'T', centerX, centerY + 4);
  }, [selectedObjects, currentStep]);

  // Main draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw venue boundary
    if (venueObject) {
      drawVenue(venueObject);
    }

    // Draw stages
    stages.forEach(drawStage);

    // Draw tables
    tables.forEach(drawTable);
  }, [venueObject, stages, tables, drawVenue, drawStage, drawTable]);

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Create venue
  const createVenue = useCallback(() => {
    if (readonly) return;
    
    const newVenue: CanvasObject = {
      id: 'venue',
      type: 'venue',
      x: 100,
      y: 100,
      width: 800,
      height: 500,
      rotation: 0,
      data: { ...venue, bounds: { x: 100, y: 100, width: 800, height: 500 } }
    };
    
    setVenueObject(newVenue);
    setCurrentStep(2);
  }, [venue, readonly]);

  // Create stage
  const createStage = useCallback(() => {
    if (readonly || !venueObject || stages.length > 0) return;
    
    const newStage: CanvasObject = {
      id: `stage-${Date.now()}`,
      type: 'stage',
      x: venueObject.x + 50,
      y: venueObject.y + 50,
      width: 200,
      height: 100,
      rotation: 0,
      data: {
        id: Date.now(),
        venueId: venue.id,
        name: 'Main Stage',
        x: venueObject.x + 50,
        y: venueObject.y + 50,
        width: 200,
        height: 100,
        rotation: 0
      }
    };
    
    setStages([newStage]);
  }, [venue.id, venueObject, stages.length, readonly]);

  // Create table
  const createTable = useCallback((capacity: number) => {
    if (readonly || !venueObject) return;
    
    const tableSize = Math.max(40, Math.min(120, capacity * 10));
    const newTable: CanvasObject = {
      id: `table-${Date.now()}`,
      type: 'table',
      x: venueObject.x + 100 + (tables.length * 100) % (venueObject.width - 200),
      y: venueObject.y + 150 + Math.floor((tables.length * 100) / (venueObject.width - 200)) * 100,
      width: tableSize,
      height: tableSize,
      rotation: 0,
      data: {
        id: Date.now(),
        venueId: venue.id,
        tableNumber: tables.length + 1,
        capacity,
        floor: 'main',
        x: venueObject.x + 100 + (tables.length * 100) % (venueObject.width - 200),
        y: venueObject.y + 150 + Math.floor((tables.length * 100) / (venueObject.width - 200)) * 100,
        width: tableSize,
        height: tableSize,
        shape: 'round',
        tableSize: capacity,
        status: 'available',
        zone: null,
        priceCategory: 'standard',
        isLocked: false,
        rotation: 0
      }
    };
    
    setTables(prev => [...prev, newTable]);
  }, [venue.id, venueObject, tables.length, readonly]);

  // Update venue size
  const updateVenueSize = useCallback((dimension: 'width' | 'height', value: number) => {
    if (readonly) return;
    setVenueObject(prev => prev ? { ...prev, [dimension]: value } : null);
  }, [readonly]);

  // Update stage size
  const updateStageSize = useCallback((dimension: 'width' | 'height', value: number) => {
    if (readonly || stages.length === 0) return;
    setStages(prev => prev.map(stage => ({ ...stage, [dimension]: value })));
  }, [readonly, stages.length]);

  // Select all tables
  const selectAll = useCallback(() => {
    if (readonly) return;
    setSelectedObjects(tables.map(table => table.id));
  }, [tables, readonly]);

  // Rotate selected objects
  const rotateSelected = useCallback((degrees: number) => {
    if (readonly || selectedObjects.length === 0) return;
    
    setTables(prev => prev.map(table => 
      selectedObjects.includes(table.id)
        ? { ...table, rotation: (table.rotation + degrees) % 360 }
        : table
    ));
  }, [selectedObjects, readonly]);

  // Delete selected objects
  const deleteSelected = useCallback(() => {
    if (readonly || selectedObjects.length === 0) return;
    
    setTables(prev => prev.filter(table => !selectedObjects.includes(table.id)));
    setStages(prev => prev.filter(stage => !selectedObjects.includes(stage.id)));
    setSelectedObjects([]);
  }, [selectedObjects, readonly]);

  // Reset all
  const resetAll = useCallback(() => {
    if (readonly) return;
    setVenueObject(null);
    setStages([]);
    setTables([]);
    setSelectedObjects([]);
    setCurrentStep(1);
  }, [readonly]);

  // Save layout
  const handleSave = useCallback(() => {
    if (!venueObject) return;
    
    const venueData = {
      venue: {
        ...venue,
        bounds: {
          x: venueObject.x,
          y: venueObject.y,
          width: venueObject.width,
          height: venueObject.height
        }
      },
      stages: stages.map(stage => stage.data),
      tables: tables.map(table => table.data)
    };
    
    onSave(venueData);
  }, [venue, venueObject, stages, tables, onSave]);

  const stepIsActive = (step: WorkflowStep) => step === currentStep;
  const stepIsCompleted = (step: WorkflowStep) => step < currentStep || (step === 2 && currentStep === 3 && stages.length === 0);

  return (
    <div className="space-y-6">
      {/* Workflow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Square className="w-4 h-4 mr-2" />
              {venueObject ? 'Venue Created' : 'Create Venue Rectangle'}
            </Button>
            
            {venueObject && currentStep === 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Venue Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500">Width</Label>
                    <Input
                      type="number"
                      value={venueObject.width}
                      onChange={(e) => updateVenueSize('width', parseInt(e.target.value) || 0)}
                      min="100"
                      max="800"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Height</Label>
                    <Input
                      type="number"
                      value={venueObject.height}
                      onChange={(e) => updateVenueSize('height', parseInt(e.target.value) || 0)}
                      min="100"
                      max="500"
                      className="h-8"
                    />
                  </div>
                </div>
                <Button 
                  onClick={() => setCurrentStep(2)}
                  className="w-full mt-2"
                >
                  Continue to Stage Setup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Add Stage */}
        <Card className={cn(
          "border-2",
          stepIsActive(2) && "border-blue-500 bg-blue-50",
          stepIsCompleted(2) && "border-green-500 bg-green-50",
          currentStep < 2 && "opacity-50"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white",
                stepIsCompleted(2) ? "bg-green-500" : currentStep === 2 ? "bg-blue-500" : "bg-gray-400"
              )}>
                2
              </div>
              Add Stage (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stages.length === 0 ? (
              <Button 
                onClick={createStage} 
                disabled={readonly || currentStep !== 2}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-green-600 font-medium">✓ Stage Added</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500">Width</Label>
                    <Input
                      type="number"
                      value={stages[0]?.width || 0}
                      onChange={(e) => updateStageSize('width', parseInt(e.target.value) || 0)}
                      min="50"
                      max="400"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Height</Label>
                    <Input
                      type="number"
                      value={stages[0]?.height || 0}
                      onChange={(e) => updateStageSize('height', parseInt(e.target.value) || 0)}
                      min="30"
                      max="200"
                      className="h-8"
                    />
                  </div>
                </div>
                <Button 
                  onClick={() => setStages([])}
                  disabled={readonly}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Stage
                </Button>
              </div>
            )}
            
            <Button 
              onClick={() => setCurrentStep(3)}
              disabled={currentStep !== 2}
              className="w-full"
            >
              Continue to Table Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Step 3: Add Tables */}
        <Card className={cn(
          "border-2",
          stepIsActive(3) && "border-blue-500 bg-blue-50",
          stepIsCompleted(3) && "border-green-500 bg-green-50",
          currentStep < 3 && "opacity-50"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white",
                stepIsCompleted(3) ? "bg-green-500" : currentStep === 3 ? "bg-blue-500" : "bg-gray-400"
              )}>
                3
              </div>
              Add Tables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => createTable(4)} 
                disabled={readonly || currentStep !== 3}
                variant="outline"
                size="sm"
              >
                <Users className="w-3 h-3 mr-1" />
                4-Seat
              </Button>
              <Button 
                onClick={() => createTable(6)} 
                disabled={readonly || currentStep !== 3}
                variant="outline"
                size="sm"
              >
                <Users className="w-3 h-3 mr-1" />
                6-Seat
              </Button>
              <Button 
                onClick={() => createTable(8)} 
                disabled={readonly || currentStep !== 3}
                variant="outline"
                size="sm"
              >
                <Users className="w-3 h-3 mr-1" />
                8-Seat
              </Button>
              <Button 
                onClick={() => createTable(10)} 
                disabled={readonly || currentStep !== 3}
                variant="outline"
                size="sm"
              >
                <Users className="w-3 h-3 mr-1" />
                10-Seat
              </Button>
            </div>
            
            {tables.length > 0 && (
              <div className="text-sm text-green-600 font-medium">
                ✓ {tables.length} Table{tables.length !== 1 ? 's' : ''} Added
              </div>
            )}

            {selectedObjects.length > 0 && (
              <div className="space-y-2 p-2 bg-gray-50 rounded">
                <div className="text-sm font-medium">Multi-Selection ({selectedObjects.length})</div>
                <div className="grid grid-cols-2 gap-1">
                  <Button 
                    onClick={() => rotateSelected(15)}
                    disabled={readonly}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCw className="w-3 h-3 mr-1" />
                    Rotate
                  </Button>
                  <Button 
                    onClick={deleteSelected}
                    disabled={readonly}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Main Layout Area */}
      <div className="flex gap-6 h-full">
        {/* Controls Sidebar */}
        <div className="w-80 space-y-4">
          {/* Selection Tools */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MousePointer2 className="w-4 h-4" />
                Selection Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={selectAll}
                disabled={readonly || tables.length === 0}
                variant="outline"
                className="w-full"
              >
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
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
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
                  
                  // Handle multi-selection with Shift key
                  if (e.shiftKey) {
                    setSelectedObjects(prev => {
                      const isSelected = prev.some(id => id === obj.id);
                      if (isSelected) {
                        return prev.filter(id => id !== obj.id);
                      } else {
                        return [...prev, obj.id];
                      }
                    });
                  } else if (!selectedObjects.includes(obj.id)) {
                    setSelectedObjects([obj.id]);
                  }
                } else {
                  setSelectedObjects([]);
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
                } else if (currentStep === 2) {
                  setStages(prev => prev.map(stage => 
                    stage.id === draggedObjectId 
                      ? { ...stage, x: stage.x + deltaX, y: stage.y + deltaY }
                      : stage
                  ));
                } else if (currentStep === 3) {
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
          {(selectedObjects.length > 0 || tables.length > 0 || stages.length > 0) && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-600">
                Selected: {selectedObjects.length} object(s)
                {tables.length > 0 && ` • Tables: ${tables.length}`}
                {stages.length > 0 && ` • Stages: ${stages.length}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}