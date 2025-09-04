import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Move,
  Lock,
  Unlock,
  Trash2,
  Save,
  Edit,
  Check,
  X,
  Copy,
  Grid,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  RotateCw
} from "lucide-react";

// Types
interface Table {
  id: number;
  venueId: number;
  tableNumber: number;
  capacity: number;
  floor: string;
  x: number;
  y: number;
  shape: 'round' | 'square' | 'half-circle';
  isLocked?: boolean;
  zone?: string;
  status?: 'available' | 'reserved' | 'unavailable';
  priceCategory?: 'standard' | 'premium' | 'vip' | 'budget';
  rotation?: number;
}

interface Floor {
  id: string;
  name: string;
  image: string;
  isActive: boolean;
}

// Form validation schemas
const tableSchema = z.object({
  tableNumber: z.number().min(1, "Table number must be at least 1"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  shape: z.enum(["round", "square", "half-circle"]),
  status: z.enum(["available", "reserved", "unavailable"]),
  priceCategory: z.enum(["standard", "premium", "vip", "budget"]),
  isLocked: z.boolean().default(false)
});

const bulkTableSchema = z.object({
  startNumber: z.number().min(1, "Start number must be at least 1"),
  count: z.number().min(1, "Must create at least 1 table").max(30, "Maximum 30 tables at once"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  shape: z.enum(["round", "square", "half-circle"]),
  status: z.enum(["available", "reserved", "unavailable"]),
  priceCategory: z.enum(["standard", "premium", "vip", "budget"]),
  rows: z.number().min(1, "At least 1 row required"),
  spacing: z.number().min(50, "Spacing must be at least 50px")
});

export default function SimpleLayoutEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // State
  const [floors, setFloors] = useState<Floor[]>([
    { id: "main", name: "Main Floor", image: "/floor-plans/main-floor.png", isActive: true },
    { id: "mezzanine", name: "Mezzanine", image: "/floor-plans/mezzanine-floor.png", isActive: true },
  ]);
  const [currentFloor, setCurrentFloor] = useState<string>("mezzanine");
  const [mode, setMode] = useState<'view' | 'add' | 'move' | 'edit' | 'delete'>('view');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [tableStartPos, setTableStartPos] = useState({ x: 0, y: 0 });
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [zoom, setZoom] = useState(100);
  
  // Table edit form
  const tableForm = useForm<z.infer<typeof tableSchema>>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      tableNumber: 1,
      capacity: 8,
      shape: "round",
      status: "available",
      priceCategory: "standard",
      isLocked: false
    }
  });
  
  // Bulk table form
  const bulkTableForm = useForm<z.infer<typeof bulkTableSchema>>({
    resolver: zodResolver(bulkTableSchema),
    defaultValues: {
      startNumber: 1,
      count: 10,
      capacity: 8,
      shape: "round",
      status: "available",
      priceCategory: "standard",
      rows: 2,
      spacing: 100
    }
  });
  
  // Fetch tables for current floor
  const { data: tables = [], refetch: refetchTables } = useQuery({
    queryKey: ['admin-tables', currentFloor],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tables?floor=${currentFloor}`);
      if (!res.ok) throw new Error('Failed to fetch tables');
      return res.json();
    }
  });
  
  // Table CRUD mutations
  const createTableMutation = useMutation({
    mutationFn: async (tableData: Omit<Table, 'id'>) => {
      const res = await apiRequest('POST', '/api/admin/tables', tableData);
      return res.json();
    },
    onSuccess: () => {
      refetchTables();
      toast({ title: "Success", description: "Table created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: `Failed to create table: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive" 
      });
    }
  });
  
  const updateTableMutation = useMutation({
    mutationFn: async (tableData: Table) => {
      const res = await apiRequest('PUT', `/api/admin/tables/${tableData.id}`, tableData);
      return res.json();
    },
    onSuccess: () => {
      refetchTables();
      setSelectedTable(null);
      setIsEditing(false);
      toast({ title: "Success", description: "Table updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: `Failed to update table: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive" 
      });
    }
  });
  
  const deleteTableMutation = useMutation({
    mutationFn: async (tableId: number) => {
      const res = await apiRequest('DELETE', `/api/admin/tables/${tableId}`);
      return res.json();
    },
    onSuccess: () => {
      refetchTables();
      setSelectedTable(null);
      toast({ title: "Success", description: "Table deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: `Failed to delete table: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive" 
      });
    }
  });
  
  // Apply grid snapping (always return integers to avoid API errors)
  const snapPosition = (x: number, y: number) => {
    if (snapToGrid) {
      return {
        x: Math.round(Math.round(x / gridSize) * gridSize),
        y: Math.round(Math.round(y / gridSize) * gridSize)
      };
    }
    return { x: Math.round(x), y: Math.round(y) };
  };
  
  // Handle mouse movement on canvas
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (100 / zoom);
    const y = (e.clientY - rect.top) * (100 / zoom);
    
    // If dragging a table
    if (isDragging && selectedTable) {
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;
      
      const newPosition = snapPosition(
        tableStartPos.x + deltaX,
        tableStartPos.y + deltaY
      );
      
      setSelectedTable({
        ...selectedTable,
        x: newPosition.x,
        y: newPosition.y
      });
    } else {
      // Just update preview position for add mode
      setPreviewPos(snapPosition(x, y));
    }
  };
  
  // Handle mouse down on a table (start drag)
  const handleTableMouseDown = (e: React.MouseEvent, table: Table) => {
    if (mode !== 'move' || table.isLocked) return;
    
    e.stopPropagation();
    
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (100 / zoom);
    const y = (e.clientY - rect.top) * (100 / zoom);
    
    setSelectedTable(table);
    setIsDragging(true);
    setDragStartPos({ x, y });
    setTableStartPos({ x: table.x, y: table.y });
    
    // Add global mouse handlers
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Handle mouse up (end drag)
  const handleMouseUp = () => {
    if (isDragging && selectedTable) {
      // Save the new position
      updateTableMutation.mutate(selectedTable);
    }
    
    setIsDragging(false);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (100 / zoom);
    const y = (e.clientY - rect.top) * (100 / zoom);
    const position = snapPosition(x, y);
    
    if (mode === 'add') {
      // Add a new table
      const formValues = tableForm.getValues();
      
      createTableMutation.mutate({
        venueId: 1, // Default venue
        floor: currentFloor,
        tableNumber: formValues.tableNumber,
        capacity: formValues.capacity,
        shape: formValues.shape,
        status: formValues.status,
        priceCategory: formValues.priceCategory,
        isLocked: formValues.isLocked,
        x: position.x,
        y: position.y
      });
      
      // Increment table number for next add
      tableForm.setValue('tableNumber', formValues.tableNumber + 1);
      
    } else if (mode === 'view') {
      // Deselect
      setSelectedTable(null);
      setIsEditing(false);
    }
  };
  
  // Handle clicking on a table
  const handleTableClick = (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    
    if (mode === 'delete') {
      if (window.confirm(`Delete table ${table.tableNumber}?`)) {
        deleteTableMutation.mutate(table.id);
      }
      return;
    }
    
    if (mode === 'edit') {
      setSelectedTable(table);
      setIsEditing(true);
      
      // Load table data into form
      tableForm.reset({
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        shape: table.shape,
        status: table.status || 'available',
        priceCategory: table.priceCategory || 'standard',
        isLocked: table.isLocked || false
      });
    } else if (mode === 'view') {
      setSelectedTable(table);
      setIsEditing(false);
    }
  };
  
  // Handle bulk table creation
  const handleBulkCreate = (formData: z.infer<typeof bulkTableSchema>) => {
    if (!canvasRef.current) return;
    
    const { startNumber, count, capacity, shape, status, priceCategory, rows, spacing } = formData;
    const tablesPerRow = Math.ceil(count / rows);
    
    // Calculate center of canvas for starting position
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasCenter = {
      x: rect.width / 2 * (100 / zoom),
      y: rect.height / 2 * (100 / zoom)
    };
    
    // Calculate grid starting position (centered)
    const startX = canvasCenter.x - ((tablesPerRow - 1) * spacing) / 2;
    const startY = canvasCenter.y - ((rows - 1) * spacing) / 2;
    
    const createPromises = [];
    
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / tablesPerRow);
      const col = i % tablesPerRow;
      
      const position = snapPosition(
        startX + col * spacing,
        startY + row * spacing
      );
      
      createPromises.push(
        createTableMutation.mutate({
          venueId: 1,
          floor: currentFloor,
          tableNumber: startNumber + i,
          capacity,
          shape,
          status,
          priceCategory,
          isLocked: false,
          x: position.x,
          y: position.y
        })
      );
    }
    
    toast({
      title: "Adding Tables",
      description: `Creating ${count} tables...`
    });
    
    setIsBulkAdding(false);
  };
  
  // Handle save table edits
  const handleSaveTable = (formData: z.infer<typeof tableSchema>) => {
    if (!selectedTable) return;
    
    updateTableMutation.mutate({
      ...selectedTable,
      tableNumber: formData.tableNumber,
      capacity: formData.capacity,
      shape: formData.shape,
      status: formData.status,
      priceCategory: formData.priceCategory,
      isLocked: formData.isLocked
    });
  };
  
  // Toggle table lock without opening editor
  const handleToggleLock = (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    
    updateTableMutation.mutate({
      ...table,
      isLocked: !table.isLocked
    });
  };
  
  // Determine table size based on capacity
  const getTableSize = (capacity: number) => {
    const baseSize = 40;
    const sizePerPerson = 5;
    return baseSize + (capacity * sizePerPerson);
  };
  
  // Get table class based on status
  const getTableStatusClass = (status?: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'reserved': return 'bg-blue-500';
      case 'unavailable': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };
  
  // Get badge class for price category
  const getPriceCategoryClass = (category?: string) => {
    switch (category) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'vip': return 'bg-amber-100 text-amber-800';
      case 'budget': return 'bg-teal-100 text-teal-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };
  
  // Handle zoom changes
  const handleZoomIn = () => setZoom(Math.min(200, zoom + 10));
  const handleZoomOut = () => setZoom(Math.max(50, zoom - 10));
  const handleResetZoom = () => setZoom(100);
  
  // Set max table number in form when switching modes
  useEffect(() => {
    if (mode === 'add' && tables.length > 0) {
      const maxTableNumber = Math.max(...tables.map((t: Table) => t.tableNumber)) + 1;
      tableForm.setValue('tableNumber', maxTableNumber);
    }
  }, [mode, tables]);
  
  // Clean up event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Sidebar controls */}
        <div className="w-full md:w-64 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Floor Plan</CardTitle>
              <CardDescription>Select the floor to edit</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs 
                value={currentFloor} 
                onValueChange={setCurrentFloor}
                className="w-full"
              >
                <TabsList className="w-full">
                  {floors.map(floor => (
                    <TabsTrigger 
                      key={floor.id} 
                      value={floor.id}
                      className="flex-1"
                    >
                      {floor.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Edit Mode</CardTitle>
              <CardDescription>Select how to interact with tables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={mode === 'view' ? 'default' : 'outline'} 
                  onClick={() => setMode('view')}
                  className="justify-start"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Select
                </Button>
                <Button 
                  variant={mode === 'add' ? 'default' : 'outline'} 
                  onClick={() => { 
                    setMode('add');
                    setSelectedTable(null);
                    setIsEditing(false);
                  }}
                  className="justify-start"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
                <Button 
                  variant={mode === 'move' ? 'default' : 'outline'} 
                  onClick={() => setMode('move')}
                  className="justify-start"
                >
                  <Move className="mr-2 h-4 w-4" />
                  Move
                </Button>
                <Button 
                  variant={mode === 'edit' ? 'default' : 'outline'} 
                  onClick={() => setMode('edit')}
                  className="justify-start"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  variant={mode === 'delete' ? 'default' : 'outline'} 
                  onClick={() => setMode('delete')}
                  className="justify-start text-red-500 hover:text-white hover:bg-red-500"
                  size="sm"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsBulkAdding(true)}
                  className="justify-start"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Bulk Add
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Grid Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={snapToGrid} 
                    onCheckedChange={setSnapToGrid} 
                    id="snap-grid"
                  />
                  <label htmlFor="snap-grid" className="text-sm font-medium">
                    Snap to Grid
                  </label>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setGridSize(20)}
                >
                  Reset
                </Button>
              </div>
              
              {snapToGrid && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Grid Size: {gridSize}px</span>
                  </div>
                  <Slider
                    value={[gridSize]}
                    min={10}
                    max={50}
                    step={5}
                    onValueChange={([value]) => setGridSize(value)}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Zoom: {zoom}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Slider
                    value={[zoom]}
                    min={50}
                    max={200}
                    step={10}
                    onValueChange={([value]) => setZoom(value)}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleResetZoom}
                  className="w-full"
                  size="sm"
                >
                  Reset Zoom (100%)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main canvas area */}
        <div className="flex-1">
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Floor Layout: {floors.find(f => f.id === currentFloor)?.name}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {mode === 'view' && "View mode - click tables to select"}
                  {mode === 'add' && "Add mode - click to place tables"}
                  {mode === 'move' && "Move mode - drag tables to reposition"}
                  {mode === 'edit' && "Edit mode - click tables to edit properties"}
                  {mode === 'delete' && "Delete mode - click tables to remove"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                className="relative min-h-[500px] overflow-auto bg-gray-50"
                style={{
                  background: snapToGrid ? 
                    `linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)` 
                    : 'none',
                  backgroundSize: snapToGrid ? `${gridSize * (zoom/100)}px ${gridSize * (zoom/100)}px` : 'auto'
                }}
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
              >
                <div 
                  className="relative"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top left',
                    height: zoom > 100 ? `${100 * 100 / zoom}%` : '100%',
                    width: zoom > 100 ? `${100 * 100 / zoom}%` : '100%',
                  }}
                >
                  {/* Floor plan background image */}
                  <img 
                    src={floors.find(f => f.id === currentFloor)?.image || ''}
                    alt={`${currentFloor} floor plan`}
                    className="w-full max-w-full"
                  />
                  
                  {/* Render all tables */}
                  {tables.map((table: Table) => {
                    const isSelected = selectedTable?.id === table.id;
                    const tableSize = getTableSize(table.capacity);
                    const halfSize = table.shape === 'half-circle' ? tableSize / 2 : tableSize;
                    
                    return (
                      <div
                        key={table.id}
                        className={`absolute flex items-center justify-center transform transition-colors ${getTableStatusClass(table.status)} ${isSelected ? 'ring-4 ring-blue-500 z-20' : ''} ${mode === 'move' && !table.isLocked ? 'cursor-move' : 'cursor-pointer'}`}
                        style={{
                          left: `${table.x}px`,
                          top: `${table.y}px`,
                          width: `${tableSize}px`,
                          height: table.shape === 'half-circle' ? `${halfSize}px` : `${tableSize}px`,
                          borderRadius: table.shape === 'round' ? '50%' : 
                                        table.shape === 'half-circle' ? '100% 100% 0 0' : '4px',
                          transform: `translate(-50%, -50%) ${table.rotation ? `rotate(${table.rotation}deg)` : ''}`,
                          opacity: isDragging && selectedTable?.id === table.id ? 0.7 : 1
                        }}
                        onClick={(e) => handleTableClick(e, table)}
                        onMouseDown={(e) => handleTableMouseDown(e, table)}
                      >
                        <span className="font-bold text-white">{table.tableNumber}</span>
                        
                        {isSelected && (
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex space-x-1">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6 bg-white bg-opacity-90"
                              onClick={(e) => handleToggleLock(e, table)}
                            >
                              {table.isLocked ? 
                                <Unlock className="h-3 w-3" /> : 
                                <Lock className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                        
                        {table.isLocked && (
                          <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1">
                            <Lock className="h-3 w-3 text-yellow-900" />
                          </div>
                        )}
                        
                        {/* Price category badge */}
                        <div className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded ${getPriceCategoryClass(table.priceCategory)}`}>
                          {table.priceCategory}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Preview for add mode */}
                  {mode === 'add' && (
                    <div
                      className={`absolute flex items-center justify-center ${getTableStatusClass(tableForm.getValues().status)} opacity-50 pointer-events-none`}
                      style={{
                        left: `${previewPos.x}px`,
                        top: `${previewPos.y}px`,
                        width: `${getTableSize(tableForm.getValues().capacity)}px`,
                        height: tableForm.getValues().shape === 'half-circle' ? 
                          `${getTableSize(tableForm.getValues().capacity) / 2}px` : 
                          `${getTableSize(tableForm.getValues().capacity)}px`,
                        borderRadius: tableForm.getValues().shape === 'round' ? '50%' : 
                                      tableForm.getValues().shape === 'half-circle' ? '100% 100% 0 0' : '4px',
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <span className="font-bold text-white">{tableForm.getValues().tableNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Table edit/details panel */}
          {selectedTable && isEditing && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle>Edit Table {selectedTable.tableNumber}</CardTitle>
                <CardDescription>Update table properties</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...tableForm}>
                  <form onSubmit={tableForm.handleSubmit(handleSaveTable)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={tableForm.control}
                        name="tableNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Table Number</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={tableForm.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacity</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={tableForm.control}
                        name="shape"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Shape</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select shape" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="round">Round</SelectItem>
                                <SelectItem value="square">Square</SelectItem>
                                <SelectItem value="half-circle">Half Circle</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={tableForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="reserved">Reserved</SelectItem>
                                <SelectItem value="unavailable">Unavailable</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={tableForm.control}
                        name="priceCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Category</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select price category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="vip">VIP</SelectItem>
                                <SelectItem value="budget">Budget</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={tableForm.control}
                        name="isLocked"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 pt-6">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!m-0">Lock Position</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedTable(null);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
          
          {/* Selected table info (when not editing) */}
          {selectedTable && !isEditing && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Table {selectedTable.tableNumber}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(true);
                      // Load table data into form
                      tableForm.reset({
                        tableNumber: selectedTable.tableNumber,
                        capacity: selectedTable.capacity,
                        shape: selectedTable.shape,
                        status: selectedTable.status || 'available',
                        priceCategory: selectedTable.priceCategory || 'standard',
                        isLocked: selectedTable.isLocked || false
                      });
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Capacity</p>
                    <p>{selectedTable.capacity} people</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Shape</p>
                    <p className="capitalize">{selectedTable.shape}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${getTableStatusClass(selectedTable.status)}`}></div>
                      <p className="capitalize">{selectedTable.status || 'Available'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Price Category</p>
                    <p className={`inline-block px-2 py-1 rounded text-xs ${getPriceCategoryClass(selectedTable.priceCategory)}`}>
                      {selectedTable.priceCategory || 'Standard'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Position</p>
                    <p>X: {selectedTable.x}, Y: {selectedTable.y}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Lock Status</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLock(e, selectedTable);
                      }}
                    >
                      {selectedTable.isLocked ? (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Locked
                        </>
                      ) : (
                        <>
                          <Unlock className="mr-2 h-4 w-4" />
                          Unlocked
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Bulk add dialog */}
      {isBulkAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Bulk Create Tables</CardTitle>
              <CardDescription>Add multiple tables at once</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...bulkTableForm}>
                <form onSubmit={bulkTableForm.handleSubmit(handleBulkCreate)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={bulkTableForm.control}
                      name="startNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Number</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={bulkTableForm.control}
                      name="count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Tables</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={bulkTableForm.control}
                      name="rows"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rows</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={bulkTableForm.control}
                      name="spacing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Spacing (px)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={bulkTableForm.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={bulkTableForm.control}
                      name="shape"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shape</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select shape" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="round">Round</SelectItem>
                              <SelectItem value="square">Square</SelectItem>
                              <SelectItem value="half-circle">Half Circle</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={bulkTableForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                              <SelectItem value="unavailable">Unavailable</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={bulkTableForm.control}
                      name="priceCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Category</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select price category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="vip">VIP</SelectItem>
                              <SelectItem value="budget">Budget</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBulkAdding(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Create Tables
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}