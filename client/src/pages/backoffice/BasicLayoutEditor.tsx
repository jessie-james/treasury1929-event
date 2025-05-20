import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function BasicLayoutEditor() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [floor, setFloor] = useState("mezzanine");
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [mode, setMode] = useState<"view" | "add" | "move" | "delete">("view");
  
  // New table properties
  const [tableNumber, setTableNumber] = useState(1);
  const [capacity, setCapacity] = useState(8);
  const [shape, setShape] = useState("round");
  const [status, setStatus] = useState("available");

  // Fetch tables when floor changes
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/tables?floor=${floor}&venueId=1`);
        if (!response.ok) throw new Error("Failed to fetch tables");
        const data = await response.json();
        setTables(data);
        
        // Set next table number
        if (data.length > 0) {
          const maxNumber = Math.max(...data.map((t: any) => t.tableNumber));
          setTableNumber(maxNumber + 1);
        }
      } catch (error) {
        console.error("Error fetching tables:", error);
        toast({ 
          title: "Error", 
          description: "Failed to load tables",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTables();
  }, [floor, toast]);

  // Handle canvas click for adding tables
  const handleCanvasClick = async (e: React.MouseEvent) => {
    if (mode !== "add" || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    
    // Snap to grid if enabled
    const snappedX = snapToGrid ? Math.round(x / 20) * 20 : x;
    const snappedY = snapToGrid ? Math.round(y / 20) * 20 : y;
    
    try {
      // Create new table
      const response = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: 1,
          tableNumber,
          capacity,
          shape,
          status,
          floor,
          x: snappedX,
          y: snappedY,
          priceCategory: "standard"
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create table");
      }
      
      // Reload tables and update next table number
      const tablesResponse = await fetch(`/api/admin/tables?floor=${floor}&venueId=1`);
      const tablesData = await tablesResponse.json();
      setTables(tablesData);
      setTableNumber(tableNumber + 1);
      
      toast({ title: "Success", description: "Table created successfully" });
    } catch (error) {
      console.error("Error creating table:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to create table",
        variant: "destructive"
      });
    }
  };

  // Handle mouse down on table (for drag)
  const handleTableMouseDown = (e: React.MouseEvent, table: any) => {
    if (mode !== "move" || table.isLocked) return;
    e.stopPropagation();
    
    setIsDragging(true);
    setSelectedTable({
      ...table,
      dragStartX: e.clientX,
      dragStartY: e.clientY,
      originalX: table.x,
      originalY: table.y
    });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle mouse move during drag
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !selectedTable) return;
    
    const deltaX = e.clientX - selectedTable.dragStartX;
    const deltaY = e.clientY - selectedTable.dragStartY;
    
    let newX = selectedTable.originalX + deltaX;
    let newY = selectedTable.originalY + deltaY;
    
    // Apply grid snapping
    if (snapToGrid) {
      newX = Math.round(newX / 20) * 20;
      newY = Math.round(newY / 20) * 20;
    }
    
    setSelectedTable({
      ...selectedTable,
      x: newX,
      y: newY
    });
  };

  // Handle mouse up after drag
  const handleMouseUp = async () => {
    if (isDragging && selectedTable) {
      try {
        // Update table position in database
        const response = await fetch(`/api/admin/tables/${selectedTable.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...selectedTable,
            x: Math.round(selectedTable.x),
            y: Math.round(selectedTable.y)
          })
        });
        
        if (!response.ok) throw new Error("Failed to update table position");
        
        // Reload tables
        const tablesResponse = await fetch(`/api/admin/tables?floor=${floor}&venueId=1`);
        const tablesData = await tablesResponse.json();
        setTables(tablesData);
        
        toast({ title: "Success", description: "Table position updated" });
      } catch (error) {
        console.error("Error updating table:", error);
        toast({ 
          title: "Error", 
          description: "Failed to update table position",
          variant: "destructive"
        });
      }
    }
    
    setIsDragging(false);
    setSelectedTable(null);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Handle table click for selection or deletion
  const handleTableClick = async (e: React.MouseEvent, table: any) => {
    e.stopPropagation();
    
    if (mode === "delete") {
      if (confirm(`Delete table ${table.tableNumber}?`)) {
        try {
          const response = await fetch(`/api/admin/tables/${table.id}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) throw new Error("Failed to delete table");
          
          // Reload tables
          const tablesResponse = await fetch(`/api/admin/tables?floor=${floor}&venueId=1`);
          const tablesData = await tablesResponse.json();
          setTables(tablesData);
          
          toast({ title: "Success", description: "Table deleted successfully" });
        } catch (error) {
          console.error("Error deleting table:", error);
          toast({ 
            title: "Error", 
            description: "Failed to delete table",
            variant: "destructive"
          });
        }
      }
      return;
    }
    
    if (mode === "view") {
      setSelectedTable(table);
    }
  };

  // Toggle table lock
  const toggleLock = async (table: any) => {
    try {
      const response = await fetch(`/api/admin/tables/${table.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...table,
          isLocked: !table.isLocked
        })
      });
      
      if (!response.ok) throw new Error("Failed to update table");
      
      // Reload tables
      const tablesResponse = await fetch(`/api/admin/tables?floor=${floor}&venueId=1`);
      const tablesData = await tablesResponse.json();
      setTables(tablesData);
      
      toast({ title: "Success", description: `Table ${table.isLocked ? 'unlocked' : 'locked'} successfully` });
    } catch (error) {
      console.error("Error updating table:", error);
      toast({ 
        title: "Error", 
        description: "Failed to update table lock status",
        variant: "destructive"
      });
    }
  };

  // Get table color based on status
  const getTableColor = (status: string) => {
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
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <BackofficeLayout>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Basic Layout Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={floor === "main" ? "default" : "outline"}
                onClick={() => setFloor("main")}
              >
                Main Floor
              </Button>
              <Button
                variant={floor === "mezzanine" ? "default" : "outline"}
                onClick={() => setFloor("mezzanine")}
              >
                Mezzanine
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={mode === "view" ? "default" : "outline"}
                onClick={() => setMode("view")}
              >
                View
              </Button>
              <Button
                variant={mode === "add" ? "default" : "outline"}
                onClick={() => setMode("add")}
              >
                Add Tables
              </Button>
              <Button
                variant={mode === "move" ? "default" : "outline"}
                onClick={() => setMode("move")}
              >
                Move Tables
              </Button>
              <Button
                variant={mode === "delete" ? "default" : "outline"}
                className="text-red-500"
                onClick={() => setMode("delete")}
              >
                Delete Tables
              </Button>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <Switch id="grid-snap" checked={snapToGrid} onCheckedChange={setSnapToGrid} />
              <Label htmlFor="grid-snap">Snap to Grid</Label>
            </div>
            
            {mode === "add" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label htmlFor="table-number">Number</Label>
                  <Input
                    id="table-number"
                    type="number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="table-capacity">Capacity</Label>
                  <Input
                    id="table-capacity"
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="table-shape">Shape</Label>
                  <Select value={shape} onValueChange={setShape}>
                    <SelectTrigger id="table-shape">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round">Round</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="half-circle">Half Circle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="table-status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="table-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative">
            <div
              ref={canvasRef}
              className="relative w-full h-[600px] overflow-auto"
              style={{
                backgroundImage: `url('/floor-plans/${floor}-floor.png')`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                cursor: mode === "add" ? "crosshair" : "default"
              }}
              onClick={handleCanvasClick}
            >
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
              {tables.map((table) => {
                const isBeingDragged = isDragging && selectedTable?.id === table.id;
                const tableX = isBeingDragged ? selectedTable.x : table.x;
                const tableY = isBeingDragged ? selectedTable.y : table.y;
                
                // Calculate table size based on capacity
                const size = 30 + (table.capacity * 3);
                
                return (
                  <div
                    key={table.id}
                    className={`
                      absolute transform -translate-x-1/2 -translate-y-1/2
                      flex items-center justify-center text-white font-bold
                      ${getTableColor(table.status)}
                      ${table.isLocked ? 'ring-2 ring-yellow-400' : ''}
                      ${isBeingDragged ? 'opacity-70 z-50' : 'z-10'}
                      ${selectedTable?.id === table.id && !isBeingDragged ? 'ring-4 ring-blue-500' : ''}
                    `}
                    style={{
                      left: `${tableX}px`,
                      top: `${tableY}px`,
                      width: `${size}px`,
                      height: table.shape === 'half-circle' ? `${size/2}px` : `${size}px`,
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
                      <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-800 rounded-full w-4 h-4 flex items-center justify-center text-xs">🔒</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {selectedTable && mode === "view" && (
          <Card>
            <CardHeader>
              <CardTitle>Table {selectedTable.tableNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Capacity</div>
                  <div>{selectedTable.capacity}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Shape</div>
                  <div className="capitalize">{selectedTable.shape}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="capitalize">{selectedTable.status}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Position</div>
                  <div>X: {selectedTable.x}, Y: {selectedTable.y}</div>
                </div>
                <div className="md:col-span-4">
                  <Button 
                    variant="outline" 
                    onClick={() => toggleLock(selectedTable)}
                  >
                    {selectedTable.isLocked ? 'Unlock Table' : 'Lock Table'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </BackofficeLayout>
  );
}