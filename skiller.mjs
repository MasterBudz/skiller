#!/usr/bin/env node
// skiller: find the best-rated GitHub skill for a topic, step through results, install one.
// Usage: node skiller.mjs search "kw1 kw2" | next | install
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const SKILLS = path.join(os.homedir(), '.claude', 'skills');
const STATE = path.join(SKILLS, 'skiller', 'state.json');
const gh = (args, opts = {}) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const load = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return null; } };
const save = s => fs.writeFileSync(STATE, JSON.stringify(s));
const die = m => { console.log(m); process.exit(0); };
const installed = () => new Set(fs.existsSync(SKILLS) ? fs.readdirSync(SKILLS).map(n => n.toLowerCase()) : []);

function raw(repo, p) {
  return gh(['api', `repos/${repo}/contents/${p.split('/').map(encodeURIComponent).join('/')}`, '-H', 'Accept: application/vnd.github.raw']);
}

function desc(c) {
  if (c.d !== undefined) return c.d;
  try {
    const t = raw(c.repo, c.path);
    let m = t.match(/^description:\s*["']?(.+?)["']?\s*$/m);
    if (m && /^[>|][-+]?$/.test(m[1])) m = t.match(/^description:.*\n((?:[ \t]+.*\n?)+)/m), m = m && [0, m[1].replace(/\s+/g, ' ').trim()];
    c.d = (m ? m[1] :t.replace(/^---[\s\S]*?---/, '').trim().split('\n').find(Boolean) || '').slice(0, 300);
  } catch { c.d = ''; }
  return c.d;
}

function show(s) {
  const c = s.list[s.i];
  if (!c) die(`Fine risultati (${s.list.length}). Prova /skiller search con altre parole.`);
  const d = desc(c).replace(/\s+\S*$/, c.d.length >= 300 ? '…' : '$&');
  const url = `https://github.com/${c.repo}/tree/HEAD/${path.posix.dirname(c.path)}`;
  console.log(`### ${s.i + 1} di ${s.list.length} · ${c.name}\n\n` +
    `- **Voto:** ⭐ ${String(c.stars).replace(/\B(?=(\d{3})+$)/g, '.')} stelle\n` +
    `- **Cosa fa:** ${d || '(nessuna descrizione)'}\n` +
    `- **Dove:** [${c.repo}](${url})`);
  save(s);
}

function search(q) {
  if (!q) die('Serve: search "parole chiave"');
  const have = installed();
  const hits = [];
  for (const query of [q, q.split(/\s+/).slice(0, 2).join(' ')]) {
    try { hits.push(...JSON.parse(gh(['search', 'code', query, '--filename', 'SKILL.md', '--limit', '60', '--json', 'repository,path']))); } catch {}
    if (hits.length >= 25) break;
  }
  if (!hits.length) die('Nessuna skill trovata.');
  const repos = [...new Set(hits.map(h => h.repository.nameWithOwner))].slice(0, 60);
  const stars = {};
  const gql = 'query{' + repos.map((r, i) => { const [o, n] = r.split('/'); return `r${i}:repository(owner:${JSON.stringify(o)},name:${JSON.stringify(n)}){stargazerCount}`; }).join(' ') + '}';
  try { const d = JSON.parse(gh(['api', 'graphql', '-f', `query=${gql}`])).data; repos.forEach((r, i) => stars[r] = d[`r${i}`]?.stargazerCount ?? 0); } catch {}
  const kws = q.toLowerCase().split(/\s+/);
  const best = new Map();
  for (const h of hits) {
    const repo = h.repository.nameWithOwner;
    const dir = path.posix.dirname(h.path);
    const name = dir === '.' ? repo.split('/')[1] : path.posix.basename(dir);
    if (have.has(name.toLowerCase()) || /(^|\/)(test|example|template)s?\//i.test(h.path)) continue;
    const st = stars[repo] ?? 0;
    const tok = s => s.toLowerCase().split(/[^a-z0-9]+/);
    const hit = s => kws.filter(k => tok(s).some(w => w.startsWith(k))).length;
    const rel = hit(name) * 2 + hit(h.path);
    const score = rel * 1e7 + st;
    const prev = best.get(name.toLowerCase());
    if (!prev || score > prev.score) best.set(name.toLowerCase(), { name, repo, path: h.path, stars: st, score });
  }
  const list = [...best.values()].sort((a, b) => b.score - a.score).slice(0, 25);
  if (!list.length) die('Nessuna skill nuova (le trovate sono già installate).');
  show({ q, i: 0, list });
}

function install() {
  const s = load(); const c = s?.list[s.i];
  if (!c) die('Prima fai /skiller search.');
  const dir = path.posix.dirname(c.path);
  const dest = path.join(SKILLS, c.name);
  if (fs.existsSync(dest)) die(`Già presente: ${dest}`);
  const tree = JSON.parse(gh(['api', `repos/${c.repo}/git/trees/HEAD?recursive=1`])).tree
    .filter(t => t.type === 'blob' && (dir === '.' ? !t.path.includes('/') || /^(scripts|references|assets)\//.test(t.path) : t.path.startsWith(dir + '/')));
  if (tree.length > 150) die(`Troppi file (${tree.length}), installazione annullata.`);
  const risky = [];
  for (const f of tree) {
    const rel = dir === '.' ? f.path : f.path.slice(dir.length + 1);
    const out = path.join(dest, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const buf = execFileSync('gh', ['api', `repos/${c.repo}/contents/${f.path.split('/').map(encodeURIComponent).join('/')}`, '-H', 'Accept: application/vnd.github.raw'], { maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
    fs.writeFileSync(out, buf);
    const t = buf.toString('utf8');
    if (/curl[^\n|]*\|\s*(ba|z)?sh|iwr[^\n|]*\|\s*iex|Invoke-Expression|rm\s+-rf\s+[~/]|base64\s+-d|eval\(atob/i.test(t)) risky.push(rel);
  }
  console.log(`Installata: ${c.name} (${tree.length} file) → ${dest}${risky.length ? `\n⚠ comandi rischiosi in: ${risky.join(', ')}` : ''}`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'search') search(rest.join(' ').trim());
else if (cmd === 'next') { const s = load(); if (!s) die('Prima fai /skiller search.'); s.i++; show(s); }
else if (cmd === 'install') install();
else die('Uso: search "parole" | next | install');
