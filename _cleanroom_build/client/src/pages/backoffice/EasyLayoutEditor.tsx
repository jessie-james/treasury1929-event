import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Move, Lock, Unlock, Trash2, Grid } from "lucide-react";

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
  status?: 'available' | 'reserved' | 'unavailable';
  priceCategory?: 'standard' | 'premium' | 'vip' | 'budget';
}

export default function EasyLayoutEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);

  // State
  const [floor, setFloor] = useState("mezzanine");
  const [mode, setMode] = useState<"select" | "add" | "move" | "delete">("select");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [tablePos, setTablePos] = useState({ x: 0, y: 0 });

  // Default new table properties
  const [tableNumber, setTableNumber] = useState(1);
  const [capacity, setCapacity] = useState(8);
  const [shape, setShape] = useState<"round" | "square" | "half-circle">("round");
  const [status, setStatus] = useState<"available" | "reserved" | "unavailable">("available");

  // Fetch tables 
  const { data: tables = [], refetch } = useQuery({
    queryKey: ['tables', floor],
    queryFn: async () => {
      const response = await fetch(`/api/admin/tables?floor=${floor}`);
      if (!response.ok) throw new Error("Failed to fetch tables");
      return response.json();
    }
  });

  // Update max table number based on existing tables
  useEffect(() => {
    if (tables.length > 0) {
      const maxNumber = Math.max(...tables.map((t: Table) => t.tableNumber));
      setTableNumber(maxNumber + 1);
    }
  }, [tables]);

  // Create table mutation
  const createTableMutation = useMutation({
    mutationFn: async (tableData: Omit<Table, 'id'>) => {
      const response = await apiRequest("POST", "/api/admin/tables", tableData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Table created successfully" });
      refetch();
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create table", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  });

  // Update table mutation
  const updateTableMutation = useMutation({
    mutationFn: async (tableData: Table) => {
      const response = await apiRequest(
        "PUT", 
        `/api/admin/tables/${tableData.id}`, 
        tableData
      );
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Table updated successfully" });
      refetch();
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update table", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  });

  // Delete table mutation
  const deleteTableMutation = useMutation({
    mutationFn: async (tableId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/tables/${tableId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Table deleted successfully" });
      refetch();
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete table", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  });

  // Handle canvas click to place a table
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (mode !== "add" || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    // Create new table
    createTableMutation.mutate({
      venueId: 1,
      tableNumber,
      capacity,
      shape,
      status,
      priceCategory: "standard",
      floor,
      x,
      y
    });

    // Increment table number for next table
    setTableNumber(prev => prev + 1);
  };

  // Handle mouse down on table (start drag)
  const handleTableMouseDown = (e: React.MouseEvent, table: Table) => {
    if (mode !== "move" || table.isLocked) return;
    e.stopPropagation();

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    setIsDragging(true);
    setSelectedTable(table);
    setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTablePos({ x: table.x, y: table.y });

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Handle mouse move while dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !selectedTable || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const deltaX = currentX - startPos.x;
    const deltaY = currentY - startPos.y;

    // Apply grid snapping if enabled
    let newX = tablePos.x + deltaX;
    let newY = tablePos.y + deltaY;

    if (snapToGrid) {
      const gridSize = 20;
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    // Update the table position (visually only, not in database yet)
    setSelectedTable({
      ...selectedTable,
      x: Math.round(newX),
      y: Math.round(newY)
    });
  };

  // Handle mouse up after dragging
  const handleMouseUp = () => {
    if (isDragging && selectedTable) {
      // Save the new position to the database
      updateTableMutation.mutate(selectedTable);
    }

    setIsDragging(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Handle table click (select/delete)
  const handleTableClick = (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();

    if (mode === "delete") {
      if (confirm(`Delete table ${table.tableNumber}?`)) {
        deleteTableMutation.mutate(table.id);
      }
      return;
    }

    if (mode === "select") {
      setSelectedTable(table);
    }
  };

  // Toggle table lock status
  const toggleLock = (table: Table) => {
    updateTableMutation.mutate({
      ...table,
      isLocked: !table.isLocked
    });
  };

  // Get table color based on status
  const getTableColor = (status?: string) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "reserved": return "bg-blue-500";
      case "unavailable": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  // Clean up event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <BackofficeLayout>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Easy Layout Editor</CardTitle>
            <CardDescription>
              A simplified tool for managing table layouts
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar controls */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Floor</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={floor} onValueChange={setFloor}>
                  <TabsList className="w-full">
                    <TabsTrigger value="main" className="flex-1">Main Floor</TabsTrigger>
                    <TabsTrigger value="mezzanine" className="flex-1">Mezzanine</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={mode === "select" ? "default" : "outline"}
                    onClick={() => setMode("select")}
                    className="w-full"
                  >
                    Select
                  </Button>
                  <Button 
                    variant={mode === "add" ? "default" : "outline"}
                    onClick={() => setMode("add")}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                  <Button 
                    variant={mode === "move" ? "default" : "outline"}
                    onClick={() => setMode("move")}
                    className="w-full"
                  >
                    <Move className="mr-2 h-4 w-4" />
                    Move
                  </Button>
                  <Button 
                    variant={mode === "delete" ? "default" : "outline"}
                    onClick={() => setMode("delete")}
                    className="w-full text-red-500"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="grid-snap" 
                    checked={snapToGrid} 
                    onCheckedChange={setSnapToGrid} 
                  />
                  <Label htmlFor="grid-snap" className="flex items-center">
                    <Grid className="h-4 w-4 mr-2" />
                    Snap to Grid
                  </Label>
                </div>
              </CardContent>
            </Card>

            {mode === "add" && (
              <Card>
                <CardHeader>
                  <CardTitle>New Table Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="table-number">Number</Label>
                    <Input
                      id="table-number"
                      type="number"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="table-capacity">Capacity</Label>
                    <Input
                      id="table-capacity"
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="table-shape">Shape</Label>
                    <Select value={shape} onValueChange={(v: any) => setShape(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round">Round</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="half-circle">Half Circle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="table-status">Status</Label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedTable && mode === "select" && (
              <Card>
                <CardHeader>
                  <CardTitle>Table {selectedTable.tableNumber}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Capacity</div>
                      <div>{selectedTable.capacity}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Shape</div>
                      <div className="capitalize">{selectedTable.shape}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Position</div>
                      <div>X: {selectedTable.x}, Y: {selectedTable.y}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="capitalize">{selectedTable.status || "Available"}</div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => toggleLock(selectedTable)}
                  >
                    {selectedTable.isLocked ? (
                      <><Unlock className="mr-2 h-4 w-4" /> Unlock Table</>
                    ) : (
                      <><Lock className="mr-2 h-4 w-4" /> Lock Table</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Canvas area */}
          <div className="lg:col-span-3">
            <Card className="h-full min-h-[600px]">
              <CardContent className="p-0 relative h-full min-h-[600px]">
                <div className="absolute top-2 left-2 bg-white rounded-md p-2 shadow z-10">
                  <div className="text-muted-foreground text-sm">
                    {mode === "select" && "Click on a table to select it"}
                    {mode === "add" && "Click anywhere to add a new table"}
                    {mode === "move" && "Drag tables to move them (locked tables cannot be moved)"}
                    {mode === "delete" && "Click on a table to delete it"}
                  </div>
                </div>
                <div 
                  ref={canvasRef}
                  className="w-full h-full overflow-auto relative"
                  style={{
                    backgroundImage: `url('/floor-plans/${floor}-floor.png')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    cursor: mode === "add" ? "cell" : "default"
                  }}
                  onClick={handleCanvasClick}
                >
                  <div className="relative w-full h-full">
                    {/* Draw grid if enabled */}
                    {snapToGrid && (
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: `
                            linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
                          `,
                          backgroundSize: '20px 20px'
                        }}
                      />
                    )}
                    
                    {/* Render tables */}
                    {tables.map((table: Table) => {
                      const isBeingDragged = isDragging && selectedTable?.id === table.id;
                      // Use current drag position for the table being dragged
                      const tableX = isBeingDragged ? selectedTable.x : table.x;
                      const tableY = isBeingDragged ? selectedTable.y : table.y;
                      
                      // Calculate table size based on capacity
                      const baseSize = 30 + table.capacity * 3;
                      
                      return (
                        <div
                          key={table.id}
                          className={`
                            absolute transform -translate-x-1/2 -translate-y-1/2
                            flex items-center justify-center text-white font-bold
                            transition-all ${getTableColor(table.status)}
                            ${isBeingDragged ? 'opacity-70 z-20' : 'z-10'}
                            ${table.isLocked ? 'ring-2 ring-yellow-400' : ''}
                            ${selectedTable?.id === table.id && !isBeingDragged ? 'ring-4 ring-blue-500' : ''}
                          `}
                          style={{
                            left: `${tableX}px`,
                            top: `${tableY}px`,
                            width: `${baseSize}px`,
                            height: table.shape === 'half-circle' ? `${baseSize/2}px` : `${baseSize}px`,
                            borderRadius: table.shape === 'round' ? '50%' : 
                                         table.shape === 'half-circle' ? '100% 100% 0 0' : '4px',
                            cursor: mode === "move" && !table.isLocked ? "move" : 
                                   mode === "delete" ? "not-allowed" : "pointer"
                          }}
                          onClick={(e) => handleTableClick(e, table)}
                          onMouseDown={(e) => handleTableMouseDown(e, table)}
                        >
                          {table.tableNumber}
                          {table.isLocked && (
                            <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-800 rounded-full p-0.5">
                              <Lock className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}