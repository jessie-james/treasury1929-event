import { useEffect, useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

interface EditorPosition {
  x: number;
  y: number;
  editorId: string;
  timestamp: number;
}

interface TableUpdate {
  tableId: number;
  changes: any;
  action: 'update' | 'create' | 'delete';
  timestamp: number;
}

interface UseLayoutCollaborationProps {
  venueId: number;
  onTableUpdate?: (tableData: any, action: string, sourceEditorId: string) => void;
  onEditorPositionChange?: (position: EditorPosition) => void;
  onEditorJoined?: (editorId: string, count: number) => void;
  onEditorLeft?: (count: number) => void;
}

export function useLayoutCollaboration({
  venueId,
  onTableUpdate,
  onEditorPositionChange,
  onEditorJoined,
  onEditorLeft
}: UseLayoutCollaborationProps) {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [editorCount, setEditorCount] = useState(1);
  const [editorId] = useState(() => uuidv4()); // Generate unique ID for this editor
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('Connected to layout collaboration server');
        setConnected(true);
        
        // Join the venue layout editor session
        socket.send(JSON.stringify({
          type: 'join_layout_editor',
          venueId,
          editorId
        }));
        
        // Clear any reconnect timeouts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      socket.onclose = () => {
        console.log('Disconnected from layout collaboration server');
        setConnected(false);
        
        // Attempt to reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        socket.close();
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'editor_count':
              setEditorCount(data.editorCount);
              break;
              
            case 'editor_joined':
              setEditorCount(data.editorCount);
              if (onEditorJoined && data.editorId !== editorId) {
                onEditorJoined(data.editorId, data.editorCount);
              }
              break;
              
            case 'editor_left':
              setEditorCount(data.editorCount);
              if (onEditorLeft) {
                onEditorLeft(data.editorCount);
              }
              break;
              
            case 'table_update':
              if (onTableUpdate && data.editorId !== editorId) {
                onTableUpdate(data.table, data.action, data.editorId);
              }
              break;
              
            case 'editor_position':
              if (onEditorPositionChange && data.editorId !== editorId) {
                onEditorPositionChange({
                  x: data.position.x,
                  y: data.position.y,
                  editorId: data.editorId,
                  timestamp: Date.now()
                });
              }
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };
      
      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to connect to WebSocket server:', error);
      toast({
        title: 'Connection Failed',
        description: 'Could not connect to collaboration server. Retrying...',
        variant: 'destructive',
      });
      
      // Attempt to reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  }, [editorId, onEditorJoined, onEditorLeft, onTableUpdate, onEditorPositionChange, toast, venueId]);
  
  // Send table update to other editors
  const sendTableUpdate = useCallback((table: any, action: 'update' | 'create' | 'delete' = 'update') => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'table_update',
        editorId,
        venueId,
        table,
        action,
        timestamp: Date.now()
      }));
    }
  }, [editorId, venueId]);
  
  // Send cursor position to other editors
  const sendEditorPosition = useCallback((x: number, y: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'editor_position',
        editorId,
        venueId,
        position: { x, y },
        timestamp: Date.now()
      }));
    }
  }, [editorId, venueId]);
  
  // Connect on component mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);
  
  return {
    connected,
    editorCount,
    editorId,
    sendTableUpdate,
    sendEditorPosition
  };
}