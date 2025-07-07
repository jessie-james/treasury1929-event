/**
 * NEW: Beverage Management Tab
 * Part of the implementation of Priority Guide requirements
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type FoodOption } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, Wine, Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BeverageManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBeverage, setEditingBeverage] = useState<FoodOption | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState<string>("wine_glass");
  const [isAvailable, setIsAvailable] = useState(true);
  const [image, setImage] = useState("");

  // Fetch beverages (wine_glass and wine_bottle types)
  const { data: beverages = [], isLoading } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
    select: (data) => data.filter(option => 
      option.type === 'wine_glass' || option.type === 'wine_bottle'
    ),
  });

  // Create beverage mutation
  const createMutation = useMutation({
    mutationFn: async (beverageData: any) => {
      return await apiRequest("/api/food-options", {
        method: "POST",
        body: JSON.stringify(beverageData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      resetForm();
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Beverage created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create beverage",
        variant: "destructive",
      });
    },
  });

  // Update beverage mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...beverageData }: any) => {
      return await apiRequest(`/api/food-options/${id}`, {
        method: "PUT",
        body: JSON.stringify(beverageData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      resetForm();
      setIsEditDialogOpen(false);
      setEditingBeverage(null);
      toast({
        title: "Success", 
        description: "Beverage updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update beverage",
        variant: "destructive",
      });
    },
  });

  // Delete beverage mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/food-options/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-options"] });
      toast({
        title: "Success",
        description: "Beverage deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete beverage",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setType("wine_glass");
    setIsAvailable(true);
    setImage("");
  };

  const openEditDialog = (beverage: FoodOption) => {
    setEditingBeverage(beverage);
    setName(beverage.name);
    setDescription(beverage.description || "");
    setPrice((beverage.price / 100).toString());
    setType(beverage.type);
    setIsAvailable(beverage.isAvailable);
    setImage(beverage.image || "");
    setIsEditDialogOpen(true);
  };

  const handleSubmit = () => {
    const beverageData = {
      name,
      description,
      price: Math.round(parseFloat(price) * 100), // Convert to cents
      type,
      isAvailable,
      image,
    };

    if (editingBeverage) {
      updateMutation.mutate({ id: editingBeverage.id, ...beverageData });
    } else {
      createMutation.mutate(beverageData);
    }
  };

  const getBeverageIcon = (type: string) => {
    switch (type) {
      case 'wine_glass':
        return <Wine className="h-4 w-4" />;
      case 'wine_bottle':
        return <Wine className="h-4 w-4" />;
      default:
        return <Coffee className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'wine_glass':
        return 'Wine by Glass';
      case 'wine_bottle':
        return 'Wine Bottle';
      default:
        return type;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Beverage Management</h2>
          <p className="text-muted-foreground">
            Manage wine selections and other beverages for events
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Beverage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Beverage</DialogTitle>
              <DialogDescription>
                Create a new wine or beverage option for events
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Pinot Noir"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the beverage..."
                />
              </div>
              
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wine_glass">Wine by Glass</SelectItem>
                    <SelectItem value="wine_bottle">Wine Bottle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={isAvailable}
                  onCheckedChange={setIsAvailable}
                />
                <Label htmlFor="available">Available</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || !name || !price}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Beverage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Important Notices */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-sm text-orange-800 font-medium">
              Must be 21+ to purchase alcohol
            </p>
            <p className="text-xs text-orange-600 mt-1">
              ID verification required at venue
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800 font-medium">
              Mixed drinks available at venue
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Arrive 10 minutes early to order
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="text-sm text-green-800 font-medium">
              Water provided with all meals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Beverages List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {beverages.map((beverage) => (
          <Card key={beverage.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  {getBeverageIcon(beverage.type)}
                  <CardTitle className="text-lg">{beverage.name}</CardTitle>
                </div>
                <Badge variant={beverage.isAvailable ? "default" : "secondary"}>
                  {beverage.isAvailable ? "Available" : "Unavailable"}
                </Badge>
              </div>
              <Badge variant="outline">{getTypeLabel(beverage.type)}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {beverage.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">
                  ${(beverage.price / 100).toFixed(2)}
                </span>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(beverage)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(beverage.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Beverage</DialogTitle>
            <DialogDescription>
              Update beverage information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-price">Price ($)</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wine_glass">Wine by Glass</SelectItem>
                  <SelectItem value="wine_bottle">Wine Bottle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-image">Image URL</Label>
              <Input
                id="edit-image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-available"
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
              />
              <Label htmlFor="edit-available">Available</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={updateMutation.isPending || !name || !price}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Beverage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}