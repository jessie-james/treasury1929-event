import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  PlusCircle, 
  Edit, 
  Trash, 
  Save,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Copy,
  RotateCcw,
  RotateCw,
  Layers,
  Image,
  Upload,
  Download,
  ChevronRight,
  Crop,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Grid,
  LayoutGrid,
  Settings,
  Info,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  TableProperties,
  Check,
  Grab,
  Move,
  Hand,
  Eraser,
  MapPin,
  FolderOpen,
  Maximize,
  Minimize,
  Search,
  AlertCircle
} from "lucide-react";

// Define types
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

// Form validation schema
const tableFormSchema = z.object({
  tableNumber: z.coerce.number().min(1, "Table number is required"),
  shape: z.enum(["round", "square", "half-circle"], {
    required_error: "Please select a table shape",
  }),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").max(20, "Maximum capacity is 20"),
  x: z.coerce.number(),
  y: z.coerce.number(),
  floor: z.string().default("main"),
  venueId: z.coerce.number(),
  zone: z.string().optional(),
  priceCategory: z.enum(["standard", "premium", "vip", "budget"]).default("standard"),
  status: z.enum(["available", "reserved", "unavailable"]).default("available"),
  isLocked: z.boolean().default(false),
});

const zoneFormSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
});

const floorFormSchema = z.object({
  name: z.string().min(1, "Floor name is required"),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
});

const bulkTableFormSchema = z.object({
  startNumber: z.coerce.number().min(1, "Start number is required"),
  count: z.coerce.number().min(1, "Count must be at least 1").max(50, "Maximum is 50 tables"),
  shape: z.enum(["round", "square", "half-circle"]),
  capacity: z.coerce.number().min(1).max(20),
  arrangement: z.enum(["grid", "circle", "row", "column"]),
  spacing: z.coerce.number().min(10).max(200),
  floor: z.string(),
  zone: z.string().optional(),
  priceCategory: z.enum(["standard", "premium", "vip", "budget"]).default("standard"),
});

// Main component
export default function LayoutSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // State variables
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTables, setSelectedTables] = useState<Table[]>([]);
  const [venues, setVenues] = useState<{id: number, name: string}[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number>(1);
  const [dragStart, setDragStart] = useState<CanvasPosition | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isBulkAddMode, setIsBulkAddMode] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [movementDelta, setMovementDelta] = useState({ x: 1, y: 1 });
  const [floors, setFloors] = useState<Floor[]>([
    { id: 'main', name: 'Main Floor', image: '/mezzanine.jpg', isActive: true },
    { id: 'mezzanine', name: 'Mezzanine', image: '/mezzanine.jpg', isActive: true },
    { id: 'vip', name: 'VIP Area', image: '/mezzanine.jpg', isActive: false },
  ]);
  const [currentFloor, setCurrentFloor] = useState<string>('main');
  const [zoom, setZoom] = useState<number>(100);
  const [zones, setZones] = useState<Zone[]>([
    { id: 'front-stage', name: 'Front Stage', color: '#FF5757', tables: [] },
    { id: 'center', name: 'Center', color: '#57B3FF', tables: [] },
    { id: 'back', name: 'Back', color: '#57FFA0', tables: [] },
  ]);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [history, setHistory] = useState<Table[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [contextMenuTable, setContextMenuTable] = useState<Table | null>(null);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [isGridVisible, setIsGridVisible] = useState<boolean>(true);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [pan, setPan] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [layoutTemplates, setLayoutTemplates] = useState<LayoutTemplate[]>([
    {
      id: 'concert',
      name: 'Concert Layout',
      description: 'Standard setup for musical performances',
      floors: floors,
      createdAt: new Date(),
      lastModified: new Date()
    },
    {
      id: 'dinner',
      name: 'Dinner Event',
      description: 'Optimized for dining experience',
      floors: floors,
      createdAt: new Date(),
      lastModified: new Date()
    }
  ]);
  const [currentTemplate, setCurrentTemplate] = useState<string | null>('concert');
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  // Form for individual table editing
  const tableForm = useForm<z.infer<typeof tableFormSchema>>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      tableNumber: 1,
      shape: "round",
      capacity: 4,
      x: 100,
      y: 100,
      floor: currentFloor,
      venueId: selectedVenueId,
      zone: undefined,
      priceCategory: "standard",
      status: "available",
      isLocked: false,
    },
  });

  // Form for zone editing
  const zoneForm = useForm<z.infer<typeof zoneFormSchema>>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      name: "",
      color: "#3B82F6",
    },
  });

  // Form for bulk table creation
  const bulkTableForm = useForm<z.infer<typeof bulkTableFormSchema>>({
    resolver: zodResolver(bulkTableFormSchema),
    defaultValues: {
      startNumber: 1,
      count: 5,
      shape: "round",
      capacity: 4,
      arrangement: "grid",
      spacing: 60,
      floor: currentFloor,
      zone: undefined,
      priceCategory: "standard",
    },
  });

  // Form for floor management
  const floorForm = useForm<z.infer<typeof floorFormSchema>>({
    resolver: zodResolver(floorFormSchema),
    defaultValues: {
      name: "",
      image: undefined,
      isActive: true,
    },
  });

  // Fetch venues
  const { data: venueData } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/venues');
      return response.json();
    },
  });

  // Fetch tables for selected venue and floor
  const { data: tablesData = [], isLoading: isTablesLoading } = useQuery({
    queryKey: ['tables', selectedVenueId, currentFloor],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/tables?venueId=${selectedVenueId}&floor=${currentFloor}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch tables');
      }
      const tables = await response.json();
      
      // Update zone tables
      zones.forEach(zone => {
        zone.tables = tables
          .filter((table: Table) => table.zone === zone.id)
          .map((table: Table) => table.id);
      });
      
      return tables;
    },
    enabled: !!selectedVenueId && !!currentFloor,
  });

  // Filter tables for the current floor
  const currentFloorTables = useMemo(() => {
    if (!tablesData) return [];
    return (tablesData as Table[]).filter(table => table.floor === currentFloor);
  }, [tablesData, currentFloor]);

  // Create table mutation
  const createTableMutation = useMutation({
    mutationFn: async (tableData: z.infer<typeof tableFormSchema>) => {
      const response = await apiRequest('POST', '/api/admin/tables', tableData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create table');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Table created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['tables', selectedVenueId, currentFloor] });
      addToHistory(currentFloorTables);
      setIsAddMode(false);
      tableForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update table mutation
  const updateTableMutation = useMutation({
    mutationFn: async (tableData: Table) => {
      const { id, ...rest } = tableData;
      const response = await apiRequest('PUT', `/api/admin/tables/${id}`, rest);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update table');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: "Table updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['tables', selectedVenueId, currentFloor] });
      addToHistory(currentFloorTables);
      
      // Broadcast the change via WebSocket for real-time collaboration
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
          type: 'table_update',
          tableId: variables.id,
          venueId: selectedVenueId,
          floor: currentFloor,
          data: variables
        }));
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete table mutation
  const deleteTableMutation = useMutation({
    mutationFn: async (tableId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/tables/${tableId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete table');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Table deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['tables', selectedVenueId, currentFloor] });
      setSelectedTable(null);
      addToHistory(currentFloorTables);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update floor image mutation (mock for now)
  const updateFloorImageMutation = useMutation({
    mutationFn: async (data: { floorId: string, imageFile: File }) => {
      // This would typically upload the file to your server
      // For now, we'll just simulate success
      return new Promise<string>(resolve => {
        setTimeout(() => {
          resolve('/mezzanine.jpg'); // Path to the uploaded image
        }, 1000);
      });
    },
    onSuccess: (imagePath, variables) => {
      const updatedFloors = floors.map(floor => {
        if (floor.id === variables.floorId) {
          return { ...floor, image: imagePath };
        }
        return floor;
      });
      setFloors(updatedFloors);
      toast({
        title: "Success",
        description: "Floor plan image updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload floor plan image",
        variant: "destructive",
      });
    }
  });

  // Setup WebSocket connection for real-time collaboration
  const setupWebSocketConnection = useCallback(() => {
    // Don't create a new connection if we already have an active one
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected and open, reusing connection');
      
      // Make sure we're subscribed to the current venue
      if (selectedVenueId) {
        wsConnection.send(JSON.stringify({
          type: 'subscribe_venue',
          venueId: selectedVenueId
        }));
      }
      return;
    }
    
    // If connection is connecting, wait for it to establish
    if (wsConnection && wsConnection.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket is currently connecting, waiting');
      return;
    }
    
    // Close any existing connection
    if (wsConnection) {
      console.log('Closing existing WebSocket connection');
      wsConnection.close();
    }

    // Determine correct WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    setConnectionStatus('connecting');
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setConnectionStatus('connected');
      
      // Subscribe to updates for the current venue
      if (selectedVenueId) {
        ws.send(JSON.stringify({
          type: 'subscribe_venue',
          venueId: selectedVenueId
        }));
      }
    };
    
    ws.onmessage = (event) => {
      try {
        // Make sure the event data is not empty or invalid
        if (!event.data) {
          console.error('Received empty WebSocket message');
          return;
        }
        
        const message = JSON.parse(event.data);
        console.log('Received WebSocket message:', message);
        
        // Validate required message fields
        if (!message || !message.type) {
          console.error('Invalid WebSocket message format:', message);
          return;
        }
        
        switch (message.type) {
          case 'table_updated':
            // Invalidate the table query to refresh data
            queryClient.invalidateQueries({ queryKey: ['tables', selectedVenueId, currentFloor] });
            toast({
              title: "Table Updated",
              description: `Table #${message.data?.tableNumber || ''} was updated by another user`,
            });
            break;
            
          case 'bulk_tables_updated':
            // Refresh all tables
            queryClient.invalidateQueries({ queryKey: ['tables', selectedVenueId, currentFloor] });
            toast({
              title: "Layout Updated",
              description: "Multiple tables were updated by another user",
            });
            break;
            
          case 'floor_image_updated':
            // Refresh floor data
            if (message.floorId === currentFloor) {
              // Update the floor image directly in the state
              setFloors(prevFloors => prevFloors.map(floor => 
                floor.id === message.floorId 
                  ? { ...floor, image: message.imageUrl } 
                  : floor
              ));
              
              toast({
                title: "Floor Plan Updated",
                description: `The floor plan for ${message.floorName || 'current floor'} was updated`,
              });
            }
            break;
            
          case 'floor_changed':
            // Another user switched to a different floor in the layout editor
            toast({
              title: "Floor Change",
              description: "Another user changed to a different floor view",
            });
            
            // Optionally, you could follow them to that floor:
            // if (message.floorId !== currentFloor) {
            //   handleSelectFloor(message.floorId);
            // }
            break;
            
          case 'ping':
            // Keep-alive ping, no action needed
            break;
            
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket connection closed', event.code, event.reason);
      
      // Only change state if this is the current connection
      if (wsConnection === ws) {
        setConnectionStatus('disconnected');
      
        // Attempt to reconnect after a delay if not closed cleanly
        if (event.code !== 1000 && event.code !== 1001) {
          // Use setTimeout with explicit function to prevent closure issues
          console.log('Planning reconnection in 3 seconds');
          setTimeout(function() {
            if (document.visibilityState !== 'hidden') {
              console.log('Attempting reconnection after close');
              setupWebSocketConnection();
            }
          }, 3000);
        }
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Only change state if this is the current connection
      if (wsConnection === ws) {
        setConnectionStatus('disconnected');
      }
    };
    
    setWsConnection(ws);
  }, [selectedVenueId, queryClient, toast]);
  
  // Initialize WebSocket once when component mounts
  useEffect(() => {
    console.log('Initial WebSocket setup');
    setupWebSocketConnection();
    
    // Add visibility change listener to reconnect when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && connectionStatus !== 'connected') {
        console.log('Tab became visible, reconnecting WebSocket');
        setupWebSocketConnection();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up when component unmounts
    return () => {
      console.log('Component unmounting, cleaning up WebSocket');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  // Handle venue ID changes - update WebSocket subscription
  useEffect(() => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN && selectedVenueId) {
      console.log(`Subscribing to venue ${selectedVenueId} after venue change`);
      wsConnection.send(JSON.stringify({
        type: 'subscribe_venue',
        venueId: selectedVenueId
      }));
    }
  }, [selectedVenueId, wsConnection]);
  
  // Set venues when data is loaded
  useEffect(() => {
    if (venueData) {
      setVenues(venueData);
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
        tableNumber: selectedTable.tableNumber,
        shape: selectedTable.shape,
        capacity: selectedTable.capacity,
        x: selectedTable.x,
        y: selectedTable.y,
        floor: selectedTable.floor || currentFloor,
        venueId: selectedVenueId,
        zone: selectedTable.zone,
        priceCategory: selectedTable.priceCategory || "standard",
        status: selectedTable.status || "available",
        isLocked: selectedTable.isLocked || false,
      });
    } else if (isAddMode) {
      // Reset to default values for new table
      tableForm.reset({
        tableNumber: getNextTableNumber(),
        shape: "round",
        capacity: 4,
        x: canvasRef.current ? Math.round(canvasRef.current.clientWidth / 2) : 100,
        y: canvasRef.current ? Math.round(canvasRef.current.clientHeight / 2) : 100,
        floor: currentFloor,
        venueId: selectedVenueId,
        zone: undefined,
        priceCategory: "standard",
        status: "available",
        isLocked: false,
      });
    }
  }, [selectedTable, isAddMode, currentFloorTables, tableForm, selectedVenueId, currentFloor]);

  // Initialize history on component mount or when floor/venue changes
  useEffect(() => {
    if (currentFloorTables.length > 0 && historyIndex === -1) {
      addToHistory(currentFloorTables);
    }
  }, [currentFloorTables]);

  // Add tables state to history
  const addToHistory = (tables: Table[]) => {
    // If we're not at the end of the history, remove future states
    if (historyIndex !== history.length - 1 && historyIndex !== -1) {
      setHistory(history.slice(0, historyIndex + 1));
    }
    
    // Add current state to history
    setHistory(prev => [...prev, [...tables]]);
    setHistoryIndex(prev => prev + 1);
    
    // Keep history size reasonable
    if (history.length > 30) {
      setHistory(prev => prev.slice(prev.length - 30));
      setHistoryIndex(prev => prev > 0 ? prev - 1 : 0);
    }
  };

  // Undo changes
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      // Here you would update tables from history[historyIndex - 1]
      // This would require API calls to update the database
      toast({
        title: "Undo",
        description: "Reverted to previous state",
      });
    }
  };

  // Redo changes
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      // Here you would update tables from history[historyIndex + 1]
      // This would require API calls to update the database
      toast({
        title: "Redo",
        description: "Restored changes",
      });
    }
  };

  // Get the next available table number
  const getNextTableNumber = () => {
    if (currentFloorTables.length === 0) return 1;
    
    const maxTableNumber = Math.max(
      ...currentFloorTables.map(table => table.tableNumber)
    );
    return maxTableNumber + 1;
  };

  // Handle venue selection
  const handleSelectVenue = (venueId: string) => {
    setSelectedVenueId(parseInt(venueId));
    setSelectedTable(null);
    setSelectedTables([]);
    setHistoryIndex(-1);
    setHistory([]);
  };

  // Handle floor selection
  const handleSelectFloor = (floorId: string) => {
    setCurrentFloor(floorId);
    setSelectedTable(null);
    setSelectedTables([]);
    setHistoryIndex(-1);
    setHistory([]);
    
    // Notify other collaborators via WebSocket when changing floors
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      console.log(`Broadcasting floor change to ${floorId}`);
      wsConnection.send(JSON.stringify({
        type: 'floor_change',
        venueId: selectedVenueId,
        floorId: floorId
      }));
    }
  };

  // Handle table creation mode
  const handleAddTable = () => {
    setSelectedTable(null);
    setSelectedTables([]);
    setIsAddMode(true);
    setIsBulkAddMode(false);
  };

  // Handle bulk table creation mode
  const handleBulkAddTables = () => {
    setSelectedTable(null);
    setSelectedTables([]);
    setIsAddMode(false);
    setIsBulkAddMode(true);
  };

  // Handle single table form submission
  const handleTableFormSubmit = (data: z.infer<typeof tableFormSchema>) => {
    if (isAddMode) {
      createTableMutation.mutate(data);
    } else if (selectedTable) {
      updateTableMutation.mutate({
        ...selectedTable,
        ...data,
      });
      setSelectedTable(null);
    }
  };

  // Handle bulk table creation
  const handleBulkTableSubmit = (data: z.infer<typeof bulkTableFormSchema>) => {
    // Calculate positions based on arrangement
    const positions: { x: number, y: number }[] = [];
    const { startNumber, count, arrangement, spacing } = data;
    
    // Center point for arrangements
    const centerX = canvasRef.current ? Math.round(canvasRef.current.clientWidth / 2) : 200;
    const centerY = canvasRef.current ? Math.round(canvasRef.current.clientHeight / 2) : 200;
    
    switch (arrangement) {
      case 'grid': {
        // Calculate grid dimensions (try to make it square-ish)
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        
        // Calculate top-left corner to center the grid
        const startX = centerX - ((cols - 1) * spacing) / 2;
        const startY = centerY - ((rows - 1) * spacing) / 2;
        
        // Generate positions
        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / cols);
          const col = i % cols;
          positions.push({
            x: Math.round(startX + col * spacing),
            y: Math.round(startY + row * spacing),
          });
        }
        break;
      }
      case 'circle': {
        // Distribute evenly around a circle
        const radius = spacing * 2;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * 2 * Math.PI;
          positions.push({
            x: Math.round(centerX + radius * Math.cos(angle)),
            y: Math.round(centerY + radius * Math.sin(angle)),
          });
        }
        break;
      }
      case 'row': {
        // Single row
        const startX = centerX - ((count - 1) * spacing) / 2;
        for (let i = 0; i < count; i++) {
          positions.push({
            x: Math.round(startX + i * spacing),
            y: centerY,
          });
        }
        break;
      }
      case 'column': {
        // Single column
        const startY = centerY - ((count - 1) * spacing) / 2;
        for (let i = 0; i < count; i++) {
          positions.push({
            x: centerX,
            y: Math.round(startY + i * spacing),
          });
        }
        break;
      }
    }
    
    // Create tables in sequence
    const createTablesSequentially = async () => {
      let successCount = 0;
      const createdTableIds: number[] = [];
      
      for (let i = 0; i < count; i++) {
        try {
          const result = await createTableMutation.mutateAsync({
            tableNumber: startNumber + i,
            shape: data.shape,
            capacity: data.capacity,
            x: positions[i].x,
            y: positions[i].y,
            floor: data.floor,
            venueId: selectedVenueId,
            zone: data.zone,
            priceCategory: data.priceCategory,
            status: "available",
            isLocked: false,
          });
          
          successCount++;
          if (result.id) {
            createdTableIds.push(result.id);
          }
        } catch (error) {
          console.error(`Failed to create table ${startNumber + i}:`, error);
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `Created ${successCount} of ${count} tables`,
        });
        queryClient.invalidateQueries({ queryKey: ['tables', selectedVenueId, currentFloor] });
        setIsBulkAddMode(false);
        addToHistory(currentFloorTables);
        
        // Broadcast bulk table creation via WebSocket
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            type: 'bulk_tables_update', // Without 'd', as the server expects
            venueId: selectedVenueId,
            floor: data.floor,
            count: successCount,
            arrangement: data.arrangement,
            tableIds: createdTableIds
          }));
        }
      }
    };
    
    createTablesSequentially();
  };

  // Handle table deletion
  const handleDeleteTable = () => {
    if (selectedTable) {
      deleteTableMutation.mutate(selectedTable.id);
    } else if (selectedTables.length > 0) {
      // Delete multiple tables
      const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedTables.length} tables?`);
      if (confirmDelete) {
        const deleteTablesSequentially = async () => {
          let successCount = 0;
          for (const table of selectedTables) {
            try {
              await deleteTableMutation.mutateAsync(table.id);
              successCount++;
            } catch (error) {
              console.error(`Failed to delete table ${table.tableNumber}:`, error);
            }
          }
          
          if (successCount > 0) {
            toast({
              title: "Success",
              description: `Deleted ${successCount} of ${selectedTables.length} tables`,
            });
            setSelectedTables([]);
            queryClient.invalidateQueries({ queryKey: ['tables', selectedVenueId, currentFloor] });
            addToHistory(currentFloorTables);
            
            // Broadcast bulk table deletion via WebSocket
            if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
              wsConnection.send(JSON.stringify({
                type: 'bulk_tables_update',
                venueId: selectedVenueId,
                floor: currentFloor,
                operation: 'delete',
                count: successCount
              }));
            }
          }
        };
        
        deleteTablesSequentially();
      }
    }
  };

  // Cancel form editing
  const handleCancel = () => {
    setSelectedTable(null);
    setIsAddMode(false);
    setIsBulkAddMode(false);
    tableForm.reset();
    bulkTableForm.reset();
  };

  // Handle floor image upload
  const handleFloorImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateFloorImageMutation.mutate({ 
        floorId: currentFloor, 
        imageFile: file 
      },
      {
        onSuccess: (imagePath) => {
          // Update the floor image in the current state
          setFloors(prevFloors => prevFloors.map(floor => 
            floor.id === currentFloor 
              ? { ...floor, image: imagePath } 
              : floor
          ));
          
          // Broadcast floor image update via WebSocket
          if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            const currentFloorData = floors.find(f => f.id === currentFloor);
            wsConnection.send(JSON.stringify({
              type: 'floor_image_updated',
              venueId: selectedVenueId,
              floorId: currentFloor,
              floorName: currentFloorData?.name || 'Floor',
              imageUrl: imagePath
            }));
          }
          
          toast({
            title: "Success",
            description: "Floor plan image updated successfully",
          });
        }
      });
    }
  };

  // Toggle between mouse modes
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setIsPanMode(false);
    
    if (isMultiSelectMode) {
      setSelectedTables([]);
    }
  };

  const togglePanMode = () => {
    setIsPanMode(!isPanMode);
    setIsMultiSelectMode(false);
  };

  // Select a single table
  const handleSelectTable = (table: Table, event: React.MouseEvent) => {
    try {
      if (event.defaultPrevented) return; // Skip if this was part of a drag operation
      
      if (isPanMode) return; // Skip if in pan mode
      
      if (isMultiSelectMode) {
        // In multi-select mode, add/remove from selection
        setSelectedTables(prev => {
          const isSelected = prev.some(t => t.id === table.id);
          if (isSelected) {
            return prev.filter(t => t.id !== table.id);
          } else {
            return [...prev, table];
          }
        });
      } else {
        // Regular selection mode
        setIsAddMode(false);
        setIsBulkAddMode(false);
        setSelectedTable(table);
        setSelectedTables([]);
      }
    } catch (error) {
      console.error('Error in handleSelectTable:', error);
      toast({
        title: "Error",
        description: "Something went wrong when selecting the table.",
        variant: "destructive",
      });
    }
  };

  // Handle table dragging
  const handleMouseDown = (event: React.MouseEvent, table: Table) => {
    try {
      if (!canvasRef.current) return;
      
      // Check if the table is locked and abort if so
      if (table.isLocked) {
        toast({
          title: "Table Locked",
          description: "This table is locked and cannot be moved",
          variant: "default",
        });
        return;
      }
      
      // Get canvas offset
      const rect = canvasRef.current.getBoundingClientRect();
      
      // Calculate start position
      setDragStart({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
      
      if (isMultiSelectMode) {
        // In multi-select mode, check if the table is already selected
        const isSelected = selectedTables.some(t => t.id === table.id);
        if (!isSelected) {
          setSelectedTables(prev => [...prev, table]);
        }
      } else {
        // Regular mode, select just this table
        setSelectedTable(table);
        setSelectedTables([]);
        setIsAddMode(false);
        setIsBulkAddMode(false);
      }
      
      event.preventDefault();
    } catch (error) {
      console.error('Error in handleMouseDown:', error);
      toast({
        title: "Error",
        description: "Something went wrong when handling mouse interaction.",
        variant: "destructive",
      });
    }
  };

  // Handle mouse movement for dragging
  const handleMouseMove = (event: React.MouseEvent) => {
    try {
      if (!canvasRef.current) return;
      
      if (isPanMode && event.buttons === 1) {
        // Pan the canvas
        setPan(prev => ({
          x: prev.x + event.movementX,
          y: prev.y + event.movementY
        }));
        return;
      }
      
      if (!dragStart) return;
      
      // Get canvas offset
      const rect = canvasRef.current.getBoundingClientRect();
      
      // Calculate current position
      const currentX = event.clientX - rect.left;
      const currentY = event.clientY - rect.top;
      
      // Calculate delta movement
      const deltaX = currentX - dragStart.x;
      const deltaY = currentY - dragStart.y;
      
      // Update positions
      if (isMultiSelectMode && selectedTables.length > 0) {
        // Move all selected tables
        setSelectedTables(prev => prev.map(table => ({
          ...table,
          x: Math.max(0, table.x + deltaX),
          y: Math.max(0, table.y + deltaY)
        })));
      } else if (selectedTable) {
        // Move just the selected table
        setSelectedTable({
          ...selectedTable,
          x: Math.max(0, selectedTable.x + deltaX),
          y: Math.max(0, selectedTable.y + deltaY)
      });
    }
    
    // Update drag start to current position
    setDragStart({
      x: currentX,
      y: currentY
    });
    
    } catch (error) {
      console.error('Error in handleMouseMove:', error);
      // Don't show toast here as it would be spammy during drag operations
    }
  };

  // Handle mouse up after dragging
  const handleMouseUp = () => {
    try {
      if (dragStart) {
        // Update positions in the database
        if (isMultiSelectMode && selectedTables.length > 0) {
          // Update all selected tables
          selectedTables.forEach(table => {
            if (!table.isLocked) {
              updateTableMutation.mutate(table);
            }
          });
        } else if (selectedTable && !selectedTable.isLocked) {
          // Update the selected table
          updateTableMutation.mutate(selectedTable);
        }
        
        setDragStart(null);
        addToHistory(currentFloorTables);
      }
    } catch (error) {
      console.error('Error in handleMouseUp:', error);
      setDragStart(null);
      toast({
        title: "Error",
        description: "Something went wrong when finishing the drag operation.",
        variant: "destructive",
      });
    }
  };

  // Handle mouse leave during drag
  const handleMouseLeave = () => {
    setDragStart(null);
  };

  // Configure movement delta for arrow key positioning
  const setMovementSize = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small':
        setMovementDelta({ x: 1, y: 1 });
        break;
      case 'medium':
        setMovementDelta({ x: 5, y: 5 });
        break;
      case 'large':
        setMovementDelta({ x: 10, y: 10 });
        break;
    }
  };

  // Move table with arrow keys
  const moveTable = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (isMultiSelectMode && selectedTables.length > 0) {
      // Move all selected tables
      setSelectedTables(prev => prev.map(table => {
        if (table.isLocked) return table;
        
        let newX = table.x;
        let newY = table.y;
        
        switch (direction) {
          case 'up':
            newY = Math.max(0, newY - movementDelta.y);
            break;
          case 'down':
            newY = newY + movementDelta.y;
            break;
          case 'left':
            newX = Math.max(0, newX - movementDelta.x);
            break;
          case 'right':
            newX = newX + movementDelta.x;
            break;
        }
        
        return {
          ...table,
          x: newX,
          y: newY
        };
      }));
    } else if (selectedTable && !selectedTable.isLocked) {
      // Move just the selected table
      let newX = selectedTable.x;
      let newY = selectedTable.y;
      
      switch (direction) {
        case 'up':
          newY = Math.max(0, newY - movementDelta.y);
          break;
        case 'down':
          newY = newY + movementDelta.y;
          break;
        case 'left':
          newX = Math.max(0, newX - movementDelta.x);
          break;
        case 'right':
          newX = newX + movementDelta.x;
          break;
      }
      
      setSelectedTable({
        ...selectedTable,
        x: newX,
        y: newY
      });
    }
  };

  // Apply position changes to database
  const applyChanges = () => {
    if (isMultiSelectMode && selectedTables.length > 0) {
      // Update all selected tables
      selectedTables.forEach(table => {
        if (!table.isLocked) {
          updateTableMutation.mutate(table);
        }
      });
      addToHistory(currentFloorTables);
    } else if (selectedTable && !selectedTable.isLocked) {
      // Update the selected table
      updateTableMutation.mutate(selectedTable);
      addToHistory(currentFloorTables);
    }
  };

  // Toggle lock status of selected tables
  const toggleLockStatus = () => {
    if (isMultiSelectMode && selectedTables.length > 0) {
      // Toggle lock for all selected tables
      const allLocked = selectedTables.every(table => table.isLocked);
      const newStatus = !allLocked;
      
      setSelectedTables(prev => prev.map(table => ({
        ...table,
        isLocked: newStatus
      })));
      
      // Update in database
      selectedTables.forEach(table => {
        updateTableMutation.mutate({
          ...table,
          isLocked: newStatus
        });
      });
      
      toast({
        title: newStatus ? "Tables Locked" : "Tables Unlocked",
        description: `${selectedTables.length} tables ${newStatus ? 'locked' : 'unlocked'}`,
      });
    } else if (selectedTable) {
      // Toggle lock for selected table
      const newStatus = !selectedTable.isLocked;
      
      setSelectedTable({
        ...selectedTable,
        isLocked: newStatus
      });
      
      // Update in database
      updateTableMutation.mutate({
        ...selectedTable,
        isLocked: newStatus
      });
      
      toast({
        title: newStatus ? "Table Locked" : "Table Unlocked",
        description: `Table ${selectedTable.tableNumber} ${newStatus ? 'locked' : 'unlocked'}`,
      });
    }
  };

  // Change status of selected tables
  const changeTableStatus = (status: 'available' | 'reserved' | 'unavailable') => {
    if (isMultiSelectMode && selectedTables.length > 0) {
      // Change status for all selected tables
      setSelectedTables(prev => prev.map(table => ({
        ...table,
        status
      })));
      
      // Update in database
      selectedTables.forEach(table => {
        updateTableMutation.mutate({
          ...table,
          status
        });
      });
      
      toast({
        title: "Status Updated",
        description: `${selectedTables.length} tables marked as ${status}`,
      });
    } else if (selectedTable) {
      // Change status for selected table
      setSelectedTable({
        ...selectedTable,
        status
      });
      
      // Update in database
      updateTableMutation.mutate({
        ...selectedTable,
        status
      });
      
      toast({
        title: "Status Updated",
        description: `Table ${selectedTable.tableNumber} marked as ${status}`,
      });
    }
  };

  // Helper function to get color for table status
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'available': return 'bg-green-500/50';
      case 'reserved': return 'bg-amber-500/50';
      case 'unavailable': return 'bg-red-500/50';
      default: return 'bg-blue-500/50';
    }
  };

  // Helper function to get color for table price category
  const getPriceCategoryColor = (category?: string) => {
    switch (category) {
      case 'standard': return 'border-slate-500';
      case 'premium': return 'border-amber-500';
      case 'vip': return 'border-purple-500';
      case 'budget': return 'border-green-500';
      default: return 'border-slate-500';
    }
  };

  // Helper function to get zone color for a table
  const getZoneColor = (zoneId?: string) => {
    if (!zoneId) return '';
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.color : '';
  };

  // Helper function to get class for context menu items
  const getContextMenuItemClass = () => {
    return "px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-accent rounded-sm cursor-pointer";
  };

  // Context menu handlers
  const showContextMenu = (event: React.MouseEvent, table: Table) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuTable(table);
  };

  // Method to handle zooming
  const handleZoom = (newZoom: number) => {
    setZoom(Math.max(50, Math.min(200, newZoom)));
  };

  // Method to center the canvas
  const centerCanvas = () => {
    setPan({ x: 0, y: 0 });
    setZoom(100);
  };

  // Save the current layout as a template
  const saveAsTemplate = () => {
    // This would typically involve API calls to save the template
    const templateName = prompt("Enter a name for this layout template:");
    if (templateName) {
      toast({
        title: "Template Saved",
        description: `Layout "${templateName}" saved successfully`,
      });
    }
  };

  // Load a layout template
  const loadTemplate = (templateId: string) => {
    // This would typically involve API calls to load the template
    setCurrentTemplate(templateId);
    toast({
      title: "Template Loaded",
      description: `Layout "${templateId}" loaded successfully`,
    });
    // In a real implementation, you would fetch the tables for this template and update the state
  };

  // Helper to create a color class for price category
  const getPriceCategoryBadgeClass = (category?: string) => {
    switch (category) {
      case 'standard': return 'bg-gray-100 text-gray-800';
      case 'premium': return 'bg-amber-100 text-amber-800';
      case 'vip': return 'bg-purple-100 text-purple-800';
      case 'budget': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Render tables based on their shape
  const renderTable = (table: Table) => {
    const isSelected = selectedTable?.id === table.id || 
                        selectedTables.some(t => t.id === table.id);

    // Determine styling based on various states
    const baseStyle = {
      position: 'absolute' as const,
      cursor: table.isLocked ? 'not-allowed' : 'move',
      zIndex: isSelected ? 10 : 1,
    };

    const outlineStyle = isSelected 
      ? '3px solid rgba(59, 130, 246, 0.8)' 
      : '1px solid rgba(0, 0, 0, 0.2)';

    const sizeStyle = {
      width: '30px',
      height: table.shape === 'half-circle' ? '15px' : '30px',
    };

    const positionStyle = {
      left: `${table.x}px`,
      top: `${table.y}px`,
    };

    // Add status color as background
    const backgroundColorClass = getStatusColor(table.status);
    
    // Add price category as border color
    const borderColorClass = getPriceCategoryColor(table.priceCategory);
    
    // Base style className
    let className = `table ${isSelected ? 'selected' : ''} ${backgroundColorClass} ${borderColorClass}`;
    
    if (table.isLocked) {
      className += ' border-dashed';
    }
    
    // Render based on shape
    if (table.shape === 'round') {
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
          }}
          onClick={(e) => handleSelectTable(table, e)}
          onMouseDown={(e) => handleMouseDown(e, table)}
          onContextMenu={(e) => showContextMenu(e, table)}
        >
          <span className="table-number text-xs font-semibold">
            {table.tableNumber}
          </span>
          {table.isLocked && (
            <Lock className="absolute top-0 right-0 h-3 w-3 text-gray-600" />
          )}
        </div>
      );
    } else if (table.shape === 'half-circle') {
      return (
        <div
          key={table.id}
          className={`${className} rounded-t-full`}
          style={{
            ...baseStyle,
            ...sizeStyle,
            ...positionStyle,
            border: outlineStyle,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '2px',
          }}
          onClick={(e) => handleSelectTable(table, e)}
          onMouseDown={(e) => handleMouseDown(e, table)}
          onContextMenu={(e) => showContextMenu(e, table)}
        >
          <span className="table-number text-xs font-semibold">
            {table.tableNumber}
          </span>
          {table.isLocked && (
            <Lock className="absolute top-0 right-0 h-3 w-3 text-gray-600" />
          )}
        </div>
      );
    } else { // square or default
      return (
        <div
          key={table.id}
          className={`${className}`}
          style={{
            ...baseStyle,
            ...sizeStyle,
            ...positionStyle,
            border: outlineStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => handleSelectTable(table, e)}
          onMouseDown={(e) => handleMouseDown(e, table)}
          onContextMenu={(e) => showContextMenu(e, table)}
        >
          <span className="table-number text-xs font-semibold">
            {table.tableNumber}
          </span>
          {table.isLocked && (
            <Lock className="absolute top-0 right-0 h-3 w-3 text-gray-600" />
          )}
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Venue Layout Manager</h1>
          
          {/* Connection status indicator */}
          <div className="flex items-center">
            <div 
              className={`w-2 h-2 rounded-full mr-1 ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 
                'bg-red-500'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {connectionStatus === 'connected' ? 'Real-time collaboration active' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 
               'Offline mode'}
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
      
      {/* Venue and Layout Template Selection */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-grow md:flex-grow-0">
          <Select value={selectedVenueId.toString()} onValueChange={handleSelectVenue}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a venue" />
            </SelectTrigger>
            <SelectContent>
              {venues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id.toString()}>
                  {venue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-grow md:flex-grow-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                <FolderOpen className="h-4 w-4 mr-2" />
                {currentTemplate ? 
                  layoutTemplates.find(t => t.id === currentTemplate)?.name || "Layout Templates" : 
                  "Layout Templates"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">Saved Layouts</h4>
                <Separator />
                <div className="max-h-60 overflow-y-auto">
                  {layoutTemplates.map(template => (
                    <div 
                      key={template.id} 
                      className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => loadTemplate(template.id)}
                    >
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Separator />
                <Button variant="outline" size="sm" className="w-full" onClick={saveAsTemplate}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Current Layout
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex-grow flex justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={handleAddTable}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Table
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleBulkAddTables}>
            <Copy className="h-4 w-4 mr-2" />
            Bulk Add
          </Button>
          
          {isMultiSelectMode && selectedTables.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDeleteTable}
              className="text-red-500 hover:text-red-700"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete ({selectedTables.length})
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Floor selection tabs */}
        <Card className="lg:col-span-1 order-2 lg:order-1">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Floors & Settings</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            {/* Floor selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Floors</h3>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-1">
                {floors.map(floor => (
                  <Button
                    key={floor.id}
                    variant={currentFloor === floor.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleSelectFloor(floor.id)}
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    {floor.name}
                    {!floor.isActive && (
                      <Badge variant="outline" className="ml-auto">Inactive</Badge>
                    )}
                  </Button>
                ))}
              </div>
              
              <div className="pt-2">
                <label htmlFor="floor-image-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center w-full h-9 rounded-md border border-input px-3 text-sm shadow-sm bg-background hover:bg-accent">
                    <Upload className="h-4 w-4 mr-2" />
                    <span>Upload Floor Plan</span>
                  </div>
                  <input
                    id="floor-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFloorImageUpload}
                  />
                </label>
              </div>
            </div>
            
            <Separator />
            
            {/* Editing tools */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Tools</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={isMultiSelectMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleMultiSelectMode}
                  className="w-full justify-start"
                >
                  {isMultiSelectMode ? (
                    <Eraser className="h-4 w-4 mr-2" />
                  ) : (
                    <LayoutGrid className="h-4 w-4 mr-2" />
                  )}
                  {isMultiSelectMode ? "Cancel Select" : "Multi-Select"}
                </Button>
                
                <Button
                  variant={isPanMode ? "default" : "outline"}
                  size="sm"
                  onClick={togglePanMode}
                  className="w-full justify-start"
                >
                  {isPanMode ? (
                    <Hand className="h-4 w-4 mr-2" />
                  ) : (
                    <Move className="h-4 w-4 mr-2" />
                  )}
                  {isPanMode ? "Stop Pan" : "Pan View"}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleZoom(zoom + 10)}
                  className="w-full justify-start"
                >
                  <ZoomIn className="h-4 w-4 mr-2" />
                  Zoom In
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleZoom(zoom - 10)}
                  className="w-full justify-start"
                >
                  <ZoomOut className="h-4 w-4 mr-2" />
                  Zoom Out
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={centerCanvas}
                  className="w-full justify-start col-span-2"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Center View
                </Button>
              </div>
            </div>
            
            <Separator />
            
            {/* Selected table info */}
            {(selectedTable || selectedTables.length > 0) && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">
                  {selectedTables.length > 0 
                    ? `Selected Tables (${selectedTables.length})` 
                    : `Table ${selectedTable?.tableNumber}`}
                </h3>
                
                {selectedTable && (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Table #:</span>
                      <span className="font-medium">{selectedTable.tableNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shape:</span>
                      <span className="font-medium capitalize">{selectedTable.shape}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capacity:</span>
                      <span className="font-medium">{selectedTable.capacity} seats</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Position:</span>
                      <span className="font-medium">X: {selectedTable.x}, Y: {selectedTable.y}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className={`${getStatusColor(selectedTable.status)} border-none`}>
                        {selectedTable.status || 'Available'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <Badge className={getPriceCategoryBadgeClass(selectedTable.priceCategory)}>
                        {selectedTable.priceCategory || 'Standard'}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {selectedTables.length > 0 && (
                  <div className="text-sm">
                    <p>Move or edit these tables as a group.</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleLockStatus}
                    className="w-full justify-start"
                  >
                    {(selectedTable?.isLocked || (selectedTables.length > 0 && selectedTables.every(t => t.isLocked))) ? (
                      <Unlock className="h-4 w-4 mr-2" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    {(selectedTable?.isLocked || (selectedTables.length > 0 && selectedTables.every(t => t.isLocked))) ? 'Unlock' : 'Lock'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteTable}
                    className="w-full justify-start text-red-500 hover:text-red-700"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeTableStatus('available')}
                    className="w-full justify-start"
                  >
                    <div className="h-3 w-3 rounded-full bg-green-500 mr-2" />
                    Available
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeTableStatus('reserved')}
                    className="w-full justify-start"
                  >
                    <div className="h-3 w-3 rounded-full bg-amber-500 mr-2" />
                    Reserved
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeTableStatus('unavailable')}
                    className="w-full justify-start"
                  >
                    <div className="h-3 w-3 rounded-full bg-red-500 mr-2" />
                    Unavailable
                  </Button>
                </div>
              </div>
            )}
            
            <Separator />
            
            {/* Zones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Zones</h3>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-1">
                {zones.map(zone => (
                  <div 
                    key={zone.id} 
                    className="flex items-center justify-between p-2 rounded hover:bg-muted"
                  >
                    <div className="flex items-center">
                      <div 
                        className="h-3 w-3 rounded-full mr-2" 
                        style={{ backgroundColor: zone.color }}
                      />
                      <span>{zone.name}</span>
                    </div>
                    <Badge variant="outline">
                      {zone.tables.length} tables
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Display options */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Display Options</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Show Grid</span>
                  <Switch 
                    checked={isGridVisible} 
                    onCheckedChange={setIsGridVisible} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Popularity Heatmap</span>
                  <Switch 
                    checked={showHeatmap} 
                    onCheckedChange={setShowHeatmap} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Zoom Level</span>
                  <div className="w-[120px]">
                    <Slider 
                      value={[zoom]} 
                      min={50} 
                      max={200} 
                      step={10} 
                      onValueChange={(vals) => handleZoom(vals[0])} 
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{zoom}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Floor plan canvas */}
        <Card className="lg:col-span-3 order-1 lg:order-2">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {floors.find(f => f.id === currentFloor)?.name || 'Floor Plan'}
              </CardTitle>
              
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleZoom(zoom - 10)}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm flex items-center">{zoom}%</span>
                <Button variant="outline" size="sm" onClick={() => handleZoom(zoom + 10)}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                
                <Button variant="outline" size="sm" onClick={centerCanvas}>
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-between mt-2">
              <div className="text-sm text-muted-foreground">
                {selectedTable 
                  ? `Editing Table #${selectedTable.tableNumber}` 
                  : selectedTables.length > 0 
                    ? `${selectedTables.length} tables selected` 
                    : 'Click to select a table or drag to move'
                }
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                {/* Table status legend */}
                <div className="flex items-center space-x-1">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-xs">Available</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-xs">Reserved</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-xs">Unavailable</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Lock className="h-3 w-3 text-gray-500" />
                  <span className="text-xs">Locked</span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 pt-0">
            <div className="relative border rounded-md overflow-hidden">
              <div 
                className="absolute top-2 left-2 z-20 flex flex-col space-y-2 bg-white/80 p-2 rounded shadow-sm"
              >
                <Button 
                  variant={isMultiSelectMode ? "default" : "outline"} 
                  size="icon" 
                  onClick={toggleMultiSelectMode}
                  title={isMultiSelectMode ? "Cancel Multi-Select" : "Enable Multi-Select"}
                >
                  {isMultiSelectMode ? <Eraser className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                </Button>
                
                <Button 
                  variant={isPanMode ? "default" : "outline"} 
                  size="icon" 
                  onClick={togglePanMode}
                  title={isPanMode ? "Cancel Pan Mode" : "Enable Pan Mode"}
                >
                  {isPanMode ? <Hand className="h-4 w-4" /> : <Move className="h-4 w-4" />}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={centerCanvas}
                  title="Reset View"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
              
              <div 
                ref={canvasRef}
                className={`relative ${isPanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                style={{ 
                  backgroundImage: `url(${floors.find(f => f.id === currentFloor)?.image || '/mezzanine.jpg'})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '100%',
                  height: '600px',
                  transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.1s ease-out',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                {/* Grid overlay */}
                {isGridVisible && (
                  <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
                )}
                
                {/* Tables */}
                {!isTablesLoading && currentFloorTables.map(table => renderTable(table))}
                
                {/* Preview for adding new table */}
                {isAddMode && (
                  <div
                    className="absolute border-2 border-dashed border-blue-500 bg-blue-100/50 flex items-center justify-center rounded-full"
                    style={{
                      width: '30px',
                      height: tableForm.watch('shape') === 'half-circle' ? '15px' : '30px',
                      left: `${tableForm.watch('x')}px`,
                      top: `${tableForm.watch('y')}px`,
                      borderRadius: tableForm.watch('shape') === 'half-circle' ? '15px 15px 0 0' : '50%',
                    }}
                  >
                    <span className="text-xs font-semibold">{tableForm.watch('tableNumber')}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Context menu */}
            {contextMenuPosition && contextMenuTable && (
              <div 
                className="fixed bg-white shadow-md rounded-md py-1 z-50"
                style={{ 
                  top: contextMenuPosition.y, 
                  left: contextMenuPosition.x 
                }}
              >
                <div className={getContextMenuItemClass()}>
                  <Edit className="h-4 w-4" />
                  Edit Table #{contextMenuTable.tableNumber}
                </div>
                <div className={getContextMenuItemClass()}>
                  <TableProperties className="h-4 w-4" />
                  Change Shape
                </div>
                <div className={getContextMenuItemClass()}>
                  {contextMenuTable.isLocked ? (
                    <>
                      <Unlock className="h-4 w-4" />
                      Unlock Table
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Lock Table
                    </>
                  )}
                </div>
                <div className={getContextMenuItemClass()}>
                  <Copy className="h-4 w-4" />
                  Duplicate
                </div>
                <div className={`${getContextMenuItemClass()} text-red-500`}>
                  <Trash className="h-4 w-4" />
                  Delete
                </div>
              </div>
            )}
            
            {/* Position controls and table management */}
            {(selectedTable || selectedTables.length > 0) && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-dashed">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm">Table Position Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex space-x-2 mb-2">
                      <Button 
                        type="button" 
                        size="sm" 
                        variant={movementDelta.x === 1 ? "default" : "outline"}
                        onClick={() => setMovementSize('small')}
                      >
                        Small (1px)
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant={movementDelta.x === 5 ? "default" : "outline"}
                        onClick={() => setMovementSize('medium')}
                      >
                        Medium (5px)
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant={movementDelta.x === 10 ? "default" : "outline"}
                        onClick={() => setMovementSize('large')}
                      >
                        Large (10px)
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div></div>
                      <Button type="button" size="sm" variant="outline" onClick={() => moveTable('up')}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <div></div>
                      
                      <Button type="button" size="sm" variant="outline" onClick={() => moveTable('left')}>
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={applyChanges}>
                        Apply
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => moveTable('right')}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      
                      <div></div>
                      <Button type="button" size="sm" variant="outline" onClick={() => moveTable('down')}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <div></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Add/Edit Table Form */}
      {(isAddMode || selectedTable) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isAddMode ? "Add New Table" : `Edit Table #${selectedTable?.tableNumber}`}
            </CardTitle>
            <CardDescription>
              {isAddMode ? "Configure a new table" : "Edit table properties"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...tableForm}>
              <form onSubmit={tableForm.handleSubmit(handleTableFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={tableForm.control}
                    name="tableNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Number</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={tableForm.control}
                    name="shape"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Shape</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select table shape" />
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
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seat Capacity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={tableForm.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select floor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {floors.filter(f => f.isActive).map(floor => (
                              <SelectItem key={floor.id} value={floor.id}>
                                {floor.name}
                              </SelectItem>
                            ))}
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
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select zone (optional)" />
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
                            <SelectItem value="available">
                              <div className="flex items-center">
                                <div className="h-3 w-3 rounded-full bg-green-500 mr-2" />
                                Available
                              </div>
                            </SelectItem>
                            <SelectItem value="reserved">
                              <div className="flex items-center">
                                <div className="h-3 w-3 rounded-full bg-amber-500 mr-2" />
                                Reserved
                              </div>
                            </SelectItem>
                            <SelectItem value="unavailable">
                              <div className="flex items-center">
                                <div className="h-3 w-3 rounded-full bg-red-500 mr-2" />
                                Unavailable
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={tableForm.control}
                    name="x"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>X Position</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={tableForm.control}
                    name="y"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Y Position</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={tableForm.control}
                    name="isLocked"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Lock Table</FormLabel>
                          <FormDescription>
                            Prevent this table from being moved
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="submit"
                    disabled={tableForm.formState.isSubmitting}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isAddMode ? "Create Table" : "Update Table"}
                  </Button>
                  
                  {selectedTable && (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={handleDeleteTable}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                  
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
      
      {/* Bulk Table Creation Form */}
      {isBulkAddMode && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Add Tables</CardTitle>
            <CardDescription>
              Create multiple tables at once in various arrangements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...bulkTableForm}>
              <form onSubmit={bulkTableForm.handleSubmit(handleBulkTableSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={bulkTableForm.control}
                    name="startNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Table Number</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          First table number in the sequence
                        </FormDescription>
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
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          How many tables to create
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={bulkTableForm.control}
                    name="shape"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Shape</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select table shape" />
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
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seat Capacity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={bulkTableForm.control}
                    name="arrangement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arrangement</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select arrangement" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="grid">Grid</SelectItem>
                            <SelectItem value="circle">Circle</SelectItem>
                            <SelectItem value="row">Row</SelectItem>
                            <SelectItem value="column">Column</SelectItem>
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
                        <FormLabel>Spacing</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Distance between tables in pixels
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={bulkTableForm.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select floor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {floors.filter(f => f.isActive).map(floor => (
                              <SelectItem key={floor.id} value={floor.id}>
                                {floor.name}
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
                    name="zone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zone</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select zone (optional)" />
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
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="submit"
                    disabled={bulkTableForm.formState.isSubmitting}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Tables
                  </Button>
                  
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
      
      {/* Table List */}
      {!isAddMode && !isBulkAddMode && !selectedTable && selectedTables.length === 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Tables</CardTitle>
              <CardDescription>
                {currentFloorTables.length} tables on {floors.find(f => f.id === currentFloor)?.name}
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Input 
                placeholder="Search tables..." 
                className="w-[200px]" 
                type="search" 
              />
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Shape</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentFloorTables.map(table => (
                  <TableRow key={table.id}>
                    <TableCell className="font-medium">{table.tableNumber}</TableCell>
                    <TableCell>
                      {floors.find(f => f.id === table.floor)?.name || table.floor}
                    </TableCell>
                    <TableCell className="capitalize">{table.shape}</TableCell>
                    <TableCell>{table.capacity}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${getStatusColor(table.status)} border-none`}>
                        {table.status || 'Available'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriceCategoryBadgeClass(table.priceCategory)}>
                        {table.priceCategory || 'Standard'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => handleSelectTable(table, e)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {currentFloorTables.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p>No tables found on this floor.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={handleAddTable}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add Table
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}