import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReportGenerator {
  constructor() {
    this.logFile = 'monitor-agent.log';
    this.failureLog = 'test-failures.json';
  }

  generateReport() {
    console.log('\n=================================');
    console.log('  CODE MONITOR AGENT REPORT');
    console.log('=================================\n');

    // Check if monitoring has run
    if (!fs.existsSync(this.logFile)) {
      console.log('❌ No monitoring data found. Run "npm run monitor" first.\n');
      return;
    }

    // Read and display log summary
    const logContent = fs.readFileSync(this.logFile, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim());

    console.log('📊 MONITORING SUMMARY');
    console.log('─────────────────────\n');

    // Extract key events from log
    const startTime = this.extractTimestamp(logLines.find(l => l.includes('[START]')));
    const endTime = this.extractTimestamp(logLines.find(l => l.includes('[END]')) || logLines[logLines.length - 1]);
    const successLines = logLines.filter(l => l.includes('[SUCCESS]'));
    const errorLines = logLines.filter(l => l.includes('[ERROR]'));
    const warningLines = logLines.filter(l => l.includes('[WARNING]'));

    if (startTime) {
      console.log(`Start Time: ${new Date(startTime).toLocaleString()}`);
    }
    if (endTime) {
      console.log(`End Time:   ${new Date(endTime).toLocaleString()}`);
    }
    if (startTime && endTime) {
      const duration = (new Date(endTime) - new Date(startTime)) / 1000;
      console.log(`Duration:   ${duration.toFixed(2)} seconds`);
    }

    console.log(`\nStatus Summary:`);
    console.log(`  ✓ Success: ${successLines.length}`);
    console.log(`  ⚠ Warnings: ${warningLines.length}`);
    console.log(`  ✗ Errors: ${errorLines.length}`);

    // Display test failures if available
    if (fs.existsSync(this.failureLog)) {
      console.log('\n\n📋 TEST FAILURES');
      console.log('─────────────────────\n');

      const failureData = JSON.parse(fs.readFileSync(this.failureLog, 'utf8'));
      const { failures, timestamp } = failureData;

      console.log(`Last Updated: ${new Date(timestamp).toLocaleString()}`);
      console.log(`Total Failures: ${failures.length}\n`);

      if (failures.length > 0) {
        failures.forEach((failure, index) => {
          console.log(`${index + 1}. ${failure.title}`);
          console.log(`   File: ${path.basename(failure.file)}`);
          console.log(`   Status: ${failure.status}`);
          console.log(`   Duration: ${(failure.duration / 1000).toFixed(2)}s`);

          if (failure.error) {
            console.log(`   Error: ${failure.error.message || 'Unknown error'}`);
          }
          console.log('');
        });

        // Categorize failures
        const timeoutFailures = failures.filter(f =>
          f.error?.message?.includes('timeout') || f.status === 'timedOut'
        );
        const networkFailures = failures.filter(f =>
          f.error?.message?.includes('NetworkError') ||
          f.error?.message?.includes('net::ERR_')
        );

        console.log('📈 FAILURE ANALYSIS');
        console.log('─────────────────────\n');

        if (timeoutFailures.length > 0) {
          console.log(`⏱️  Timeout-related failures: ${timeoutFailures.length}`);
        }
        if (networkFailures.length > 0) {
          console.log(`🌐 Network-related failures: ${networkFailures.length}`);
        }

        const otherFailures = failures.length - timeoutFailures.length - networkFailures.length;
        if (otherFailures > 0) {
          console.log(`🔧 Other failures: ${otherFailures}`);
        }
      } else {
        console.log('✓ No test failures recorded!');
      }
    } else {
      console.log('\n\n📋 TEST FAILURES');
      console.log('─────────────────────\n');
      console.log('No failure data available.');
    }

    // Recent activity
    console.log('\n\n📝 RECENT ACTIVITY (Last 10 entries)');
    console.log('─────────────────────\n');

    const recentLines = logLines.slice(-10);
    recentLines.forEach(line => {
      // Colorize output based on log level
      if (line.includes('[ERROR]')) {
        console.log(`❌ ${line}`);
      } else if (line.includes('[WARNING]')) {
        console.log(`⚠️  ${line}`);
      } else if (line.includes('[SUCCESS]')) {
        console.log(`✅ ${line}`);
      } else {
        console.log(`ℹ️  ${line}`);
      }
    });

    console.log('\n=================================\n');
    console.log('💡 Tip: Run "npm run monitor:watch" to continuously monitor your tests\n');
  }

  extractTimestamp(logLine) {
    if (!logLine) return null;
    const match = logLine.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
    return match ? match[1] : null;
  }

  exportToJson(outputFile = 'monitor-report.json') {
    const report = {
      generated: new Date().toISOString(),
      log: null,
      failures: null
    };

    if (fs.existsSync(this.logFile)) {
      report.log = fs.readFileSync(this.logFile, 'utf8').split('\n').filter(l => l.trim());
    }

    if (fs.existsSync(this.failureLog)) {
      report.failures = JSON.parse(fs.readFileSync(this.failureLog, 'utf8'));
    }

    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Report exported to: ${outputFile}`);
  }
}

// Run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new ReportGenerator();

  if (process.argv.includes('--json')) {
    const outputFile = process.argv[process.argv.indexOf('--json') + 1] || 'monitor-report.json';
    generator.exportToJson(outputFile);
  } else {
    generator.generateReport();
  }
}

export default ReportGenerator;
