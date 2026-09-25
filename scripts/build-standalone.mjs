
import fs from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
const root=path.resolve(new URL('..', import.meta.url).pathname);
const tsc='/opt/nvm/versions/node/v22.16.0/bin/tsc';
execFileSync(tsc,['src/standalone.tsx','--jsx','react','--target','ES2018','--module','none','--outFile','dist/app.js','--skipLibCheck'],{cwd:root,stdio:'inherit'});
const react=fs.readFileSync('/opt/pyvenv/lib/python3.13/site-packages/nbclassic/static/components/react/umd/react.production.min.js','utf8');
const reactDOM=fs.readFileSync('/opt/pyvenv/lib/python3.13/site-packages/nbclassic/static/components/react-dom/umd/react-dom.production.min.js','utf8');
const app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FP&A Market Validation Dashboard</title><style>${css}</style></head><body><div id="root"></div><script>${react}</script><script>${reactDOM}</script><script>${app}</script></body></html>`;
fs.writeFileSync(path.join(root,'dist/standalone.html'),html);
console.log('Built dist/standalone.html');
