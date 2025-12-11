import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CodeMonitorAgent {
  constructor(options = {}) {
    this.testDir = options.testDir || path.resolve(__dirname, '..');
    this.maxRetries = options.maxRetries || 3;
    this.logFile = options.logFile || 'monitor-agent.log';
    this.failureLog = options.failureLog || 'test-failures.json';
    this.isMonitoring = false;
    this.watchMode = options.watchMode || false;
    this.testResults = null;
    this.watchers = [];
    this.debounceTimer = null;
    this.debounceDelay = 2000; // Wait 2 seconds after file change before re-running
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n', 'utf8');
  }

  async startMonitoring() {
    this.log('Code Monitor Agent started', 'START');
    this.isMonitoring = true;

    try {
      if (fs.existsSync(this.logFile)) fs.unlinkSync(this.logFile);

      // Run tests initially
      await this.runTests();
      this.analyzeResults();
      await this.autoFixFailures();

      if (this.watchMode) {
        this.log('Starting watch mode - monitoring for file changes...', 'INFO');
        this.startWatching();
        // Keep the process running in watch mode
        process.on('SIGINT', () => this.stopWatching());
        process.on('SIGTERM', () => this.stopWatching());
      } else {
        this.log('Code Monitor Agent completed', 'END');
      }
    } catch (error) {
      this.log(`Agent error: ${error.message}`, 'ERROR');
      if (!this.watchMode) {
        process.exit(1);
      }
    }
  }

  startWatching() {
    const watchPaths = [
      path.join(this.testDir, 'tests'),
      path.join(this.testDir, 'tests/pages'),
      path.join(this.testDir, 'tests/config'),
    ].filter(p => fs.existsSync(p));

    watchPaths.forEach(watchPath => {
      try {
        const watcher = fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
          if (filename && (filename.endsWith('.js') || filename.endsWith('.ts') || filename.endsWith('.spec.js'))) {
            this.log(`File change detected: ${filename}`, 'INFO');
            this.scheduleTestRun();
          }
        });
        this.watchers.push(watcher);
        this.log(`Watching: ${watchPath}`, 'INFO');
      } catch (error) {
        this.log(`Failed to watch ${watchPath}: ${error.message}`, 'WARNING');
      }
    });

    this.log('Press Ctrl+C to stop monitoring', 'INFO');
  }

  scheduleTestRun() {
    // Debounce: wait for file changes to settle before running tests
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      this.log('Running tests after file changes...', 'INFO');
      await this.runTests();
      this.analyzeResults();
      await this.autoFixFailures();
    }, this.debounceDelay);
  }

  stopWatching() {
    this.log('Stopping watch mode...', 'INFO');
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
    this.log('Code Monitor Agent stopped', 'END');
    process.exit(0);
  }

  async runTests() {
    return new Promise((resolve) => {
      this.log('Running Playwright tests...', 'INFO');
      const playwright = spawn('npx', ['playwright', 'test', '--reporter=json'], {
        cwd: this.testDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      playwright.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      playwright.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      playwright.on('close', (code) => {
        try {
          // Try to parse JSON output from stdout first, then stderr
          const jsonOutput = stdout.trim() || stderr.trim();
          if (jsonOutput) {
            // Find JSON content (may be mixed with other output)
            const jsonMatch = jsonOutput.match(/\{[\s\S]*"suites"[\s\S]*\}/);
            if (jsonMatch) {
              this.testResults = JSON.parse(jsonMatch[0]);
            } else {
              this.testResults = JSON.parse(jsonOutput);
            }
          }
        } catch (error) {
          this.log(`Failed to parse test results: ${error.message}`, 'WARNING');
        }

        if (code === 0) {
          this.log('✓ All tests passed!', 'SUCCESS');
        } else {
          this.log(`✗ Tests failed with exit code ${code}`, 'WARNING');
        }

        resolve(code);
      });

      playwright.on('error', (error) => {
        this.log(`Test execution error: ${error.message}`, 'ERROR');
        resolve(1);
      });
    });
  }

  analyzeResults() {
    this.log('Analyzing test results...', 'INFO');

    if (!this.testResults || !this.testResults.suites) {
      this.log('No detailed test results available', 'WARNING');
      return;
    }

    const failures = [];
    const passes = [];

    const extractTests = (suites) => {
      suites.forEach(suite => {
        if (suite.specs) {
          suite.specs.forEach(spec => {
            spec.tests.forEach(test => {
              const testInfo = {
                title: spec.title,
                file: spec.file,
                status: test.status,
                duration: test.results[0]?.duration || 0,
                error: test.results[0]?.error
              };

              if (test.status === 'failed' || test.status === 'timedOut') {
                failures.push(testInfo);
              } else if (test.status === 'passed') {
                passes.push(testInfo);
              }
            });
          });
        }
        if (suite.suites) {
          extractTests(suite.suites);
        }
      });
    };

    extractTests(this.testResults.suites);

    // Log summary
    this.log(`Test Summary: ${passes.length} passed, ${failures.length} failed`, 'INFO');

    // Log failures
    if (failures.length > 0) {
      this.log('Failed Tests:', 'ERROR');
      failures.forEach((test, index) => {
        this.log(`  ${index + 1}. ${test.title}`, 'ERROR');
        this.log(`     File: ${test.file}`, 'ERROR');
        if (test.error) {
          this.log(`     Error: ${test.error.message || 'Unknown error'}`, 'ERROR');
        }
      });

      // Save failures to JSON file
      fs.writeFileSync(
        this.failureLog,
        JSON.stringify({ failures, timestamp: new Date().toISOString() }, null, 2),
        'utf8'
      );
      this.log(`Failure details saved to ${this.failureLog}`, 'INFO');
    }
  }

  async autoFixFailures() {
    if (!this.testResults || !fs.existsSync(this.failureLog)) {
      return;
    }

    this.log('Checking for auto-fixable failures...', 'INFO');

    const failureData = JSON.parse(fs.readFileSync(this.failureLog, 'utf8'));
    const { failures } = failureData;

    if (failures.length === 0) {
      this.log('No failures to retry', 'INFO');
      return;
    }

    // Check for common retryable errors
    const retryableFailures = failures.filter(f => {
      const errorMsg = f.error?.message || '';
      return (
        errorMsg.includes('timeout') ||
        errorMsg.includes('NetworkError') ||
        errorMsg.includes('net::ERR_') ||
        errorMsg.includes('Navigation timeout')
      );
    });

    if (retryableFailures.length > 0) {
      this.log(`Found ${retryableFailures.length} potentially retryable failures`, 'INFO');
      this.log('Suggestion: These failures may be intermittent. Consider re-running tests.', 'INFO');
    } else {
      this.log('No auto-retryable failures detected. Manual intervention may be required.', 'INFO');
    }
  }

  getReport() {
    const report = {
      status: this.testResults ? 'COMPLETED' : 'RUNNING',
      timestamp: new Date().toISOString(),
      logFile: this.logFile,
      failureLog: this.failureLog,
      watchMode: this.watchMode
    };

    if (this.testResults) {
      const stats = this.calculateStats();
      report.stats = stats;
    }

    return report;
  }

  calculateStats() {
    if (!this.testResults || !this.testResults.suites) {
      return null;
    }

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDuration = 0;

    const countTests = (suites) => {
      suites.forEach(suite => {
        if (suite.specs) {
          suite.specs.forEach(spec => {
            spec.tests.forEach(test => {
              const status = test.status;
              const duration = test.results[0]?.duration || 0;
              totalDuration += duration;

              if (status === 'passed') passed++;
              else if (status === 'failed' || status === 'timedOut') failed++;
              else if (status === 'skipped') skipped++;
            });
          });
        }
        if (suite.suites) {
          countTests(suite.suites);
        }
      });
    };

    countTests(this.testResults.suites);

    return {
      passed,
      failed,
      skipped,
      total: passed + failed + skipped,
      duration: totalDuration
    };
  }
}

export default CodeMonitorAgent;

// Entry point - run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const watchMode = process.argv.includes('--watch') || process.argv.includes('-w');
  const agent = new CodeMonitorAgent({ watchMode });
  agent.startMonitoring().catch(console.error);
}
