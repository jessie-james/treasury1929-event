import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link2, Calendar, Users, Trash2, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PrivateEventManagerProps {
  eventId: number;
  isPrivate: boolean;
}

interface AccessToken {
  id: string;
  description: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  currentUses: number;
  createdAt: string;
  isExpired: boolean;
  isMaxedOut: boolean;
}

export function PrivateEventManager({ eventId, isPrivate }: PrivateEventManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [generatedToken, setGeneratedToken] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing access tokens
  const { data: tokens = [], isLoading } = useQuery<AccessToken[]>({
    queryKey: [`/api/events/${eventId}/private-access`],
    enabled: isPrivate,
  });

  // Create access token mutation
  const createTokenMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/events/${eventId}/private-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create access token");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedToken(data);
      setIsCreating(false);
      setDescription("");
      setExpiresAt("");
      setMaxUses("");
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/private-access`] });
      toast({
        title: "Access token created",
        description: "Private event access link has been generated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create access token.",
        variant: "destructive",
      });
    },
  });

  // Revoke token mutation
  const revokeTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const response = await fetch(`/api/events/${eventId}/private-access/${tokenId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to revoke token");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/private-access`] });
      toast({
        title: "Token revoked",
        description: "Access token has been revoked successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke access token.",
        variant: "destructive",
      });
    },
  });

  const handleCreateToken = () => {
    const data: any = {
      eventId,
    };

    if (description.trim()) {
      data.description = description.trim();
    }
    
    if (expiresAt) {
      data.expiresAt = new Date(expiresAt).toISOString();
    }
    
    if (maxUses && parseInt(maxUses) > 0) {
      data.maxUses = parseInt(maxUses);
    }

    createTokenMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Access link copied to clipboard.",
    });
  };

  if (!isPrivate) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            This event is public and doesn't require access management.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Token */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Generate Access Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCreating ? (
            <Button onClick={() => setIsCreating(true)}>
              Create New Access Link
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., VIP Guest List, Media Access"
                />
              </div>
              
              <div>
                <Label htmlFor="expires">Expires At (Optional)</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="maxUses">Max Uses (Optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateToken}
                  disabled={createTokenMutation.isPending}
                >
                  {createTokenMutation.isPending ? "Creating..." : "Generate Link"}
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Token Display */}
      {generatedToken && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Access Link Generated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Access URL</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedToken.accessUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(generatedToken.accessUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Token ID:</span> {generatedToken.tokenId}
              </div>
              {generatedToken.expiresAt && (
                <div>
                  <span className="font-medium">Expires:</span>{" "}
                  {new Date(generatedToken.expiresAt).toLocaleString()}
                </div>
              )}
              {generatedToken.maxUses && (
                <div>
                  <span className="font-medium">Max Uses:</span> {generatedToken.maxUses}
                </div>
              )}
            </div>
            
            <Button variant="outline" onClick={() => setGeneratedToken(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing Tokens */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Access Links</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading access tokens...</p>
          ) : tokens.length === 0 ? (
            <p className="text-muted-foreground">No access links created yet.</p>
          ) : (
            <div className="space-y-4">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {token.description || `Token ${token.id.slice(0, 8)}...`}
                    </div>
                    <div className="text-sm text-muted-foreground space-x-4">
                      <span>Uses: {token.currentUses}</span>
                      {token.maxUses && <span>/ {token.maxUses}</span>}
                      {token.expiresAt && (
                        <span>
                          Expires: {new Date(token.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {(token.isExpired || token.isMaxedOut) && (
                      <div className="text-red-600 text-sm">
                        {token.isExpired ? "Expired" : "Max uses reached"}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeTokenMutation.mutate(token.id)}
                    disabled={revokeTokenMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}