// A feature branch in its own folder, ready to run:
//   node scripts/worktree.mjs <name> [base=dev]     creates ../<project>-<name> on branch <name>
//   node scripts/worktree.mjs --remove <name>       removes the folder (the branch stays)
// Copies what git doesn't carry over (the downloaded OpenSCAD in public/openscad/, and any small
// file this clone keeps out of git through .git/info/exclude), then runs npm install.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const root = git('rev-parse', '--show-toplevel');
const args = process.argv.slice(2);
const remove = args[0] === '--remove';
const [name, base = 'dev'] = remove ? args.slice(1) : args;
if (!name) {
  console.error('usage: node scripts/worktree.mjs <name> [base]   |   --remove <name>');
  process.exit(1);
}
const dir = path.resolve(root, '..', `${path.basename(root)}-${name}`);

if (remove) {
  git('worktree', 'remove', '--force', dir);
  console.log(`removed ${dir} (branch ${name} kept)`);
  process.exit(0);
}

git('worktree', 'add', dir, '-b', name, base);
fs.cpSync(path.join(root, 'public', 'openscad'), path.join(dir, 'public', 'openscad'), { recursive: true });
const excludes = path.join(root, '.git', 'info', 'exclude');
const local = git('ls-files', '-o', '-i', `--exclude-from=${excludes}`)
  .split('\n')
  .filter((f) => f && !/^(node_modules|dist|prints|test\/out|\.claude\/worktrees)\//.test(f));
let copied = 0;
for (const f of local) {
  const src = path.join(root, f);
  if (!fs.existsSync(src) || fs.statSync(src).size > 1e6) continue;
  fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
  fs.copyFileSync(src, path.join(dir, f));
  copied++;
}
execFileSync('npm', ['install'], { cwd: dir, stdio: 'inherit', shell: true });
console.log(
  `\n${dir} on branch ${name} (from ${base}); ${copied} local files copied.\nRun it: cd "${dir}" && npx vite --port 5182 --strictPort`,
);
