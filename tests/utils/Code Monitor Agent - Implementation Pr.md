# Code Monitor Agent - Implementation Prompts

## Overview
This document provides prompts and guidelines for using and extending the Code Monitor Agent in future work.

## Key Responsibilities

### 1. Continuous Monitoring
- [ ] Monitor test execution status in real-time
- [ ] Log all test runs with timestamps
- [ ] Track pass/fail rates over time
- [ ] Alert on sudden failures

### 2. Failure Detection & Analysis
- [ ] Parse Playwright test results (JSON format)
- [ ] Identify flaky tests (intermittent failures)
- [ ] Categorize failures: selector issues, timeouts, data issues
- [ ] Group similar failures

### 3. Auto-Fix Capabilities
- [ ] Retry failed tests automatically (max 3 attempts)
- [ ] Suggest selector updates for broken locators
- [ ] Recommend wait conditions for timing issues
- [ ] Update test data when assertions fail

### 4. Logging & Reporting
- [ ] Write structured logs to `monitor-agent.log`
- [ ] Store failures in `test-failures.json` for tracking
- [ ] Generate daily/weekly reports
- [ ] Maintain failure history for pattern detection

## Implementation Checklist

### Phase 1: Basic Setup ✓
- [x] Create CodeMonitorAgent class
- [x] Implement test runner integration
- [x] Add logging system
- [ ] Wire up to npm scripts

### Phase 2: Enhanced Monitoring
- [ ] Add Playwright report parsing
- [ ] Implement failure categorization
- [ ] Create email/Slack notifications
- [ ] Build Web UI dashboard

### Phase 3: AI-Driven Fixes
- [ ] Integrate Claude API for fix suggestions
- [ ] Auto-update selectors using AI analysis
- [ ] Learn from successful retries
- [ ] Improve wait condition detection

### Phase 4: Advanced Features
- [ ] Historical trend analysis
- [ ] Predictive failure alerts
- [ ] Performance regression detection
- [ ] Video/screenshot capture for debugging

## Usage Examples

### Basic Run
```bash
npm run monitor