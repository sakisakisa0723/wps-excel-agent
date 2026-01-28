#!/bin/bash
cd /home/ubuntu/wps-excel-agent
git pull origin main
npm install --production
pm2 restart wps-server
echo "Updated at $(date)"
