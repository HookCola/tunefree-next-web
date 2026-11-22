import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync, lstatSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [round, phase] = process.argv.slice(2);
if (!round || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,80}$/.test(round) || !['before', 'after'].includes(phase)) {
  console.error('Usage: node scripts/snapshot-handoff.mjs <unique-round-id> <before|after>');
  process.exit(1);
}
function git(args, accepted = [0], encoding = 'utf8') {
  const result = spawnSync('git', ['--no-pager', ...args], {
    cwd: repo, encoding, maxBuffer: 64 * 1024 * 1024, windowsHide: true,
  });
  if (result.error) throw result.error;
  if (!accepted.includes(result.status)) throw new Error(`git ${args[0]} failed (${result.status}): ${result.stderr}`);
  return result.stdout;
}
const output = resolve(repo, 'docs/handoffs', round);
const metadataFile = resolve(output, `${phase}.json`);
const patchFile = resolve(output, `${phase}.patch`);
const committedFile = resolve(output, 'committed.patch');
if (existsSync(metadataFile) || existsSync(patchFile) || (phase === 'after' && existsSync(committedFile))) {
  throw new Error('Snapshot exists. Choose a new round ID.');
}
const beforeFile = resolve(output, 'before.json');
if (phase === 'after' && !existsSync(beforeFile)) throw new Error('Capture before first.');

const artifact = path => path.replaceAll('\\', '/').startsWith('docs/handoffs/');
const sensitive = path => /(^|\/)(?:\.env(?:\..*)?|credentials(?:\..*)?|.*\.(?:pem|key|p12|pfx))$/i.test(path.replaceAll('\\', '/'));
const scope = ['.', ':(exclude)docs/handoffs/**', ':(exclude)**/.env', ':(exclude)**/.env.*',
  ':(exclude)**/credentials', ':(exclude)**/credentials.*', ':(exclude)**/*.pem',
  ':(exclude)**/*.key', ':(exclude)**/*.p12', ':(exclude)**/*.pfx'];
const otherFiles = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
const skippedSensitivePaths = otherFiles.filter(path => !artifact(path) && sensitive(path));
const untracked = otherFiles.filter(path => !artifact(path) && !sensitive(path));
const head = git(['rev-parse', 'HEAD']).trim();
const diffOptions = ['--no-ext-diff', '--no-textconv', '--binary', '--full-index'];
const patches = [git(['diff', ...diffOptions, head, '--', ...scope], [0], null)];
for (const path of untracked) {
  if (!lstatSync(resolve(repo, path)).isFile()) throw new Error(`Cannot capture non-regular file: ${path}`);
  patches.push(git(['diff', '--no-index', ...diffOptions, '--', '/dev/null', path], [0, 1], null));
}
const beforeHead = phase === 'after' ? JSON.parse(readFileSync(beforeFile, 'utf8')).head : head;
if (!/^[a-f0-9]{40,64}$/.test(beforeHead)) throw new Error('Invalid HEAD in before manifest.');
const committed = beforeHead === head ? null : git(['diff', ...diffOptions, beforeHead, head, '--', ...scope], [0], null);
const changed = git(['diff', '--name-only', '-z', head, '--', ...scope]).split('\0').filter(Boolean);
const manifest = {
  schema: 1, round, phase, capturedAt: new Date().toISOString(),
  kind: 'working-tree-diff-relative-to-recorded-HEAD',
  head, branch: git(['branch', '--show-current']).trim(),
  status: git(['status', '--short', '--branch', '--', ...scope]).trim(),
  explanation: 'Includes staged/unstaged tracked changes and non-ignored untracked files. Compare before/after with the activity log to identify this round. Artifacts are excluded.',
  skippedSensitivePaths,
  ...(committed && { committed: { from: beforeHead, to: head, patch: 'committed.patch' } }),
  files: [...new Set([...changed, ...untracked])].sort().map(path => {
    const file = resolve(repo, path);
    if (!existsSync(file)) return { path, deleted: true };
    if (!lstatSync(file).isFile()) return { path, regularFile: false };
    const data = readFileSync(file);
    return { path, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
  }),
};
mkdirSync(output, { recursive: true });
writeFileSync(patchFile, Buffer.concat(patches), { flag: 'wx' });
if (committed) writeFileSync(committedFile, committed, { flag: 'wx' });
writeFileSync(metadataFile, JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
console.log(JSON.stringify({ round, phase, files: manifest.files.length, patch: patchFile, manifest: metadataFile }));
