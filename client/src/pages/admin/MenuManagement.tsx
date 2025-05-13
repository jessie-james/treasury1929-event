import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { X, Plus, GripVertical, Save, ArrowUpDown, Edit, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import BackofficeLayout from "@/components/backoffice/BackofficeLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  isAvailable: boolean | null;
  image: string | null;
  containsAllergens: string[] | null;
  dietaryInfo: string[] | null;
  displayOrder?: number; // Added for ordering
}

type MenuItemForm = Omit<MenuItem, "id">;

const ALLERGENS = ['gluten', 'dairy', 'nuts', 'peanuts', 'shellfish', 'eggs', 'soy', 'fish'];
const DIETARY_RESTRICTIONS = ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'dairy-free', 'nut-free'];
const CATEGORIES = ['Starter', 'Main', 'Dessert', 'Drink', 'Special'];

const MenuManagement = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState("All");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuItemForm>({
    name: "",
    description: "",
    price: 0,
    category: "",
    isAvailable: true,
    image: "",
    containsAllergens: [],
    dietaryInfo: [],
  });

  // Fetch menu items
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["/api/admin/menu-items"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/menu-items");
      if (!response.ok) {
        throw new Error("Failed to fetch menu items");
      }
      const items = await response.json();
      return items as MenuItem[];
    },
  });

  // Group menu items by category
  const menuItemsByCategory = menuItems.reduce<Record<string, MenuItem[]>>(
    (acc, item) => {
      const category = item.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {}
  );

  // Add menu item mutation
  const addMenuItemMutation = useMutation({
    mutationFn: async (newItem: MenuItemForm) => {
      const response = await apiRequest("POST", "/api/admin/menu-items", newItem);
      if (!response.ok) {
        throw new Error("Failed to add menu item");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu-items"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Menu item added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update menu item mutation
  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MenuItem> }) => {
      const response = await apiRequest("PUT", `/api/admin/menu-items/${id}`, data);
      if (!response.ok) {
        throw new Error("Failed to update menu item");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu-items"] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete menu item mutation
  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/menu-items/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete menu item");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu-items"] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update menu items order mutation
  const updateMenuOrderMutation = useMutation({
    mutationFn: async (items: { id: number; displayOrder: number }[]) => {
      const response = await apiRequest("POST", "/api/admin/menu-items/reorder", { items });
      if (!response.ok) {
        throw new Error("Failed to update menu order");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu-items"] });
      toast({
        title: "Success",
        description: "Menu order updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddItem = () => {
    addMenuItemMutation.mutate(formData);
  };

  const handleUpdateItem = () => {
    if (!selectedItem) return;
    
    updateMenuItemMutation.mutate({
      id: selectedItem.id,
      data: formData,
    });
  };

  const handleDeleteItem = () => {
    if (!selectedItem) return;
    
    deleteMenuItemMutation.mutate(selectedItem.id);
  };

  const openEditDialog = (item: MenuItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price || 0,
      category: item.category || "",
      isAvailable: item.isAvailable !== false,
      image: item.image || "",
      containsAllergens: item.containsAllergens || [],
      dietaryInfo: item.dietaryInfo || [],
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (item: MenuItem) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      category: "",
      isAvailable: true,
      image: "",
      containsAllergens: [],
      dietaryInfo: [],
    });
    setSelectedItem(null);
  };

  const handleFormChange = (field: keyof MenuItemForm, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // Extract the category from the droppable ID
    const sourceCategory = source.droppableId;
    const destCategory = destination.droppableId;
    
    if (sourceCategory !== destCategory) {
      // Handle moving between categories
      const sourceItems = [...(menuItemsByCategory[sourceCategory] || [])];
      const destItems = [...(menuItemsByCategory[destCategory] || [])];
      
      const [movedItem] = sourceItems.splice(source.index, 1);
      movedItem.category = destCategory === "Uncategorized" ? null : destCategory;
      
      destItems.splice(destination.index, 0, movedItem);
      
      // Update the item's category in the database
      updateMenuItemMutation.mutate({
        id: movedItem.id,
        data: { category: movedItem.category }
      });
    } else {
      // Handle reordering within the same category
      const items = [...(menuItemsByCategory[sourceCategory] || [])];
      const [movedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, movedItem);
      
      // Update display order for all items in this category
      const updatedItems = items.map((item, index) => ({
        id: item.id,
        displayOrder: index
      }));
      
      updateMenuOrderMutation.mutate(updatedItems);
    }
  };

  const renderMenuItems = () => {
    if (isLoading) {
      return <div className="flex justify-center p-8">Loading menu items...</div>;
    }

    if (menuItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="mb-4 text-muted-foreground">No menu items found</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>Add Your First Menu Item</Button>
        </div>
      );
    }

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Accordion type="multiple" className="w-full">
          {Object.entries(menuItemsByCategory)
            .filter(([category]) => currentCategory === "All" || category === currentCategory)
            .map(([category, items]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="hover:bg-muted px-4 py-2 rounded-md">
                  <div className="flex items-center justify-between w-full">
                    <span>{category} ({items.length})</span>
                    <span className="text-sm text-muted-foreground">
                      Drag items to reorder
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Droppable droppableId={category}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 p-2"
                      >
                        {items.map((item, index) => (
                          <Draggable
                            key={item.id.toString()}
                            draggableId={item.id.toString()}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="bg-card rounded-md border p-3 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-move text-muted-foreground hover:text-foreground"
                                  >
                                    <GripVertical size={20} />
                                  </div>
                                  <div>
                                    <h3 className="font-medium">{item.name}</h3>
                                    <p className="text-sm text-muted-foreground truncate max-w-md">
                                      {item.description || "No description"}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-sm">
                                        {item.price ? `${(item.price / 100).toFixed(2)}` : "Free"}
                                      </span>
                                      {!item.isAvailable && (
                                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                          Not Available
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(item)}
                                  >
                                    <Edit size={16} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteDialog(item)}
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </DragDropContext>
    );
  };

  return (
    <BackofficeLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Menu Management</h1>
            <p className="text-muted-foreground">
              Manage your menu items with drag and drop functionality
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add New Item
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter & Instructions</CardTitle>
            <CardDescription>
              Filter menu items by category and drag to reorder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 md:items-center">
              <div>
                <Label htmlFor="category-filter">Filter by Category</Label>
                <Select
                  value={currentCategory}
                  onValueChange={setCurrentCategory}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {Object.keys(menuItemsByCategory).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="bg-muted p-3 rounded-md mt-4 md:mt-0 text-sm">
                <h4 className="font-medium flex items-center mb-2">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Drag & Drop Tips
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Drag items within a category to reorder them</li>
                  <li>Drag items between categories to change their category</li>
                  <li>Changes are saved automatically</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {renderMenuItems()}
      </div>

      {/* Add Menu Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Menu Item</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new menu item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="Item name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => handleFormChange("description", e.target.value)}
                placeholder="Item description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price (in cents)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) => handleFormChange("price", parseInt(e.target.value))}
                  placeholder="Price in cents"
                />
                <span className="text-xs text-muted-foreground">
                  Example: 1295 for $12.95
                </span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category || ""}
                  onValueChange={(value) => handleFormChange("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                value={formData.image || ""}
                onChange={(e) => handleFormChange("image", e.target.value)}
                placeholder="Image URL"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isAvailable"
                checked={formData.isAvailable !== false}
                onCheckedChange={(checked) => handleFormChange("isAvailable", checked)}
              />
              <Label htmlFor="isAvailable">Item is available</Label>
            </div>
            <div className="grid gap-2">
              <Label>Contains Allergens</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {ALLERGENS.map((allergen) => (
                  <div key={allergen} className="flex items-center gap-2">
                    <Checkbox
                      id={`allergen-${allergen}`}
                      checked={(formData.containsAllergens || []).includes(allergen)}
                      onCheckedChange={(checked) => {
                        const newAllergens = [...(formData.containsAllergens || [])];
                        if (checked) {
                          if (!newAllergens.includes(allergen)) {
                            newAllergens.push(allergen);
                          }
                        } else {
                          const index = newAllergens.indexOf(allergen);
                          if (index !== -1) {
                            newAllergens.splice(index, 1);
                          }
                        }
                        handleFormChange("containsAllergens", newAllergens);
                      }}
                    />
                    <Label htmlFor={`allergen-${allergen}`}>{allergen}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Dietary Information</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {DIETARY_RESTRICTIONS.map((restriction) => (
                  <div key={restriction} className="flex items-center gap-2">
                    <Checkbox
                      id={`restriction-${restriction}`}
                      checked={(formData.dietaryInfo || []).includes(restriction)}
                      onCheckedChange={(checked) => {
                        const newRestrictions = [...(formData.dietaryInfo || [])];
                        if (checked) {
                          if (!newRestrictions.includes(restriction)) {
                            newRestrictions.push(restriction);
                          }
                        } else {
                          const index = newRestrictions.indexOf(restriction);
                          if (index !== -1) {
                            newRestrictions.splice(index, 1);
                          }
                        }
                        handleFormChange("dietaryInfo", newRestrictions);
                      }}
                    />
                    <Label htmlFor={`restriction-${restriction}`}>{restriction}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleAddItem} disabled={!formData.name}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Menu Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>
              Update the details of this menu item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="Item name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description || ""}
                onChange={(e) => handleFormChange("description", e.target.value)}
                placeholder="Item description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Price (in cents)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) => handleFormChange("price", parseInt(e.target.value))}
                  placeholder="Price in cents"
                />
                <span className="text-xs text-muted-foreground">
                  Example: 1295 for $12.95
                </span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={formData.category || ""}
                  onValueChange={(value) => handleFormChange("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-image">Image URL</Label>
              <Input
                id="edit-image"
                value={formData.image || ""}
                onChange={(e) => handleFormChange("image", e.target.value)}
                placeholder="Image URL"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-isAvailable"
                checked={formData.isAvailable !== false}
                onCheckedChange={(checked) => handleFormChange("isAvailable", checked)}
              />
              <Label htmlFor="edit-isAvailable">Item is available</Label>
            </div>
            <div className="grid gap-2">
              <Label>Contains Allergens</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {ALLERGENS.map((allergen) => (
                  <div key={allergen} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-allergen-${allergen}`}
                      checked={(formData.containsAllergens || []).includes(allergen)}
                      onCheckedChange={(checked) => {
                        const newAllergens = [...(formData.containsAllergens || [])];
                        if (checked) {
                          if (!newAllergens.includes(allergen)) {
                            newAllergens.push(allergen);
                          }
                        } else {
                          const index = newAllergens.indexOf(allergen);
                          if (index !== -1) {
                            newAllergens.splice(index, 1);
                          }
                        }
                        handleFormChange("containsAllergens", newAllergens);
                      }}
                    />
                    <Label htmlFor={`edit-allergen-${allergen}`}>{allergen}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Dietary Information</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {DIETARY_RESTRICTIONS.map((restriction) => (
                  <div key={restriction} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-restriction-${restriction}`}
                      checked={(formData.dietaryInfo || []).includes(restriction)}
                      onCheckedChange={(checked) => {
                        const newRestrictions = [...(formData.dietaryInfo || [])];
                        if (checked) {
                          if (!newRestrictions.includes(restriction)) {
                            newRestrictions.push(restriction);
                          }
                        } else {
                          const index = newRestrictions.indexOf(restriction);
                          if (index !== -1) {
                            newRestrictions.splice(index, 1);
                          }
                        }
                        handleFormChange("dietaryInfo", newRestrictions);
                      }}
                    />
                    <Label htmlFor={`edit-restriction-${restriction}`}>{restriction}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleUpdateItem} disabled={!formData.name}>
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Menu Item Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the menu item 
              <span className="font-semibold"> {selectedItem?.name}</span>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BackofficeLayout>
  );
};

export default MenuManagement;