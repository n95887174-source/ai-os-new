const d = JSON.parse(require('fs').readFileSync('test-results.json', 'utf8'));
console.log(
    'Test files: %d/%d passed, %d failed',
    d.numPassedTestSuites,
    d.numTotalTestSuites,
    d.numFailedTestSuites,
);
console.log('Tests: %d/%d passed, %d failed', d.numPassedTests, d.numTotalTests, d.numFailedTests);
console.log('---');
const failSummary = {};
d.testResults.forEach((r) => {
    if (r.status !== 'passed') {
        const shortName = r.name.replace(/^.*src[/\\]/, 'src/');
        const msg = r.message ? r.message.substring(0, 120).replace(/\n/g, ' ') : '';
        const key = msg.includes('debateWorkspace')
            ? 'debateWorkspace missing from mock'
            : msg.includes('buildRequestBody')
              ? 'buildRequestBody missing'
              : msg.includes('ServiceNotRegistered')
                ? 'ServiceNotRegistered'
                : msg.includes('Cannot find module')
                  ? 'Cannot find module'
                  : msg.includes('not a function')
                    ? 'Not a function'
                    : msg.includes('is not')
                      ? 'is not'
                      : msg.includes('toBeDefined')
                        ? 'toBeDefined'
                        : msg.includes('toBeInTheDocument')
                          ? 'toBeInTheDocument'
                          : msg.includes('act(')
                            ? 'act() warning'
                            : 'other';
        if (!failSummary[key]) failSummary[key] = [];
        failSummary[key].push(shortName);
    }
});
Object.entries(failSummary)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([k, v]) => {
        console.log('\n%s (%d files):', k, v.length);
        v.forEach((f) => console.log('  -', f));
    });
