import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { type AdminLog } from "@shared/schema";

type EnrichedAdminLog = AdminLog & {
  user?: {
    id: number;
    email: string;
    role: string;
  };
};

const formatDate = (date: string | Date | null) => {
  if (!date) return '';
  return new Date(date).toLocaleString();
};

const getActionDisplay = (action: string) => {
  // Map action types to more readable text
  const actionMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    create_manual_booking: { label: "Create Manual Booking", variant: "default" },
    cancel_booking: { label: "Cancel Booking", variant: "destructive" },
    process_refund: { label: "Process Refund", variant: "secondary" },
    add_booking_note: { label: "Add Note", variant: "outline" },
    change_booking_seats: { label: "Change Seats", variant: "secondary" },
    update_booking_food: { label: "Update Food", variant: "secondary" },
    create_event: { label: "Create Event", variant: "default" },
    update_event: { label: "Update Event", variant: "secondary" },
    delete_event: { label: "Delete Event", variant: "destructive" },
  };
  
  return actionMap[action] || { label: action, variant: "default" };
};

export function AdminLogs() {
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  
  const { data: logs, isLoading, error } = useQuery<EnrichedAdminLog[]>({
    queryKey: ["/api/admin-logs"],
  });
  
  // Filter logs based on entity type if a filter is selected
  const filteredLogs = entityFilter 
    ? logs?.filter(log => log.entityType === entityFilter)
    : logs;
  
  // Get unique entity types for the filter dropdown
  const entityTypes = logs ? Array.from(new Set(logs.map(log => log.entityType))) : [];
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Activity Logs</CardTitle>
          <CardDescription>Loading logs...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Activity Logs</CardTitle>
          <CardDescription>Failed to load logs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error instanceof Error ? error.message : "Unknown error"}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Activity Logs</CardTitle>
          <CardDescription>No logs found</CardDescription>
        </CardHeader>
        <CardContent>
          <p>No admin activity has been logged yet.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Activity Logs</CardTitle>
        <CardDescription>
          Track all administrative actions performed by staff members
        </CardDescription>
        <div className="flex flex-col sm:flex-row justify-between gap-2">
          <div className="w-full max-w-xs">
            <Select 
              onValueChange={(value) => setEntityFilter(value !== "all" ? value : null)} 
              defaultValue="all"
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs?.map((log) => {
                const actionDisplay = getActionDisplay(log.action);
                
                // Extract useful details from the log
                const details = log.details as any;
                let detailsText = "";
                
                if (log.action === "create_manual_booking") {
                  const bookingData = details?.bookingData;
                  if (bookingData) {
                    detailsText = `Created booking #${bookingData.id} for event #${bookingData.eventId}. ` +
                      `Table ${bookingData.tableId}, seats: ${bookingData.seatNumbers?.join(", ")}`;
                  }
                } else if (log.action === "cancel_booking") {
                  detailsText = `Booking #${log.entityId} was canceled`;
                  if (details?.reason) {
                    detailsText += ` - Reason: ${details.reason}`;
                  }
                } else if (log.action === "process_refund") {
                  detailsText = `Refund of $${details?.amount || 0} processed for booking #${log.entityId}`;
                  if (details?.refundId) {
                    detailsText += ` (${details.refundId})`;
                  }
                } else if (log.action === "add_booking_note") {
                  detailsText = `Note added to booking #${log.entityId}: "${details?.note || ""}"`;
                } else if (log.action === "change_booking_seats") {
                  if (details?.from && details?.to) {
                    detailsText = `Changed seats for booking #${log.entityId} ` +
                      `from Table ${details.from.tableId} seats ${details.from.seatNumbers?.join(", ")} ` +
                      `to Table ${details.to.tableId} seats ${details.to.seatNumbers?.join(", ")}`;
                  }
                } else if (log.action === "update_booking_food") {
                  detailsText = `Updated food selection for booking #${log.entityId}`;
                } else if (details) {
                  // Generic fallback for other actions
                  detailsText = `${log.entityType} #${log.entityId} - ` + 
                    JSON.stringify(details)
                      .replace(/[{}"\\]/g, '')
                      .replace(/,/g, ', ')
                      .slice(0, 100);
                }
                
                if (!detailsText) {
                  detailsText = `${log.entityType.charAt(0).toUpperCase() + log.entityType.slice(1)} #${log.entityId}`;
                }
                
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      {log.user?.email || `User #${log.userId}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionDisplay.variant}>
                        {actionDisplay.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.entityType.charAt(0).toUpperCase() + log.entityType.slice(1)}
                    </TableCell>
                    <TableCell className="max-w-md text-sm break-words">{detailsText}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}