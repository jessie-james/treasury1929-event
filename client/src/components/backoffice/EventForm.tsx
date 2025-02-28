import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Event } from "@shared/schema";

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().url("Must be a valid URL"),
  date: z.string().min(1, "Date is required"),
  totalSeats: z.number().min(1, "Must have at least 1 seat"),
  venueId: z.number().default(1), // For now, hardcode to venue 1
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface Props {
  event?: Event | null;
  onClose: () => void;
}

export function EventForm({ event, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event ? {
      ...event,
      date: new Date(event.date).toISOString().split('T')[0],
    } : {
      title: "",
      description: "",
      image: "",
      date: new Date().toISOString().split('T')[0],
      totalSeats: 80,
      venueId: 1,
    },
  });

  const { mutate: saveEvent, isPending } = useMutation({
    mutationFn: async (data: EventFormData) => {
      console.log("Submitting event data:", data);
      const endpoint = event ? `/api/events/${event.id}` : "/api/events";
      const method = event ? "PATCH" : "POST";
      return apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: `Event ${event ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Event save error:", error);
      toast({
        title: "Error",
        description: `Failed to ${event ? "update" : "create"} event`,
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteEvent, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      if (!event) return;
      return apiRequest("DELETE", `/api/events/${event.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Event deleted successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{event ? "Edit Event" : "Create Event"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => {
            // Convert form data to proper types before submission
            const formattedData = {
              ...data,
              totalSeats: Number(data.totalSeats),
              date: new Date(data.date).toISOString(),
            };
            console.log("Formatted event data:", formattedData);
            saveEvent(formattedData);
          })} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalSeats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Seats</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              {event && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteEvent()}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Event"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : (event ? "Update" : "Create")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}