import { useState, useEffect, useRef } from "react";
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
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCaption, 
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  PlusCircle, 
  Edit, 
  Trash, 
  Save,
  RotateCcw, 
  RotateCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

// Define types
interface CanvasPosition {
  x: number;
  y: number;
}

interface TablePosition {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  type: 'circle' | 'half-circle';
  capacity: number;
  rotation: number;
}

interface Seat {
  id: number;
  tableId: number;
  seatNumber: number;
  xOffset: number;
  yOffset: number;
}

interface TableWithSeats extends TablePosition {
  seats: Seat[];
}

// Form validation schema
const tableFormSchema = z.object({
  name: z.string().min(1, "Table name is required"),
  type: z.enum(["circle", "half-circle"], {
    required_error: "Please select a table type",
  }),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").max(20, "Maximum capacity is 20"),
  width: z.coerce.number().min(10, "Width must be at least 10px"),
  height: z.coerce.number().min(10, "Height must be at least 10px"),
  x: z.coerce.number(),
  y: z.coerce.number(),
  rotation: z.coerce.number(),
  venueId: z.coerce.number(),
});

export default function LayoutSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [mezzanineImage, setMezzanineImage] = useState<string>('/mezzanine.jpg');
  const [selectedTable, setSelectedTable] = useState<TablePosition | null>(null);
  const [venues, setVenues] = useState<{id: number, name: string}[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number>(1); // Default to first venue
  const [dragStart, setDragStart] = useState<CanvasPosition | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [movementDelta, setMovementDelta] = useState({ x: 1, y: 1 });
  
  const form = useForm<z.infer<typeof tableFormSchema>>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: "",
      type: "circle",
      capacity: 4,
      width: 30,
      height: 30,
      x: 100,
      y: 100,
      rotation: 0,
      venueId: selectedVenueId,
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

  // Fetch tables for selected venue
  const { data: tablesData = [], isLoading } = useQuery({
    queryKey: ['tables', selectedVenueId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/tables?venueId=${selectedVenueId}`);
      return response.json();
    },
    enabled: !!selectedVenueId,
  });
  
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
      queryClient.invalidateQueries({ queryKey: ['tables', selectedVenueId] });
      setIsAddMode(false);
      form.reset();
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
    mutationFn: async (tableData: TablePosition) => {
      const { id, ...rest } = tableData;
      const response = await apiRequest('PUT', `/api/admin/tables/${id}`, rest);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update table');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Table updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['tables', selectedVenueId] });
      setSelectedTable(null);
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
      queryClient.invalidateQueries({ queryKey: ['tables', selectedVenueId] });
      setSelectedTable(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

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
      form.reset({
        name: selectedTable.name,
        type: selectedTable.type,
        capacity: selectedTable.capacity,
        width: selectedTable.width,
        height: selectedTable.height,
        x: selectedTable.x,
        y: selectedTable.y,
        rotation: selectedTable.rotation,
        venueId: selectedVenueId,
      });
    } else if (isAddMode) {
      // Reset to default values for new table
      form.reset({
        name: `Table ${tablesData.length + 1}`,
        type: "circle",
        capacity: 4,
        width: 30,
        height: 30,
        x: 100,
        y: 100,
        rotation: 0,
        venueId: selectedVenueId,
      });
    }
  }, [selectedTable, isAddMode, tablesData, form, selectedVenueId]);

  const handleSelectVenue = (venueId: string) => {
    setSelectedVenueId(parseInt(venueId));
    setSelectedTable(null);
  };

  const handleAddTable = () => {
    setSelectedTable(null);
    setIsAddMode(true);
  };

  const handleSubmit = (data: z.infer<typeof tableFormSchema>) => {
    if (isAddMode) {
      createTableMutation.mutate(data);
    } else if (selectedTable) {
      updateTableMutation.mutate({
        ...selectedTable,
        ...data,
      });
    }
  };

  const handleDeleteTable = () => {
    if (selectedTable) {
      if (window.confirm(`Are you sure you want to delete ${selectedTable.name}?`)) {
        deleteTableMutation.mutate(selectedTable.id);
      }
    }
  };

  const handleCancel = () => {
    setSelectedTable(null);
    setIsAddMode(false);
    form.reset();
  };

  const handleSelectTable = (table: TablePosition, event: React.MouseEvent) => {
    if (event.defaultPrevented) return; // Skip if this was part of a drag operation
    setIsAddMode(false);
    setSelectedTable(table);
  };

  const handleMouseDown = (event: React.MouseEvent, table: TablePosition) => {
    if (!canvasRef.current) return;
    
    // Get canvas offset
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate start position
    setDragStart({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
    
    setSelectedTable(table);
    setIsAddMode(false);
    
    event.preventDefault();
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!dragStart || !selectedTable || !canvasRef.current) return;
    
    // Get canvas offset
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate current position
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    
    // Calculate delta movement
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;
    
    // Update table position
    setSelectedTable({
      ...selectedTable,
      x: Math.max(0, selectedTable.x + deltaX),
      y: Math.max(0, selectedTable.y + deltaY)
    });
    
    // Update drag start to current position
    setDragStart({
      x: currentX,
      y: currentY
    });
  };

  const handleMouseUp = () => {
    if (selectedTable && dragStart) {
      // Update the table position in the database
      updateTableMutation.mutate(selectedTable);
    }
    
    setDragStart(null);
  };

  const handleMouseLeave = () => {
    setDragStart(null);
  };

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

  const moveTable = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedTable) return;
    
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
  };

  const rotateTable = (direction: 'cw' | 'ccw') => {
    if (!selectedTable) return;
    
    let newRotation = selectedTable.rotation;
    
    if (direction === 'cw') {
      newRotation = (newRotation + 90) % 360;
    } else {
      newRotation = (newRotation - 90 + 360) % 360;
    }
    
    setSelectedTable({
      ...selectedTable,
      rotation: newRotation
    });
  };

  const applyChanges = () => {
    if (selectedTable) {
      updateTableMutation.mutate(selectedTable);
    }
  };

  const renderCircleTable = (table: TablePosition) => {
    const isSelected = selectedTable?.id === table.id;
    
    return (
      <div
        className={`table-circle ${isSelected ? 'selected' : 'available'}`}
        style={{
          width: `${table.width}px`,
          height: `${table.height}px`,
          left: `${table.x}px`,
          top: `${table.y}px`,
          transform: `rotate(${table.rotation}deg)`,
          position: 'absolute',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'move',
          border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(0, 0, 0, 0.2)',
          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.5)',
          boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
          zIndex: isSelected ? 10 : 1,
        }}
        onClick={(e) => handleSelectTable(table, e)}
        onMouseDown={(e) => handleMouseDown(e, table)}
      >
        <span className="table-name text-xs">{table.name}</span>
      </div>
    );
  };

  const renderHalfCircleTable = (table: TablePosition) => {
    const isSelected = selectedTable?.id === table.id;
    
    return (
      <div
        className={`table-half-circle ${isSelected ? 'selected' : 'available'}`}
        style={{
          width: `${table.width}px`,
          height: `${table.height}px`,
          left: `${table.x}px`,
          top: `${table.y}px`,
          transform: `rotate(${table.rotation}deg)`,
          position: 'absolute',
          borderRadius: `${table.width}px ${table.width}px 0 0`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'move',
          border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(0, 0, 0, 0.2)',
          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.5)',
          boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
          zIndex: isSelected ? 10 : 1,
        }}
        onClick={(e) => handleSelectTable(table, e)}
        onMouseDown={(e) => handleMouseDown(e, table)}
      >
        <span className="table-name text-xs">{table.name}</span>
      </div>
    );
  };

  const renderTable = (table: TablePosition) => {
    return table.type === 'circle' 
      ? renderCircleTable(table) 
      : renderHalfCircleTable(table);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Venue Layout Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Floor Plan</CardTitle>
            <CardDescription>
              Drag tables to position them on the floor plan
            </CardDescription>
            <div className="flex space-x-2">
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
              <Button variant="outline" onClick={handleAddTable}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Table
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative border rounded-md overflow-hidden" style={{ minHeight: '500px' }}>
              <div
                ref={canvasRef}
                className="relative"
                style={{ 
                  backgroundImage: `url(${mezzanineImage})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '100%',
                  height: '500px',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                {!isLoading && tablesData.map((table: TablePosition) => renderTable(table))}
                
                {isAddMode && (
                  <div
                    className="table-preview"
                    style={{
                      width: `${form.watch('width')}px`,
                      height: `${form.watch('height')}px`,
                      left: `${form.watch('x')}px`,
                      top: `${form.watch('y')}px`,
                      position: 'absolute',
                      borderRadius: form.watch('type') === 'circle' 
                        ? '50%' 
                        : `${form.watch('width')}px ${form.watch('width')}px 0 0`,
                      border: '2px dashed #3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: `rotate(${form.watch('rotation')}deg)`,
                      zIndex: 5,
                    }}
                  >
                    <span className="text-xs">{form.watch('name')}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {isAddMode ? "Add New Table" : selectedTable ? `Edit ${selectedTable.name}` : "Table Properties"}
            </CardTitle>
            <CardDescription>
              {isAddMode ? "Configure a new table" : selectedTable ? "Edit table properties" : "Select a table to edit its properties"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(isAddMode || selectedTable) ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select table type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="circle">Circle</SelectItem>
                            <SelectItem value="half-circle">Half Circle</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seat Capacity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of seats for this table (1-20)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Width (px)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height (px)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="rotation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rotation (degrees)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4 space-y-2">
                    <div className="flex space-x-2">
                      <Button type="submit" disabled={createTableMutation.isPending || updateTableMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {isAddMode ? "Create Table" : "Update Table"}
                      </Button>
                      
                      {selectedTable && (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          onClick={handleDeleteTable}
                          disabled={deleteTableMutation.isPending}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                      
                      <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">Select a table on the floor plan or add a new one</p>
              </div>
            )}
            
            {selectedTable && (
              <div className="mt-4 space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">Table Position Controls</h3>
                  
                  <div className="flex space-x-2 mb-2">
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setMovementSize('small')}
                      className={movementDelta.x === 1 ? "bg-primary text-primary-foreground" : ""}
                    >
                      Small
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setMovementSize('medium')}
                      className={movementDelta.x === 5 ? "bg-primary text-primary-foreground" : ""}
                    >
                      Medium
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setMovementSize('large')}
                      className={movementDelta.x === 10 ? "bg-primary text-primary-foreground" : ""}
                    >
                      Large
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
                  
                  <div className="flex space-x-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => rotateTable('ccw')}>
                      <RotateCcw className="h-4 w-4" /> -90°
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => rotateTable('cw')}>
                      <RotateCw className="h-4 w-4" /> +90°
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="seats">Seats</TabsTrigger>
        </TabsList>
        <TabsContent value="tables">
          <Card>
            <CardHeader>
              <CardTitle>Tables</CardTitle>
              <CardDescription>
                Manage all tables in the venue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Rotation</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && tablesData.length > 0 ? (
                    tablesData.map((table: TablePosition) => (
                      <TableRow key={table.id}>
                        <TableCell>{table.id}</TableCell>
                        <TableCell>{table.name}</TableCell>
                        <TableCell>{table.type}</TableCell>
                        <TableCell>{table.capacity}</TableCell>
                        <TableCell>X: {table.x}, Y: {table.y}</TableCell>
                        <TableCell>{table.width}x{table.height}</TableCell>
                        <TableCell>{table.rotation}°</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => handleSelectTable(table, e)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        {isLoading ? "Loading tables..." : "No tables found. Add some tables to get started."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="seats">
          <Card>
            <CardHeader>
              <CardTitle>Seats</CardTitle>
              <CardDescription>
                View individual seats for each table
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTable ? (
                <div>
                  <h3 className="text-lg font-medium mb-2">Seats for {selectedTable.name}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seat Number</TableHead>
                        <TableHead>X Offset</TableHead>
                        <TableHead>Y Offset</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTable.seats && selectedTable.seats.length > 0 ? (
                        selectedTable.seats.map((seat: Seat) => (
                          <TableRow key={seat.id}>
                            <TableCell>{seat.seatNumber}</TableCell>
                            <TableCell>{seat.xOffset}</TableCell>
                            <TableCell>{seat.yOffset}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center">
                            No seats found for this table.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center p-8">
                  <p className="text-muted-foreground">Select a table to view its seats</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}