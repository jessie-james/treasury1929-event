import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Undo, Redo, Save, Trash2, Plus, Pencil, Upload, Table as TableIcon, 
  Check, ArrowDown, ArrowUp, RotateCcw, Lock, Unlock, Move, RotateCw,
  ZoomIn, ZoomOut, MousePointer, Grid, Copy, Maximize2
} from "lucide-react";
// We don't need to import TableType from external file as we define our own Table interface
import { apiRequest } from "@/lib/queryClient";

// Type definitions (same as original file)
interface CanvasPosition {
  x: number;
  y: number;
}

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
}

interface Seat {
  id: number;
  tableId: number;
  seatNumber: number;
  xOffset: number;
  yOffset: number;
}

interface TableWithSeats extends Table {
  seats: Seat[];
}

interface Floor {
  id: string;
  name: string;
  image: string;
  isActive: boolean;
}

interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  floors: Floor[];
  createdAt: Date;
  lastModified: Date;
}

interface Zone {
  id: string;
  name: string;
  color: string;
  tables: number[];
}

// Form validation schemas
const tableFormSchema = z.object({
  id: z.number().optional(),
  tableNumber: z.number().min(1, "Table number is required and must be positive"),
  capacity: z.number().min(1, "Capacity is required and must be at least 1"),
  shape: z.enum(["round", "square", "half-circle"], {
    required_error: "Shape is required",
  }),
  zone: z.string().optional(),
  status: z.enum(["available", "reserved", "unavailable"], {
    required_error: "Status is required",
  }),
  priceCategory: z.enum(["standard", "premium", "vip", "budget"], {
    required_error: "Price category is required",
  }),
  isLocked: z.boolean().default(false),
});

const bulkTableFormSchema = z.object({
  startNumber: z.number().min(1, "Start number is required"),
  count: z.number().min(1, "Number of tables is required").max(50, "Maximum 50 tables can be created at once"),
  capacity: z.number().min(1, "Capacity is required"),
  shape: z.enum(["round", "square", "half-circle"], {
    required_error: "Shape is required",
  }),
  zone: z.string().optional(),
  status: z.enum(["available", "reserved", "unavailable"], {
    required_error: "Status is required",
  }),
  priceCategory: z.enum(["standard", "premium", "vip", "budget"], {
    required_error: "Price category is required",
  }),
  spacing: z.number().min(10, "Spacing must be at least 10px").default(80),
  rows: z.number().min(1, "At least 1 row is required").default(1),
});

const floorFormSchema = z.object({
  name: z.string().min(1, "Floor name is required"),
  isActive: z.boolean().default(true),
});

export default function LayoutSettings() {
  // WebSocket collaboration has been completely removed as only one admin uses the system at a time
  
  // Toast for notifications
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State variables
  const [currentFloor, setCurrentFloor] = useState<string>("mezzanine");
  const [floors, setFloors] = useState<Floor[]>([
    { id: "main", name: "Main Floor", image: "/floor-plans/main-floor.png", isActive: true },
    { id: "mezzanine", name: "Mezzanine", image: "/floor-plans/mezzanine-floor.png", isActive: true },
  ]);
  
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(1);
  const [venues, setVenues] = useState<{id: number, name: string}[]>([]);
  const [zones, setZones] = useState<Zone[]>([
    { id: "general", name: "General", color: "#3b82f6", tables: [1, 2, 3] },
    { id: "vip", name: "VIP Zone", color: "#8b5cf6", tables: [4, 5, 6] },
  ]);
  
  // Table selection and editing states
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTables, setSelectedTables] = useState<Table[]>([]);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isBulkAddMode, setIsBulkAddMode] = useState(false);
  const [mousePosition, setMousePosition] = useState<CanvasPosition>({ x: 0, y: 0 });
  
  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState<CanvasPosition | null>(null);
  const [draggedTable, setDraggedTable] = useState<Table | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10); // Grid size in pixels
  const [zoom, setZoom] = useState(100); // Zoom level percentage
  const [editMode, setEditMode] = useState<'select' | 'move' | 'add' | 'delete'>('select');
  
  // History for undo/redo
  const [history, setHistory] = useState<Table[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Template states
  const [layoutTemplates, setLayoutTemplates] = useState<LayoutTemplate[]>([
    {
      id: "concert",
      name: "Concert Layout",
      description: "Standard layout for concerts with main floor and mezzanine",
      floors: floors,
      createdAt: new Date(),
      lastModified: new Date()
    }
  ]);
  const [currentTemplate, setCurrentTemplate] = useState<string | null>("concert");

  // Form for individual table editing
  const tableForm = useForm<z.infer<typeof tableFormSchema>>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      tableNumber: 1,
      capacity: 8,
      shape: "round",
      status: "available",
      priceCategory: "standard",
      isLocked: false,
    },
  });
  
  // Form for bulk table creation
  const bulkTableForm = useForm<z.infer<typeof bulkTableFormSchema>>({
    resolver: zodResolver(bulkTableFormSchema),
    defaultValues: {
      startNumber: 1,
      count: 5,
      capacity: 8,
      shape: "round",
      status: "available",
      priceCategory: "standard",
      spacing: 80,
      rows: 1
    },
  });
  
  // Form for floor management
  const floorForm = useForm<z.infer<typeof floorFormSchema>>({
    resolver: zodResolver(floorFormSchema),
    defaultValues: {
      name: "",
      isActive: true
    },
  });

  // Canvas ref for measuring and interactive positioning
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Data fetching - tables
  const { data: tablesData, isLoading: isLoadingTables, error: tablesError } = useQuery({
    queryKey: ['venue-tables', selectedVenueId, currentFloor],
    queryFn: async () => {
      if (!selectedVenueId) return [];
      const response = await fetch(`/api/admin/tables?venueId=${selectedVenueId}&floor=${currentFloor}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }
      return response.json();
    },
    enabled: !!selectedVenueId
  });
  
  // Data fetching - venues
  const { data: venueData, isLoading: isLoadingVenues, error: venuesError } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const response = await fetch('/api/admin/venues');
      if (!response.ok) {
        throw new Error('Failed to fetch venues');
      }
      return response.json();
    }
  });
  
  // Get data for floors
  const { data: floorsData } = useQuery({
    queryKey: ['venue-floors', selectedVenueId],
    queryFn: async () => {
      if (!selectedVenueId) return [];
      const response = await fetch(`/api/admin/venues/${selectedVenueId}/floors`);
      if (!response.ok) {
        throw new Error('Failed to fetch floors');
      }
      return response.json();
    },
    enabled: !!selectedVenueId
  });

  // Get data for zones
  const { data: zonesData } = useQuery({
    queryKey: ['venue-zones', selectedVenueId],
    queryFn: async () => {
      if (!selectedVenueId) return [];
      const response = await fetch(`/api/admin/venues/${selectedVenueId}/zones`);
      if (!response.ok) {
        throw new Error('Failed to fetch zones');
      }
      return response.json();
    },
    enabled: !!selectedVenueId
  });

  // Get tables specific to the current floor
  const currentFloorTables = useMemo(() => {
    if (!tablesData) return [];
    return (tablesData as Table[]).filter(table => table.floor === currentFloor);
  }, [tablesData, currentFloor]);
  
  // Add a table to history for undo/redo
  const addToHistory = useCallback((newTables: Table[]) => {
    // Truncate history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newTables]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);
  
  // Add handler function for floor selection
  const handleFloorSelection = (floorId: string) => {
    setCurrentFloor(floorId);
    setSelectedTable(null);
    setSelectedTables([]);
    setIsAddMode(false);
    setIsBulkAddMode(false);
  };
  
  // Utility functions for table visualization
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'reserved':
        return 'bg-blue-500';
      case 'unavailable':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };
  
  const getPriceCategoryBadgeClass = (category?: string) => {
    switch (category) {
      case 'premium':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'vip':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'budget':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'standard':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };
  
  // History navigation functions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      // Update tables from history
      // In a real implementation, this would make an API call
      toast({
        title: "Undo successful",
        description: "Previous state restored",
      });
    }
  }, [historyIndex, toast]);
  
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      // Update tables from history
      // In a real implementation, this would make an API call
      toast({
        title: "Redo successful",
        description: "Change reapplied",
      });
    }
  }, [historyIndex, history.length, toast]);

  // Set venues when data is loaded
  useEffect(() => {
    if (venueData && Array.isArray(venueData)) {
      setVenues(venueData as {id: number, name: string}[]);
      // Set default venue if not already set
      if (!selectedVenueId && venueData.length > 0) {
        setSelectedVenueId(venueData[0].id);
      }
    }
  }, [venueData, selectedVenueId]);
  
  // Update form when selected table changes
  useEffect(() => {
    if (selectedTable) {
      tableForm.reset({
        id: selectedTable.id,
        tableNumber: selectedTable.tableNumber,
        capacity: selectedTable.capacity,
        shape: selectedTable.shape,
        zone: selectedTable.zone,
        status: selectedTable.status || "available",
        priceCategory: selectedTable.priceCategory || "standard",
        isLocked: selectedTable.isLocked || false
      });
    }
  }, [selectedTable, tableForm]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Logic to handle resizing - could update relative positions
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Mutation for creating/updating tables
  const updateTableMutation = useMutation({
    mutationFn: async (tableData: Table) => {
      const response = await apiRequest(
        tableData.id ? "PUT" : "POST",
        tableData.id ? `/api/admin/tables/${tableData.id}` : `/api/admin/tables`,
        tableData
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Table updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['venue-tables', selectedVenueId, currentFloor] });
      setSelectedTable(null);
      setIsAddMode(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update table: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for uploading floor plans
  const uploadFloorPlanMutation = useMutation({
    mutationFn: async (data: { floorId: string, imageFile: File }) => {
      const formData = new FormData();
      formData.append("floorId", data.floorId);
      formData.append("image", data.imageFile);
      
      const response = await apiRequest(
        "POST",
        `/api/admin/venues/${selectedVenueId}/floors/${data.floorId}/image`,
        formData
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Floor plan uploaded successfully",
      });
      // Update floors with new image URL
      setFloors(prev => 
        prev.map(floor => 
          floor.id === data.floorId ? { ...floor, image: data.imageUrl } : floor
        )
      );
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload floor plan: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });
  
  // Handle venue selection
  const handleSelectVenue = (id: number) => {
    setSelectedVenueId(id);
    setSelectedTable(null);
    setSelectedTables([]);
  };
  
  // Toggle table lock state
  const handleToggleTableLock = (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const updatedTable = {
      ...table,
      isLocked: !table.isLocked
    };
    
    updateTableMutation.mutate(updatedTable);
  };
  
  // Table selection handlers
  const handleSelectTable = (table: Table) => {
    if (editMode === 'delete') {
      if (confirm(`Are you sure you want to delete Table ${table.tableNumber}?`)) {
        // Delete the table
        apiRequest("DELETE", `/api/admin/tables/${table.id}`)
          .then(() => {
            toast({
              title: "Table Deleted",
              description: `Table ${table.tableNumber} has been deleted`
            });
            queryClient.invalidateQueries({ queryKey: ['venue-tables', selectedVenueId, currentFloor] });
          })
          .catch(error => {
            toast({
              title: "Error",
              description: `Failed to delete table: ${error.message}`,
              variant: "destructive"
            });
          });
      }
      return;
    }
    
    setSelectedTable(table);
    setIsAddMode(false);
    setIsBulkAddMode(false);
  };
  
  const handleMultiSelectTable = (table: Table, event: React.MouseEvent) => {
    if (editMode === 'delete') {
      handleSelectTable(table);
      return;
    }
    
    if (event.ctrlKey || event.metaKey) {
      setSelectedTables(prev => {
        const isSelected = prev.some(t => t.id === table.id);
        if (isSelected) {
          return prev.filter(t => t.id !== table.id);
        } else {
          return [...prev, table];
        }
      });
    } else {
      handleSelectTable(table);
    }
  };
  
  // Render a table with visual indicators for state
  const renderTable = (table: Table) => {
    const isSelected = selectedTable?.id === table.id || 
                        selectedTables.some(t => t.id === table.id);
    const isDragged = draggedTable?.id === table.id;
    
    // Determine position to render - use draggedTable position if being dragged
    const position = isDragged && draggedTable ? 
      { x: draggedTable.x, y: draggedTable.y } : 
      { x: table.x, y: table.y };
      
    // Get size based on capacity and shape
    const baseSize = 30 + (table.capacity * 2);
    
    // Determine class names for styling
    const tableClasses = [
      "absolute cursor-move transition-transform flex items-center justify-center select-none",
      getStatusColor(table.status),
      isSelected ? "ring-4 ring-primary shadow-lg z-10" : "",
      table.isLocked ? "ring-2 ring-yellow-400" : "",
      isDragged ? "opacity-70 shadow-lg scale-105 z-20" : ""
    ].filter(Boolean).join(" ");
    
    // Prepare style based on shape
    let style: React.CSSProperties = {
      left: `${position.x}px`,
      top: `${position.y}px`,
      height: `${baseSize}px`,
      width: `${baseSize}px`,
      transform: isDragged ? 'scale(1.05)' : undefined
    };
    
    // Render appropriate shape
    let tableElement;
    
    if (table.shape === 'round') {
      style.borderRadius = '50%';
      tableElement = (
        <div 
          className={tableClasses} 
          style={style}
          onClick={(e) => handleMultiSelectTable(table, e)}
          onMouseDown={(e) => editMode === 'move' && handleTableDragStart(table, e)}
        >
          <div className="text-white text-sm font-bold">{table.tableNumber}</div>
          {table.isLocked && (
            <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1">
              <Lock className="h-3 w-3" />
            </div>
          )}
          {isSelected && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex space-x-1">
              <Button
                size="icon" 
                variant="outline" 
                className="h-6 w-6 bg-white"
                onClick={(e) => handleToggleTableLock(table, e)}
              >
                {table.isLocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              </Button>
            </div>
          )}
        </div>
      );
    } else if (table.shape === 'square') {
      tableElement = (
        <div 
          className={tableClasses} 
          style={style}
          onClick={(e) => handleMultiSelectTable(table, e)}
          onMouseDown={(e) => editMode === 'move' && handleTableDragStart(table, e)}
        >
          <div className="text-white text-sm font-bold">{table.tableNumber}</div>
          {table.isLocked && (
            <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1">
              <Lock className="h-3 w-3" />
            </div>
          )}
          {isSelected && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex space-x-1">
              <Button
                size="icon" 
                variant="outline" 
                className="h-6 w-6 bg-white"
                onClick={(e) => handleToggleTableLock(table, e)}
              >
                {table.isLocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              </Button>
            </div>
          )}
        </div>
      );
    } else if (table.shape === 'half-circle') {
      // Adjust style for half-circle
      style.borderRadius = '100% 100% 0 0';
      style.height = `${baseSize / 2}px`;
      
      tableElement = (
        <div 
          className={tableClasses} 
          style={style}
          onClick={(e) => handleMultiSelectTable(table, e)}
          onMouseDown={(e) => editMode === 'move' && handleTableDragStart(table, e)}
        >
          <div className="text-white text-sm font-bold">{table.tableNumber}</div>
          {table.isLocked && (
            <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1">
              <Lock className="h-3 w-3" />
            </div>
          )}
          {isSelected && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex space-x-1">
              <Button
                size="icon" 
                variant="outline" 
                className="h-6 w-6 bg-white"
                onClick={(e) => handleToggleTableLock(table, e)}
              >
                {table.isLocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              </Button>
            </div>
          )}
        </div>
      );
    }
    
    return tableElement;
  };
  
  // Enable table adding mode
  const handleAddTable = () => {
    setEditMode('add');
    setIsAddMode(true);
    setIsBulkAddMode(false);
    setSelectedTable(null);
    setSelectedTables([]);
    
    // Set default values for new table
    const nextTableNumber = currentFloorTables.length > 0 
      ? Math.max(0, ...currentFloorTables.map(t => t.tableNumber)) + 1 
      : 1;
    
    tableForm.reset({
      tableNumber: nextTableNumber,
      capacity: 8,
      shape: "round",
      status: "available",
      priceCategory: "standard",
      isLocked: false
    });
    
    toast({
      title: "Add Table Mode",
      description: "Click anywhere on the floor plan to place a table"
    });
  };
  
  // Enable bulk table adding mode
  const handleBulkAddTables = () => {
    setIsBulkAddMode(true);
    setIsAddMode(false);
    setSelectedTable(null);
    
    // Set default values for bulk creation
    bulkTableForm.reset({
      startNumber: Math.max(0, ...currentFloorTables.map(t => t.tableNumber)) + 1,
      count: 5,
      capacity: 8,
      shape: "round",
      status: "available",
      priceCategory: "standard",
      spacing: 80,
      rows: 1
    });
  };
  
  // Apply grid snapping if enabled and convert to integers
  const applyGridSnap = (position: CanvasPosition): CanvasPosition => {
    let result = position;
    
    if (snapToGrid) {
      result = {
        x: Math.round(position.x / gridSize) * gridSize,
        y: Math.round(position.y / gridSize) * gridSize
      };
    }
    
    // Always ensure positions are integers to avoid API errors
    return {
      x: Math.round(result.x),
      y: Math.round(result.y)
    };
  };
  
  // Start dragging a table
  const handleTableDragStart = (table: Table, e: React.MouseEvent) => {
    if (table.isLocked) {
      toast({
        title: "Table Locked",
        description: "This table is locked and cannot be moved.",
        variant: "destructive"
      });
      return;
    }
    
    e.stopPropagation();
    
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    setIsDragging(true);
    setDraggedTable(table);
    setDragStartPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    // Set global mouse event handlers
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);
  };
  
  // Handle document-level mouse move (for dragging outside the component)
  const handleDocumentMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !draggedTable || !canvasRef.current || !dragStartPosition) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Calculate new position with offset
    const dx = currentX - dragStartPosition.x;
    const dy = currentY - dragStartPosition.y;
    
    const newX = draggedTable.x + dx;
    const newY = draggedTable.y + dy;
    
    // Apply grid snapping if enabled
    const snappedPosition = applyGridSnap({ x: newX, y: newY });
    
    // Update the dragged table position visually - we'll persist on mouse up
    setDraggedTable({
      ...draggedTable,
      x: snappedPosition.x,
      y: snappedPosition.y
    });
    
    // Update drag start position for next move
    setDragStartPosition({
      x: currentX,
      y: currentY
    });
  }, [isDragging, draggedTable, dragStartPosition, canvasRef, snapToGrid, gridSize]);
  
  // End dragging and save new position
  const handleDocumentMouseUp = useCallback(() => {
    if (isDragging && draggedTable && selectedVenueId) {
      // Persist the table's new position to the database
      const updatedTable = { ...draggedTable };
      updateTableMutation.mutate(updatedTable);
      
      // Add to history for undo/redo
      if (tablesData) {
        const updatedTables = (tablesData as Table[]).map(t => 
          t.id === draggedTable.id ? draggedTable : t
        );
        addToHistory(updatedTables);
      }
    }
    
    // Reset dragging state
    setIsDragging(false);
    setDraggedTable(null);
    setDragStartPosition(null);
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleDocumentMouseMove);
    document.removeEventListener('mouseup', handleDocumentMouseUp);
  }, [isDragging, draggedTable, selectedVenueId, updateTableMutation, tablesData, addToHistory]);
  
  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [handleDocumentMouseMove, handleDocumentMouseUp]);
  
  // Handle mouse movement on the canvas
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // If in add mode, show a visual preview of where the table will be placed
    const snappedPosition = snapToGrid ? applyGridSnap({ x, y }) : { x, y };
    setMousePosition(snappedPosition);
  };
  
  // Handle mouse click on the canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If we're in add mode, create a new table at the clicked position
    if (isAddMode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Apply grid snapping if enabled
      const snappedPosition = snapToGrid ? applyGridSnap({ x, y }) : { x, y };
      
      // Create new table at clicked position
      const newTableData = {
        ...tableForm.getValues(),
        venueId: selectedVenueId as number,
        floor: currentFloor,
        x: snappedPosition.x,
        y: snappedPosition.y,
      };
      
      updateTableMutation.mutate(newTableData as Table);
    } else if (!isDragging) {
      // If not in add mode and not dragging, deselect the current table
      setSelectedTable(null);
      setSelectedTables([]);
    }
  };
  
  // Handle form submission for table editing
  const onSubmitTableForm = (data: z.infer<typeof tableFormSchema>) => {
    if (selectedTable) {
      // Update existing table
      const updatedTable = {
        ...selectedTable,
        ...data,
      };
      updateTableMutation.mutate(updatedTable);
    }
  };
  
  // Handle bulk table creation
  const onSubmitBulkTableForm = (data: z.infer<typeof bulkTableFormSchema>) => {
    if (!canvasRef.current || !selectedVenueId) return;
    
    // Calculate center of canvas for positioning
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate grid layout
    const { startNumber, count, capacity, shape, zone, status, priceCategory, spacing, rows } = data;
    const tablesPerRow = Math.ceil(count / rows);
    
    // Starting position - center the grid
    const startX = centerX - (spacing * (tablesPerRow - 1)) / 2;
    const startY = centerY - (spacing * (rows - 1)) / 2;
    
    // Apply grid snapping if enabled
    const snappedStartPosition = snapToGrid 
      ? applyGridSnap({ x: startX, y: startY }) 
      : { x: startX, y: startY };
    
    // Create array of table data for bulk creation
    const newTables = Array.from({ length: count }, (_, i) => {
      const row = Math.floor(i / tablesPerRow);
      const col = i % tablesPerRow;
      
      // Calculate position with snapping
      const rawX = snappedStartPosition.x + col * spacing;
      const rawY = snappedStartPosition.y + row * spacing;
      const position = snapToGrid 
        ? applyGridSnap({ x: rawX, y: rawY }) 
        : { x: rawX, y: rawY };
      
      return {
        tableNumber: startNumber + i,
        capacity,
        shape,
        zone,
        status,
        priceCategory,
        venueId: selectedVenueId,
        floor: currentFloor,
        x: position.x,
        y: position.y,
        isLocked: false
      };
    });
    
    // Create tables in sequence
    toast({
      title: "Bulk Create Initiated",
      description: `Creating ${count} tables...`,
    });
    
    // Create tables sequentially
    const createTablesSequentially = async () => {
      try {
        for (const tableData of newTables) {
          await apiRequest(
            "POST",
            `/api/admin/tables`,
            tableData
          );
        }
        
        toast({
          title: "Success",
          description: `${count} tables created successfully`,
        });
        queryClient.invalidateQueries({ queryKey: ['venue-tables', selectedVenueId] });
        setIsBulkAddMode(false);
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to create tables: ${(error as Error).message}`,
          variant: "destructive",
        });
      }
    };
    
    createTablesSequentially();
  };
  
  // We already have utility functions for status color and price category badges higher up in the file
  
  // Cancel current action
  const handleCancel = () => {
    setIsAddMode(false);
    setIsBulkAddMode(false);
    setSelectedTable(null);
    setSelectedTables([]);
  };

  // Main render
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Venue Layout Manager</h1>
          
          {/* Status indicator - collaboration removed */}
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full mr-1 bg-green-500" />
            <span className="text-xs text-muted-foreground">
              Layout Manager Active
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyIndex <= 0}>
            <Undo className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button variant="outline" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
            <Redo className="h-4 w-4 mr-1" />
            Redo
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Venue Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Venue</CardTitle>
              <CardDescription>Select the venue to manage</CardDescription>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedVenueId?.toString()} 
                onValueChange={(value) => handleSelectVenue(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map(venue => (
                    <SelectItem key={venue.id} value={venue.id.toString()}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          {/* Layout Template Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Layout Template</CardTitle>
              <CardDescription>Select or create a template</CardDescription>
            </CardHeader>
            <CardContent>
              <Select 
                value={currentTemplate || ""} 
                onValueChange={setCurrentTemplate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {layoutTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="mt-4">
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  New Template
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Floor Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Floors</CardTitle>
              <CardDescription>Manage venue floors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {floors.map(floor => (
                  <div 
                    key={floor.id}
                    className={`p-2 rounded cursor-pointer flex items-center justify-between ${
                      floor.id === currentFloor ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                    onClick={() => handleFloorSelection(floor.id)}
                  >
                    <span>{floor.name}</span>
                    {floor.isActive && <Badge variant="outline">Active</Badge>}
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Floor
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Table Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Table Actions</CardTitle>
              <CardDescription>Manage tables and zones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant={isAddMode ? "default" : "outline"} 
                size="sm" 
                className="w-full"
                onClick={handleAddTable}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Single Table
              </Button>
              <Button 
                variant={isBulkAddMode ? "default" : "outline"} 
                size="sm" 
                className="w-full"
                onClick={handleBulkAddTables}
              >
                <TableIcon className="h-4 w-4 mr-1" />
                Bulk Add Tables
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                disabled={!selectedTable && selectedTables.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1 text-red-500" />
                Delete Selected
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Floor Plan and Table Editor */}
          <Tabs defaultValue="visual" className="w-full">
            <TabsList>
              <TabsTrigger value="visual">Visual Editor</TabsTrigger>
              <TabsTrigger value="tabular">Tabular View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="visual" className="space-y-4">
              {/* Canvas for visual editing */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>{floors.find(f => f.id === currentFloor)?.name || "Floor Plan"}</CardTitle>
                  <CardDescription>
                    {isAddMode ? "Click on the floor plan to place a new table" : 
                     isBulkAddMode ? "Configure bulk table creation" : 
                     "Click on a table to edit or drag to move"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-[500px] relative">
                  <div 
                    ref={canvasRef}
                    className="w-full h-[500px] border rounded bg-gray-50 relative overflow-hidden"
                    style={{
                      backgroundImage: `url(${floors.find(f => f.id === currentFloor)?.image})`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                    onMouseMove={handleCanvasMouseMove}
                    onClick={handleCanvasClick}
                  >
                    {/* Render all tables on current floor */}
                    {currentFloorTables.map(table => {
                      // Determine table styling based on status, size, etc.
                      const isSelected = selectedTable?.id === table.id || 
                                        selectedTables.some(t => t.id === table.id);
                      
                      // Dynamic styles based on table attributes
                      const statusColorMap = {
                        'available': '#10b981',
                        'reserved': '#3b82f6',
                        'unavailable': '#ef4444',
                      };
                      
                      const baseStyle = {
                        backgroundColor: isSelected ? '#8b5cf650' : 
                                        statusColorMap[table.status as keyof typeof statusColorMap] || 
                                        zones.find(z => z.id === table.zone)?.color || '#60a5fa',
                        position: 'absolute' as const,
                        cursor: table.isLocked ? 'not-allowed' : 'pointer',
                        opacity: table.status === 'unavailable' ? 0.7 : 1,
                        border: isSelected ? '2px solid #8b5cf6' : `2px solid ${statusColorMap[table.status as keyof typeof statusColorMap] || '#60a5fa'}`,
                      };
                      
                      // Size based on capacity
                      const tableSize = Math.max(40, Math.min(100, table.capacity * 6));
                      const sizeStyle = {
                        width: `${tableSize}px`,
                        height: table.shape === 'half-circle' ? `${tableSize / 2}px` : `${tableSize}px`,
                      };
                      
                      // Position (centered on the table's coordinates)
                      const positionStyle = {
                        left: `${table.x - tableSize/2}px`,
                        top: `${table.y - (table.shape === 'half-circle' ? tableSize/4 : tableSize/2)}px`,
                      };
                      
                      // Outline for selected tables
                      const outlineStyle = isSelected ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.1)';
                      
                      // Class for shape
                      const className = table.shape === 'square' ? 'rounded-md' : '';

                      return (
                        <div
                          key={table.id}
                          className={`${className} rounded-full`}
                          style={{
                            ...baseStyle,
                            ...sizeStyle,
                            ...positionStyle,
                            border: outlineStyle,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            // For half-circle tables
                            borderTopLeftRadius: table.shape === 'half-circle' ? '0' : undefined,
                            borderTopRightRadius: table.shape === 'half-circle' ? '0' : undefined,
                            borderBottomLeftRadius: table.shape === 'half-circle' ? '100px' : undefined,
                            borderBottomRightRadius: table.shape === 'half-circle' ? '100px' : undefined,
                          }}
                          onClick={(e) => handleMultiSelectTable(table, e)}
                        >
                          <span className="text-white font-semibold text-sm">
                            {table.tableNumber}
                          </span>
                        </div>
                      );
                    })}
                    
                    {/* Indicator for where a new table will be placed in add mode */}
                    {isAddMode && (
                      <div 
                        className="absolute rounded-full bg-primary/50 border-2 border-dashed border-primary"
                        style={{
                          width: '60px',
                          height: '60px',
                          left: `${mousePosition.x - 30}px`,
                          top: `${mousePosition.y - 30}px`,
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Table Configuration Forms */}
              {selectedTable && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Edit Table {selectedTable.tableNumber}</CardTitle>
                    <CardDescription>Modify table properties</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...tableForm}>
                      <form onSubmit={tableForm.handleSubmit(onSubmitTableForm)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={tableForm.control}
                            name="tableNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Table Number</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
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
                                  <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
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
                            name="zone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Zone</FormLabel>
                                <Select 
                                  value={field.value || ""} 
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select zone" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="">No Zone</SelectItem>
                                    {zones.map(zone => (
                                      <SelectItem key={zone.id} value={zone.id}>
                                        {zone.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
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
                                    <SelectItem value="budget">Budget</SelectItem>
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                    <SelectItem value="vip">VIP</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={tableForm.control}
                          name="isLocked"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Lock table position</FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={handleCancel}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">
                            <Save className="h-4 w-4 mr-1" />
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
              
              {/* Bulk Add Form */}
              {isBulkAddMode && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Bulk Add Tables</CardTitle>
                    <CardDescription>Create multiple tables at once</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...bulkTableForm}>
                      <form onSubmit={bulkTableForm.handleSubmit(onSubmitBulkTableForm)} className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={bulkTableForm.control}
                            name="startNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Number</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
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
                                  <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={bulkTableForm.control}
                            name="capacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Capacity</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
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
                          
                          <FormField
                            control={bulkTableForm.control}
                            name="zone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Zone</FormLabel>
                                <Select 
                                  value={field.value || ""} 
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select zone" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="">No Zone</SelectItem>
                                    {zones.map(zone => (
                                      <SelectItem key={zone.id} value={zone.id}>
                                        {zone.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
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
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
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
                                    <SelectItem value="budget">Budget</SelectItem>
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                    <SelectItem value="vip">VIP</SelectItem>
                                  </SelectContent>
                                </Select>
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
                                  <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={bulkTableForm.control}
                            name="rows"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Number of Rows</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={handleCancel}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">
                            <TableIcon className="h-4 w-4 mr-1" />
                            Create Tables
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="tabular">
              {/* Tabular view of tables */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Tables on {floors.find(f => f.id === currentFloor)?.name}</CardTitle>
                  <CardDescription>Tabular view of all tables on this floor</CardDescription>
                </CardHeader>
                <CardContent>
                  {isAddMode || isBulkAddMode ? (
                    <div className="text-center p-4 border rounded-md bg-muted">
                      <p>Please complete or cancel the current action first</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={handleCancel}
                      >
                        Cancel {isAddMode ? 'Add Table' : 'Bulk Add Tables'}
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Number</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Shape</TableHead>
                          <TableHead>Zone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentFloorTables.map(table => (
                          <TableRow 
                            key={table.id}
                            className={
                              selectedTable?.id === table.id || selectedTables.some(t => t.id === table.id)
                              ? 'bg-primary/10'
                              : ''
                            }
                          >
                            <TableCell>{table.tableNumber}</TableCell>
                            <TableCell>{table.capacity}</TableCell>
                            <TableCell>
                              {table.shape === 'round' ? 'Round' : 
                              table.shape === 'square' ? 'Square' : 
                              'Half Circle'}
                            </TableCell>
                            <TableCell>
                              {table.zone ? (
                                <div className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-1"
                                    style={{backgroundColor: zones.find(z => z.id === table.zone)?.color}}
                                  />
                                  {zones.find(z => z.id === table.zone)?.name || table.zone}
                                </div>
                              ) : 'None'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(table.status)}>
                                {table.status ? table.status.charAt(0).toUpperCase() + table.status.slice(1) : 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getPriceCategoryBadgeClass(table.priceCategory)}>
                                {table.priceCategory ? table.priceCategory.charAt(0).toUpperCase() + table.priceCategory.slice(1) : 'Standard'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleSelectTable(table)}
                                disabled={table.isLocked}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}