import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url);
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
if(process.platform!=='win32')throw new Error('Build this installer on Windows.');
process.env.ELECTRON_CACHE??=path.join(root,'.tools/electron-cache');
process.env.ELECTRON_BUILDER_CACHE??=path.join(root,'.tools/electron-builder-cache');
process.env.CSC_IDENTITY_AUTO_DISCOVERY??='false';
// Bootstrap npm is optional; normal developer installations use their own npm.
if(await readFile(path.join(root,'.tools/npm/bin/npm.cmd')).then(()=>true,()=>false))process.env.PATH=path.join(root,'.tools/npm/bin')+path.delimiter+process.env.PATH;
async function run(file,args){await new Promise((resolve,reject)=>{const child=spawn(file,args,{cwd:root,stdio:'inherit',windowsHide:true,env:process.env});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`${path.basename(file)} exited ${code}`)));});}
if(!process.argv.includes('--packaged'))await run(process.execPath,[require.resolve('electron-builder/cli.js'),'--win','--x64','--dir','--publish','never']);
const appDir=path.join(root,'release/win-unpacked');await readFile(path.join(appDir,'resources/app.asar'));
const {getMakeNsisPath}=require('app-builder-lib/out/toolsets/windows.js');
const makensis=await getMakeNsisPath(pkg.build?.toolsets?.nsis);Object.assign(process.env,makensis.env||{});
const files=[],dirs=[];
async function walk(dir,rel=''){for(const entry of await readdir(dir,{withFileTypes:true})){const name=path.join(rel,entry.name);if(entry.isDirectory()){dirs.push(name);await walk(path.join(dir,entry.name),name);}else if(entry.isFile())files.push(name);else throw new Error('Unexpected non-file in packaged app.');}}
await walk(appDir);
const quote=s=>s.replaceAll('$','$$').replaceAll('"','$\\"');
const manifest=[...files.map(f=>`Delete "$INSTDIR\\${quote(f)}"`),...dirs.sort((a,b)=>b.split(path.sep).length-a.split(path.sep).length).map(d=>`RMDir "$INSTDIR\\${quote(d)}"`)].join('\n');
await mkdir(path.join(root,'release'),{recursive:true});const manifestPath=path.join(root,'release/uninstall-files.nsh');await writeFile(manifestPath,manifest+'\n');
await run(makensis.path,['-V2',`-DAPP_VERSION=${pkg.version}`,`-DAPP_DIRECTORY=${appDir}`,`-DRELEASE_DIRECTORY=${path.join(root,'release')}`,`-DUNINSTALL_MANIFEST=${manifestPath}`,path.join(root,'desktop/installer.nsi')]);
console.log(`Installer: ${path.join(root,`release/Cardroom-Lab-Setup-${pkg.version}-x64.exe`)}`);
