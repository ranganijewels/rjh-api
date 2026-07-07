#!/bin/bash
set -e
echo "Setting up RJ House API development environment..."
cp .env.example .env
npm install
docker-compose up -d postgres redis minio rabbitmq elasticsearch
echo "Waiting for services to be ready..."
sleep 15
npm run migration:run
echo "Setup complete! Run: npm run start:dev"
