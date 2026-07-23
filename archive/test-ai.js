const HealthAnalyzer = require('./ai/health-analyzer');
const fs = require('fs');

const logs = JSON.parse(fs.readFileSync('./data/health-logs.json', 'utf8'));
const analyzer = new HealthAnalyzer(logs);

const score = analyzer.calculateScore();
const trend = analyzer.getTrend();

console.log('--- Health Analyzer Test ---');
console.log(`Current Score: ${score}`);
console.log(`Trend: ${trend}`);

if (score > 0 && score <= 100) {
    console.log('SUCCESS: Score is within valid range.');
} else {
    console.log('FAILURE: Invalid score calculated.');
    process.exit(1);
}
