// Used on hosts that have Node but no npm. Kept in the workspace, never installed globally.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const version='12.2.2',root=new URL('../.tools/npm/',import.meta.url);
await mkdir(root,{recursive:true});
const metadata=await fetch(`https://registry.npmjs.org/npm/${version}`).then(r=>{if(!r.ok)throw new Error('npm metadata download failed');return r.json();});
const bytes=Buffer.from(await fetch(metadata.dist.tarball).then(r=>{if(!r.ok)throw new Error('npm download failed');return r.arrayBuffer();}));
if('sha512-'+createHash('sha512').update(bytes).digest('base64')!==metadata.dist.integrity)throw new Error('npm integrity check failed');
const archive=new URL('npm.tgz',root);await writeFile(archive,bytes);
execFileSync('tar',['-xzf',fileURLToPath(archive),'-C',fileURLToPath(root),'--strip-components=1'],{stdio:'inherit'});
console.log(`Workspace npm ${version} ready.`);
