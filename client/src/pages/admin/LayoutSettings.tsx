import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Check, Plus, Trash2, RotateCcw, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableWithSeats } from '@shared/schema';

const DEFAULT_VENUE_ID = 1; // Default venue for now

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

const LayoutSettings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [tables, setTables] = useState<TablePosition[]>([]);
  const [selectedTable, setSelectedTable] = useState<TablePosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [floorPlanImage, setFloorPlanImage] = useState<string>('/mezzanine-floor-plan.png');
  const [isResizing, setIsResizing] = useState(false);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(100);

  // Fetch tables from API
  const { data: tablesData, isLoading } = useQuery({
    queryKey: ['/api/admin/tables', DEFAULT_VENUE_ID],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/tables?venueId=${DEFAULT_VENUE_ID}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }
      return response.json();
    },
  });

  // Create a new table
  const createTableMutation = useMutation({
    mutationFn: async (tableData: Omit<TablePosition, 'id'>) => {
      const response = await apiRequest('POST', '/api/admin/tables', {
        venueId: DEFAULT_VENUE_ID,
        name: tableData.name,
        tableType: tableData.type,
        capacity: tableData.capacity,
        xPosition: tableData.x,
        yPosition: tableData.y,
        width: tableData.width,
        height: tableData.height,
        rotation: tableData.rotation,
      });
      
      if (!response.ok) {
        throw new Error('Failed to create table');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tables'] });
      toast({
        title: 'Table created',
        description: 'The table has been created successfully.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating table',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update an existing table
  const updateTableMutation = useMutation({
    mutationFn: async (tableData: TablePosition) => {
      const response = await apiRequest('PUT', `/api/admin/tables/${tableData.id}`, {
        name: tableData.name,
        tableType: tableData.type,
        capacity: tableData.capacity,
        xPosition: tableData.x,
        yPosition: tableData.y,
        width: tableData.width,
        height: tableData.height,
        rotation: tableData.rotation,
      });
      
      if (!response.ok) {
        throw new Error('Failed to update table');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tables'] });
      toast({
        title: 'Table updated',
        description: 'The table has been updated successfully.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating table',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete a table
  const deleteTableMutation = useMutation({
    mutationFn: async (tableId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/tables/${tableId}`);
      
      if (!response.ok) {
        throw new Error('Failed to delete table');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tables'] });
      toast({
        title: 'Table deleted',
        description: 'The table has been deleted successfully.',
        variant: 'default',
      });
      setSelectedTable(null);
    },
    onError: (error) => {
      toast({
        title: 'Error deleting table',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Map API data to our internal format when data is loaded
  useEffect(() => {
    if (tablesData) {
      const mappedTables = tablesData.map((table: TableWithSeats) => ({
        id: table.id,
        x: table.xPosition,
        y: table.yPosition,
        width: table.width,
        height: table.height,
        name: table.name,
        type: table.tableType as 'circle' | 'half-circle',
        capacity: table.capacity,
        rotation: table.rotation || 0,
      }));
      setTables(mappedTables);
    }
  }, [tablesData]);

  // Initialize canvas size when component mounts
  useEffect(() => {
    if (canvasRef.current) {
      const { offsetWidth, offsetHeight } = canvasRef.current;
      setCanvasSize({ width: offsetWidth, height: offsetHeight });
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const { offsetWidth, offsetHeight } = canvasRef.current;
        setCanvasSize({ width: offsetWidth, height: offsetHeight });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add a new table
  const handleAddTable = () => {
    // Center the new table on the canvas
    const newTable: Omit<TablePosition, 'id'> = {
      x: canvasSize.width / 2 - 40,
      y: canvasSize.height / 2 - 40,
      width: 80,
      height: 80,
      name: `Table ${tables.length + 1}`,
      type: 'circle',
      capacity: 4,
      rotation: 0,
    };
    
    createTableMutation.mutate(newTable);
  };

  // Handle selecting a table
  const handleSelectTable = (table: TablePosition, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedTable(table);
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - table.x;
      const offsetY = event.clientY - rect.top - table.y;
      setDragOffset({ x: offsetX, y: offsetY });
    }
    
    setIsDragging(true);
  };

  // Handle mouse move (for dragging)
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !selectedTable || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    let newX = event.clientX - rect.left - dragOffset.x;
    let newY = event.clientY - rect.top - dragOffset.y;
    
    // Keep table within canvas bounds
    newX = Math.max(0, Math.min(canvasSize.width - selectedTable.width, newX));
    newY = Math.max(0, Math.min(canvasSize.height - selectedTable.height, newY));
    
    // Update selected table position
    const updatedTable = { ...selectedTable, x: newX, y: newY };
    setSelectedTable(updatedTable);
    
    // Update tables array
    setTables(tables.map(table => 
      table.id === selectedTable.id ? updatedTable : table
    ));
  };

  // Handle mouse up (end dragging)
  const handleMouseUp = () => {
    if (isDragging && selectedTable) {
      // Save the updated position to the database
      updateTableMutation.mutate(selectedTable);
    }
    setIsDragging(false);
  };
  
  // Handle click on canvas (deselect table)
  const handleCanvasClick = () => {
    setSelectedTable(null);
  };

  // Handle table property changes
  const handleTablePropertyChange = (property: keyof TablePosition, value: any) => {
    if (!selectedTable) return;
    
    const updatedTable = { ...selectedTable, [property]: value };
    setSelectedTable(updatedTable);
    
    // Update tables array
    setTables(tables.map(table => 
      table.id === selectedTable.id ? updatedTable : table
    ));
  };

  // Handle save button (save all changes)
  const handleSaveTable = () => {
    if (!selectedTable) return;
    updateTableMutation.mutate(selectedTable);
  };

  // Handle delete button
  const handleDeleteTable = () => {
    if (!selectedTable) return;
    
    if (confirm('Are you sure you want to delete this table?')) {
      deleteTableMutation.mutate(selectedTable.id);
    }
  };

  // Render a circular table
  const renderCircleTable = (table: TablePosition) => {
    const isSelected = selectedTable?.id === table.id;
    
    return (
      <div
        key={table.id}
        className={`absolute rounded-full flex items-center justify-center 
          ${isSelected ? 'ring-2 ring-blue-500' : ''} 
          cursor-move bg-green-100 border border-green-500 shadow-sm`}
        style={{
          left: `${table.x}px`,
          top: `${table.y}px`,
          width: `${table.width}px`,
          height: `${table.height}px`,
          zIndex: isSelected ? 10 : 5,
        }}
        onMouseDown={(e) => handleSelectTable(table, e)}
      >
        <div className="text-center">
          <div className="font-bold text-sm">{table.name}</div>
          <div className="text-xs">{table.capacity} seats</div>
        </div>
        
        {/* Render seats around the circle */}
        {Array.from({ length: table.capacity }).map((_, index) => {
          const angle = (2 * Math.PI * index) / table.capacity;
          const radius = Math.min(table.width, table.height) / 2 + 10; // 10px outside the table
          const seatX = radius * Math.cos(angle);
          const seatY = radius * Math.sin(angle);
          
          return (
            <div
              key={`seat-${table.id}-${index}`}
              className="absolute w-6 h-6 rounded-full bg-blue-100 border border-blue-300"
              style={{
                transform: `translate(${seatX}px, ${seatY}px)`,
                zIndex: 4,
              }}
            />
          );
        })}
      </div>
    );
  };

  // Render a half-circle table
  const renderHalfCircleTable = (table: TablePosition) => {
    const isSelected = selectedTable?.id === table.id;
    
    // Calculate rotation angle
    const rotationDeg = table.rotation;
    
    return (
      <div
        key={table.id}
        className={`absolute flex items-center justify-center 
          ${isSelected ? 'ring-2 ring-blue-500' : ''} 
          cursor-move shadow-sm overflow-hidden`}
        style={{
          left: `${table.x}px`,
          top: `${table.y}px`,
          width: `${table.width}px`,
          height: `${table.height}px`,
          zIndex: isSelected ? 10 : 5,
          transform: `rotate(${rotationDeg}deg)`,
        }}
        onMouseDown={(e) => handleSelectTable(table, e)}
      >
        {/* Half-circle shape */}
        <div 
          className="absolute w-full h-full bg-green-100 border border-green-500 rounded-t-full"
          style={{
            top: '50%',
          }}
        />
        
        <div className="text-center relative z-20 mt-[-25%]">
          <div className="font-bold text-sm">{table.name}</div>
          <div className="text-xs">{table.capacity} seats</div>
        </div>
        
        {/* Render seats along the curved edge */}
        {Array.from({ length: table.capacity }).map((_, index) => {
          // Calculate position along the half-circle
          const angle = (Math.PI * index) / (table.capacity - 1);
          const radius = table.width / 2 + 10; // 10px outside the table
          
          // Calculate position relative to the half-circle
          const seatX = radius * Math.cos(angle) - table.width / 2;
          const seatY = radius * Math.sin(angle);
          
          return (
            <div
              key={`seat-${table.id}-${index}`}
              className="absolute w-6 h-6 rounded-full bg-blue-100 border border-blue-300"
              style={{
                left: '50%',
                bottom: '0',
                transform: `translate(${seatX}px, ${seatY}px)`,
                zIndex: 4,
              }}
            />
          );
        })}
      </div>
    );
  };

  // Switch between table types for rendering
  const renderTable = (table: TablePosition) => {
    return table.type === 'circle' 
      ? renderCircleTable(table) 
      : renderHalfCircleTable(table);
  };

  // Handle zoom level change
  const handleZoomChange = (newZoom: number[]) => {
    setZoomLevel(newZoom[0]);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Layout Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas for table layout */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Venue Layout</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={handleAddTable}>
                    <Plus className="h-4 w-4 mr-1" /> Add Table
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center mb-2 justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="zoom">Zoom:</Label>
                  <div className="w-32">
                    <Slider
                      id="zoom"
                      defaultValue={[100]}
                      max={200}
                      min={50}
                      step={5}
                      value={[zoomLevel]}
                      onValueChange={handleZoomChange}
                    />
                  </div>
                  <span className="text-sm">{zoomLevel}%</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setZoomLevel(100)}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset View
                </Button>
              </div>
              
              <div 
                className="relative overflow-auto border rounded-md bg-white"
                style={{ height: '600px' }}
              >
                <div
                  ref={canvasRef}
                  className="relative"
                  style={{ 
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top left',
                    height: '100%',
                    width: '100%',
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onClick={handleCanvasClick}
                >
                  {/* Background image */}
                  <img 
                    src={floorPlanImage} 
                    alt="Floor Plan" 
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                  
                  {/* Render tables */}
                  {tables.map(table => renderTable(table))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Properties panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedTable ? `Table Properties: ${selectedTable.name}` : 'Select a Table'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTable ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tableName">Table Name</Label>
                    <Input
                      id="tableName"
                      value={selectedTable.name}
                      onChange={(e) => handleTablePropertyChange('name', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tableType">Table Type</Label>
                    <Select
                      value={selectedTable.type}
                      onValueChange={(value) => handleTablePropertyChange('type', value)}
                    >
                      <SelectTrigger id="tableType">
                        <SelectValue placeholder="Select table type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="circle">Circle</SelectItem>
                        <SelectItem value="half-circle">Half Circle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity (Seats)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min={1}
                      max={20}
                      value={selectedTable.capacity}
                      onChange={(e) => handleTablePropertyChange('capacity', parseInt(e.target.value))}
                    />
                  </div>
                  
                  {selectedTable.type === 'half-circle' && (
                    <div className="space-y-2">
                      <Label htmlFor="rotation">Orientation</Label>
                      <Select
                        value={selectedTable.rotation.toString()}
                        onValueChange={(value) => handleTablePropertyChange('rotation', parseInt(value))}
                      >
                        <SelectTrigger id="rotation">
                          <SelectValue placeholder="Select orientation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Top facing (0°)</SelectItem>
                          <SelectItem value="90">Right facing (90°)</SelectItem>
                          <SelectItem value="180">Bottom facing (180°)</SelectItem>
                          <SelectItem value="270">Left facing (270°)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Dimensions</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="width" className="text-xs">Width</Label>
                        <Input
                          id="width"
                          type="number"
                          min={40}
                          max={200}
                          value={Math.round(selectedTable.width)}
                          onChange={(e) => handleTablePropertyChange('width', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="height" className="text-xs">Height</Label>
                        <Input
                          id="height"
                          type="number"
                          min={40}
                          max={200}
                          value={Math.round(selectedTable.height)}
                          onChange={(e) => handleTablePropertyChange('height', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-4">
                    <Label>Position</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="x" className="text-xs">X</Label>
                        <Input
                          id="x"
                          type="number"
                          value={Math.round(selectedTable.x)}
                          onChange={(e) => handleTablePropertyChange('x', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="y" className="text-xs">Y</Label>
                        <Input
                          id="y"
                          type="number"
                          value={Math.round(selectedTable.y)}
                          onChange={(e) => handleTablePropertyChange('y', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500">
                  <AlertCircle className="h-12 w-12 mb-4" />
                  <p>Select a table to edit its properties<br />or add a new table.</p>
                </div>
              )}
            </CardContent>
            {selectedTable && (
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="destructive" onClick={handleDeleteTable}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button onClick={handleSaveTable}>
                  <Save className="h-4 w-4 mr-1" /> Save Changes
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LayoutSettings;