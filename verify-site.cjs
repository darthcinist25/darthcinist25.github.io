const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const javascript = ['logic.js', 'app.js', 'mobile.js', 'field.js', 'job-ui.js', 'sw.js'];
const stylesheets = ['style.css', 'mobile.css', 'job-ui.css'];
const files = ['index.html', ...javascript, ...stylesheets];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const short = hash => hash.slice(0, 16);

function argumentsForRun() {
  let directory = fs.existsSync(path.join(__dirname, 'dist')) ? path.join(__dirname, 'dist') : __dirname;
  let url = null;
  for (let i = 2; i < process.argv.length; i++) {
    const flag = process.argv[i];
    if ((flag === '--dir' || flag === '--url') && process.argv[i + 1]) {
      const value = process.argv[++i];
      if (flag === '--dir') directory = path.resolve(value);
      else url = new URL(value);
    } else throw new Error(`Unknown or incomplete argument: ${flag}`);
  }
  if (url && !['http:', 'https:'].includes(url.protocol)) throw new Error('--url must use HTTP or HTTPS.');
  if (url) {
    url.search = '';
    url.hash = '';
    if (/\/index\.html$/i.test(url.pathname)) url = new URL('./', url);
    else if (!url.pathname.endsWith('/')) url.pathname += '/';
  }
  return { directory, url };
}

function validateSyntax(name, bytes, errors) {
  const code = bytes.toString('utf8');
  if (name.endsWith('.js')) {
    try { new vm.Script(code, { filename: name }); }
    catch (error) { errors.push(`${name}: ${error.name}: ${error.message}`); }
    return;
  }
  if (name !== 'index.html') return;
  let number = 0;
  for (const match of code.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    number++;
    const attributes = match[1];
    if (/\bsrc\s*=/i.test(attributes)) continue;
    const type = /\btype\s*=\s*(["'])(.*?)\1/i.exec(attributes)?.[2]?.toLowerCase();
    if (type && !['text/javascript', 'application/javascript'].includes(type)) {
      if (type === 'module') errors.push(`${name} inline script ${number}: module scripts are not supported by this classic-script verifier.`);
      continue;
    }
    try { new vm.Script(match[2], { filename: `${name} inline script ${number}` }); }
    catch (error) { errors.push(`${name} inline script ${number}: ${error.name}: ${error.message}`); }
  }
}

function validMime(name, value) {
  const mime = value.split(';', 1)[0].trim().toLowerCase();
  if (name.endsWith('.js')) return ['text/javascript', 'application/javascript', 'application/ecmascript', 'text/ecmascript'].includes(mime);
  if (name.endsWith('.css')) return mime === 'text/css';
  return mime === 'text/html';
}

async function checkRemote(base, expected, attempt) {
  const checks = await Promise.all(files.map(async name => {
    const errors = [];
    const url = new URL(name, base);
    url.searchParams.set('verify', `${Date.now()}-${attempt}-${crypto.randomBytes(4).toString('hex')}`);
    try {
      const response = await fetch(url, {
        headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow'
      });
      if (response.status !== 200) errors.push(`${name}: HTTP ${response.status}, expected 200.`);
      const mime = response.headers.get('content-type') || '';
      if (!validMime(name, mime)) errors.push(`${name}: unexpected MIME ${JSON.stringify(mime)}.`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const actual = sha256(bytes), wanted = expected.get(name).hash;
      if (actual !== wanted) errors.push(`${name}: SHA-256 mismatch (expected ${short(wanted)}, received ${short(actual)}).`);
      validateSyntax(name, bytes, errors);
    } catch (error) { errors.push(`${name}: ${error.name}: ${error.message}`); }
    return errors;
  }));
  return checks.flat();
}

async function main() {
  const { directory, url } = argumentsForRun();
  const expected = new Map();
  const localErrors = [];
  for (const name of files) {
    try {
      const bytes = fs.readFileSync(path.join(directory, name));
      expected.set(name, { bytes, hash: sha256(bytes) });
      validateSyntax(name, bytes, localErrors);
    } catch (error) { localErrors.push(`${name}: ${error.message}`); }
  }
  if (localErrors.length) throw new Error(`Local checks failed:\n${localErrors.map(error => '- ' + error).join('\n')}`);
  console.log(`PASS local: ${files.length} assets read; 6 JavaScript files and inline index scripts parse.`);
  if (!url) return;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const errors = await checkRemote(url, expected, attempt);
    if (!errors.length) {
      console.log(`PASS live: ${files.length} assets return HTTP 200, correct MIME, matching SHA-256, and valid JavaScript (${url.href}).`);
      return;
    }
    console.error(`Live verification ${attempt}/6 failed:\n${errors.map(error => '- ' + error).join('\n')}`);
    if (attempt < 6) await new Promise(resolve => setTimeout(resolve, 3000));
  }
  throw new Error('Live deployment verification failed after 6 attempts.');
}

main().catch(error => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
