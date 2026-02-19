#!/bin/bash

# Script to run Playwright tests in UAT environment
# Usage: ./run-uat.sh [test-file-path]

echo "🚀 Running tests in UAT environment"
echo "================================================"

# Set environment variable
export TEST_ENV=uat

# Run the tests
if [ -z "$1" ]; then
  # No argument - run all tests
  echo "📋 Running all tests..."
  npx playwright test
else
  # Run specific test file
  echo "📋 Running test: $1"
  npx playwright test "$1"
fi
