#!/bin/bash

# Kill any existing Express processes on port 3002
pkill -f "server/express-only.ts" 2>/dev/null || true
sleep 1

# Start the Express server in background
tsx server/express-only.ts &
EXPRESS_PID=$!

echo "Express payment server started with PID: $EXPRESS_PID"
echo "Server running on: http://localhost:3002"
echo "Health check: http://localhost:3002/health"
echo "Success page: http://localhost:3002/booking-success"

# Keep the script running to maintain the process
wait $EXPRESS_PID