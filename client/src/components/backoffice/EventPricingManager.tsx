import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EventPricingManagerProps {
  eventId: number;
}

interface PricingTier {
  id: number;
  eventId: number;
  name: string;
  price: number;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

const pricingTierSchema = z.object({
  name: z.string().min(1, "Tier name is required").max(100, "Name too long"),
  price: z.number().min(0, "Price must be positive").max(100000, "Price too high"),
  description: z.string().max(500, "Description too long").optional(),
  displayOrder: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

type PricingTierForm = z.infer<typeof pricingTierSchema>;

export function EventPricingManager({ eventId }: EventPricingManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PricingTierForm>({
    resolver: zodResolver(pricingTierSchema),
    defaultValues: {
      name: "",
      price: 0,
      description: "",
      displayOrder: 0,
      isActive: true,
    },
  });

  // Fetch pricing tiers for this event
  const { data: pricingTiers, isLoading } = useQuery<PricingTier[]>({
    queryKey: ["/api/events", eventId, "pricing-tiers"],
    queryFn: () => apiRequest(`/api/events/${eventId}/pricing-tiers`),
  });

  // Create pricing tier mutation
  const createTierMutation = useMutation({
    mutationFn: (data: PricingTierForm) => 
      apiRequest(`/api/events/${eventId}/pricing-tiers`, {
        method: "POST",
        body: JSON.stringify({ ...data, price: Math.round(data.price * 100) }), // Convert to cents
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "pricing-tiers"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Pricing tier created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create pricing tier",
        variant: "destructive",
      });
    },
  });

  // Update pricing tier mutation
  const updateTierMutation = useMutation({
    mutationFn: ({ tierId, data }: { tierId: number; data: Partial<PricingTierForm> }) =>
      apiRequest(`/api/events/${eventId}/pricing-tiers/${tierId}`, {
        method: "PUT",
        body: JSON.stringify({ 
          ...data, 
          price: data.price ? Math.round(data.price * 100) : undefined 
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "pricing-tiers"] });
      setIsDialogOpen(false);
      setEditingTier(null);
      form.reset();
      toast({
        title: "Success",
        description: "Pricing tier updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pricing tier",
        variant: "destructive",
      });
    },
  });

  // Delete pricing tier mutation
  const deleteTierMutation = useMutation({
    mutationFn: (tierId: number) =>
      apiRequest(`/api/events/${eventId}/pricing-tiers/${tierId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "pricing-tiers"] });
      toast({
        title: "Success",
        description: "Pricing tier deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete pricing tier",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: PricingTierForm) => {
    if (editingTier) {
      updateTierMutation.mutate({ tierId: editingTier.id, data });
    } else {
      createTierMutation.mutate(data);
    }
  };

  const handleEdit = (tier: PricingTier) => {
    setEditingTier(tier);
    form.reset({
      name: tier.name,
      price: tier.price / 100, // Convert from cents
      description: tier.description || "",
      displayOrder: tier.displayOrder,
      isActive: tier.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (tierId: number) => {
    if (confirm("Are you sure you want to delete this pricing tier?")) {
      deleteTierMutation.mutate(tierId);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            Loading pricing tiers...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Event Pricing Tiers
            </CardTitle>
            <CardDescription>
              Create custom pricing tiers for this event and assign tables to each tier
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingTier(null);
                form.reset();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pricing Tier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTier ? "Edit Pricing Tier" : "Create New Pricing Tier"}
                </DialogTitle>
                <DialogDescription>
                  Define a pricing tier for this event. You can assign tables to this tier after creating it.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. VIP Lounge, Front Row, General Seating" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe what's included in this pricing tier..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="displayOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTierMutation.isPending || updateTierMutation.isPending}>
                      {editingTier ? "Update" : "Create"} Tier
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!pricingTiers || pricingTiers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No pricing tiers yet</p>
            <p className="text-sm">Create your first pricing tier to get started with event pricing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricingTiers
              .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
              .map((tier) => (
                <Card key={tier.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{tier.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-lg font-bold">
                            {formatPrice(tier.price)}
                          </Badge>
                          {!tier.isActive && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(tier)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(tier.id)}
                          disabled={deleteTierMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {tier.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">{tier.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}