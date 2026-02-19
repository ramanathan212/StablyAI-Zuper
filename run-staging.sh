#!/bin/bash

# Script to run Playwright tests in Staging environment
# Usage: ./run-staging.sh [test-file-path]

echo "🚀 Running tests in STAGING environment"
echo "================================================"

# Set environment variable
export TEST_ENV=staging

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
