#!/bin/bash

# Script to run Playwright tests in Development environment
# Usage: ./run-dev.sh [test-file-path]

echo "🚀 Running tests in DEVELOPMENT environment"
echo "================================================"

# Set environment variable
export TEST_ENV=development

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
