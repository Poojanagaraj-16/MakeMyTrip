import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

type ReportStatus = 'passed' | 'failed' | 'skipped' | 'flaky' | 'blocked';

interface Attempt {
  status: string;
  duration: number;
  retry: number;
  error: string;
  attachments: string[];
}

interface ReportTest {
  id: string;
  requirementId: string;
  title: string;
  status: ReportStatus;
  duration: number;
  retryCount: number;
  error: string;
  stack: string;
  attachments: Array<{ name: string; href: string }>;
  attempts: Attempt[];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function isEnvironmentBlocker(error: string): boolean {
  return /ERR_HTTP2_PROTOCOL_ERROR|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_TIMED_OUT|net::ERR_|captcha|human verification|browserType\.launch|executable.*(?:not found|doesn't exist)|HTTP 403|HTTP 429/i
    .test(error);
}

function statusFor(test: TestCase, attempts: Attempt[], interrupted: boolean): ReportStatus {
  const finalAttempt = attempts.at(-1);
  if (!finalAttempt) return interrupted ? 'blocked' : 'skipped';
  if (finalAttempt.status === 'skipped') return 'skipped';
  if (finalAttempt.status !== 'passed' && isEnvironmentBlocker(finalAttempt.error)) return 'blocked';
  if (finalAttempt.status === 'passed'
    && (test.outcome() === 'flaky' || attempts.some((attempt) => attempt.status !== 'passed'))) {
    return 'flaky';
  }
  return finalAttempt.status === 'passed' ? 'passed' : 'failed';
}

function artifactLink(attachmentPath: string): string | null {
  const root = resolve(process.cwd());
  const absolutePath = isAbsolute(attachmentPath) ? attachmentPath : resolve(root, attachmentPath);
  const pathFromRoot = relative(root, absolutePath);
  if (pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === '..' || !existsSync(absolutePath)) {
    return null;
  }
  const pathFromReports = relative(resolve(root, 'reports'), absolutePath);
  return pathFromReports.split(sep).map(encodeURIComponent).join('/');
}

function htmlFor(report: Record<string, unknown>): string {
  const serialized = JSON.stringify(report)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>MakeMyTrip Bus Automation - Execution Report</title>
<style>
:root{font:15px/1.5 system-ui,"Segoe UI",sans-serif;color:#182230;background:#f3f6fa}
*{box-sizing:border-box}body{margin:0}main{max-width:1200px;margin:auto;padding:28px 20px 50px}
header{background:#123b69;color:white;border-radius:14px;padding:24px}h1{margin:0 0 8px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:18px 0}
.card,.panel{background:white;border:1px solid #dce3eb;border-radius:10px;padding:15px}
.card strong{display:block;font-size:25px}.muted{color:#58677a}.controls{display:flex;gap:10px;align-items:center;margin:18px 0}
input,select{font:inherit;padding:9px;border:1px solid #aab7c5;border-radius:7px}input{flex:1;min-width:220px}
.panel{margin-top:18px;overflow:auto}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:9px;border-bottom:1px solid #dce3eb;vertical-align:top}
.badge{padding:2px 8px;border-radius:20px;font-weight:650;text-transform:capitalize}.passed{color:#126238;background:#e4f5eb}
.failed{color:#a32323;background:#fde8e8}.skipped{color:#5c6572;background:#edf0f4}.flaky{color:#885400;background:#fff1d5}
.blocked{color:#754500;background:#ffebcc}.error{max-width:340px;overflow-wrap:anywhere;white-space:pre-wrap}pre{white-space:pre-wrap;overflow-wrap:anywhere}
a{color:#1459a6}.empty{padding:16px;color:#58677a}
@media(max-width:650px){main{padding:12px}table{font-size:13px}.controls{align-items:stretch;flex-wrap:wrap}}
</style></head><body><main>
<header><h1>MakeMyTrip Bus Automation</h1><div>Browser: <strong id="browser"></strong> · Run status: <strong id="runStatus"></strong></div>
<div>Started: <span id="started"></span> · Ended: <span id="ended"></span> · Duration: <span id="duration"></span></div></header>
<section class="cards" id="summary" aria-label="Execution summary"></section>
<div class="controls"><label for="search">Search tests</label><input id="search" type="search" placeholder="Test ID, requirement, title, or error">
<label for="filter">Status</label><select id="filter"><option value="all">All statuses</option><option>passed</option><option>failed</option>
<option>skipped</option><option>flaky</option><option>blocked</option></select></div>
<section class="panel"><h2>Test details</h2><div id="results"></div></section>
<p class="muted">Pass percentage = stable passes / (stable passes + failed + flaky tests). Skipped and blocked tests are excluded.</p>
</main><script>
const report=${serialized};
const safe=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const [id,value] of [['browser',report.browser],['runStatus',report.status],['started',report.startTime||'Not started'],
['ended',report.endTime||'Not completed'],['duration',report.durationMs+' ms']])document.getElementById(id).textContent=value;
const labels=[['total','Total'],['passed','Passed'],['failed','Failed'],['skipped','Skipped'],['flaky','Flaky'],['blocked','Blocked'],['passPercentage','Pass percentage']];
document.getElementById('summary').innerHTML=labels.map(([key,label])=>'<div class="card"><strong>'+safe(report.summary[key])+'</strong><span>'+safe(label)+'</span></div>').join('');
const results=document.getElementById('results');
function render(){const query=document.getElementById('search').value.toLowerCase(),filter=document.getElementById('filter').value;
const tests=report.tests.filter(t=>(filter==='all'||t.status===filter)&&JSON.stringify(t).toLowerCase().includes(query));
results.innerHTML=tests.length?'<table><thead><tr><th>Test ID</th><th>Requirement</th><th>Test title</th><th>Status</th><th>Duration</th><th>Retries</th><th>Failure / stack</th><th>Artifacts</th></tr></thead><tbody>'+
tests.map(t=>'<tr><td>'+safe(t.id)+'</td><td>'+safe(t.requirementId)+'</td><td>'+safe(t.title)+'</td><td><span class="badge '+safe(t.status)+'">'+safe(t.status)+'</span></td><td>'+safe(t.duration)+' ms</td><td>'+safe(t.retryCount)+'</td><td class="error">'+
(t.error?'<details><summary>'+safe(t.error)+'</summary><pre>'+safe(t.stack)+'</pre></details>':'—')+'</td><td>'+t.attachments.map(a=>'<a href="'+safe(a.href)+'">'+safe(a.name)+'</a>').join('<br>')+'</td></tr>').join('')+
'</tbody></table>':'<div class="empty">No test results match the selected filters.</div>'}
document.getElementById('search').addEventListener('input',render);document.getElementById('filter').addEventListener('change',render);render();
</script></body></html>`;
}

export default class CustomReporter implements Reporter {
  private readonly tests = new Map<string, TestCase>();
  private readonly attempts = new Map<string, Attempt[]>();
  private startTime: Date | null = null;
  private interrupted = false;

  onBegin(config: FullConfig, suite: import('@playwright/test/reporter').Suite): void {
    this.startTime = new Date();
    for (const test of suite.allTests()) {
      this.tests.set(test.id, test);
      this.attempts.set(test.id, []);
    }
    mkdirSync(resolve(process.cwd(), 'reports', 'artifacts'), { recursive: true });
    if (!config.projects.some((project) => project.name === 'Microsoft Edge')) {
      throw new Error('Custom reporter expected the Microsoft Edge project.');
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.tests.set(test.id, test);
    const history = this.attempts.get(test.id) ?? [];
    history.push({
      status: result.status,
      duration: result.duration,
      retry: result.retry,
      error: result.error ? [result.error.message, result.error.stack].filter(Boolean).join('\n') : '',
      attachments: result.attachments.flatMap((attachment) => attachment.path ? [attachment.path] : []),
    });
    this.attempts.set(test.id, history);
  }

  onError(): void {
    this.interrupted = true;
  }

  async onEnd(result: FullResult): Promise<void> {
    if (process.argv.includes('--list')) {
      return;
    }
    const endTime = new Date();
    this.interrupted ||= result.status === 'interrupted';
    const testRecords: ReportTest[] = [...this.tests.values()].map((test) => {
      const attempts = this.attempts.get(test.id) ?? [];
      const last = attempts.at(-1);
      const error = last?.error ?? '';
      const split = error.indexOf('\n');
      const files = [...new Set(attempts.flatMap((attempt) => attempt.attachments))]
        .map((path) => {
          const href = artifactLink(path);
          return href ? { name: path.split(/[\\/]/).at(-1) ?? 'artifact', href } : null;
        })
        .filter((attachment): attachment is { name: string; href: string } => attachment !== null);
      return {
        id: test.title.match(/TC_BUS_\d{3}/)?.[0] ?? test.id,
        requirementId: test.title.match(/REQ_BUS_\d{2}/)?.[0] ?? 'Not mapped',
        title: test.title.replace(/TC_BUS_\d{3}\s*(?:\[[^\]]+\])?\s*/, ''),
        status: statusFor(test, attempts, this.interrupted),
        duration: attempts.reduce((sum, attempt) => sum + attempt.duration, 0),
        retryCount: Math.max(0, attempts.length - 1),
        error: last && last.status !== 'passed' ? split < 0 ? error : error.slice(0, split) : '',
        stack: last && last.status !== 'passed' && split >= 0 ? error.slice(split + 1) : '',
        attachments: files,
        attempts,
      };
    });

    const summary = {
      total: testRecords.length,
      passed: testRecords.filter((test) => test.status === 'passed').length,
      failed: testRecords.filter((test) => test.status === 'failed').length,
      skipped: testRecords.filter((test) => test.status === 'skipped').length,
      flaky: testRecords.filter((test) => test.status === 'flaky').length,
      blocked: testRecords.filter((test) => test.status === 'blocked').length,
    };
    const denominator = summary.passed + summary.failed + summary.flaky;
    const report = {
      project: 'MakeMyTrip Bus Automation',
      browser: 'Microsoft Edge',
      startTime: this.startTime?.toISOString() ?? null,
      endTime: endTime.toISOString(),
      durationMs: this.startTime ? endTime.getTime() - this.startTime.getTime() : 0,
      status: this.interrupted ? 'interrupted' : result.status,
      summary: {
        ...summary,
        passPercentage: `${denominator === 0 ? '0.0' : (summary.passed / denominator * 100).toFixed(1)}%`,
      },
      tests: testRecords,
    };

    const reportsDirectory = resolve(process.cwd(), 'reports');
    mkdirSync(reportsDirectory, { recursive: true });
    const jsonPath = resolve(reportsDirectory, 'execution-results.json');
    const htmlPath = resolve(reportsDirectory, 'custom-report.html');
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    writeFileSync(htmlPath, htmlFor(report), 'utf8');
    console.log(`Custom execution report: ${htmlPath}`);
  }
}
