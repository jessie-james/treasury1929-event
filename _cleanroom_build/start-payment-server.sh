#!/bin/bash

# Kill any existing payment servers
pkill -f "payment-redirect-server" 2>/dev/null || true
pkill -f "node.*3002" 2>/dev/null || true

# Wait for processes to terminate
sleep 2

# Start the payment server
echo "Starting payment redirect server..."
exec node payment-redirect-server.cjs