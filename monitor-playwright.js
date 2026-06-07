import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
const warnings = [];
const netErrors = [];
let crash = false;
let whiteAt = null;

page.on('console', msg => {
  const text = msg.text();
  const type = msg.type();
  if (type === 'error') { errors.push(text); console.log('[ERR] ' + text); }
  else if (type === 'warning') { warnings.push(text); console.log('[WARN] ' + text); }
  else if (type === 'log') { console.log('[LOG] ' + text); }
});

page.on('crash', () => { crash = true; console.log('💥 CRASH'); });

page.on('requestfailed', req => {
  netErrors.push(req.url());
  console.log('[NET ERR] ' + req.url() + ' - ' + req.failure()?.errorText);
});

page.on('pageerror', err => {
  console.log('[PAGE ERR] ' + err.message);
  errors.push(err.message);
});

process.on('unhandledRejection', (err) => {
  console.log('[UNHANDLED] ' + String(err));
});

try {
  console.log('🚀 Loading...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  console.log('✅ Loaded. Monitoring 35s...\n');

  for (let i = 1; i <= 35; i++) {
    await page.waitForTimeout(1000);

    const state = await page.evaluate(() => {
      const root = document.getElementById('root');
      const body = document.body.innerHTML.substring(0, 80);
      return {
        rootHtml: root ? root.innerHTML.substring(0, 60) : 'NO_ROOT',
        kids: root ? root.childElementCount : -1,
        bodyLen: document.body.innerHTML.length,
      };
    });

    const icon = state.kids === 0 ? '⚪ WHITE' : '🟢';
    if (state.kids === 0 && !whiteAt) whiteAt = i;
    if (state.kids === 0) icon + ' 💥';

    console.log(`[${i.toString().padStart(2)}s] ${icon} | kids:${state.kids} | body:${state.bodyLen} | html:"${state.rootHtml.replace(/\n/g,' ')}"`);
  }

  console.log('\n═══════════════ RESULTS ═══════════════');
  console.log(`JS Errors:  ${errors.length}`);
  errors.forEach(e => console.log(`  ❌ ${e.substring(0, 200)}`));
  console.log(`Warnings:   ${warnings.length}`);
  warnings.slice(0, 5).forEach(w => console.log(`  ⚠️  ${w.substring(0, 150)}`));
  console.log(`Net Errors: ${netErrors.length}`);
  netErrors.slice(0, 5).forEach(n => console.log(`  🌐 ${n}`));
  console.log(`Crash:      ${crash ? '💥 YES' : '✅ No'}`);
  console.log(`White at:   ${whiteAt ? whiteAt + 's' : '❌ Never'}`);

} catch (err) {
  console.log('💥 NAV ERROR: ' + err.message);
}

await browser.close();