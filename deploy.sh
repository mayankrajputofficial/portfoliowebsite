#!/bin/bash

cd ~/projects/portfoliowebsite || exit

git fetch origin

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "New commit detected: $(date)"

    git pull origin main

    docker compose up -d --build

    echo "Deployment completed: $(date)"
else
    echo "No changes: $(date)"
fi
