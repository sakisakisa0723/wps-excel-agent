#!/bin/bash
cd /home/ubuntu/wps-excel-agent
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
    git pull origin main
    npm run build
    pkill -f "node.*server.js"
    sleep 1
    nohup node server.js > /dev/null 2>&1 &
fi
