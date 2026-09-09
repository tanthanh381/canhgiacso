import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = readFileSync(new URL(`../app/${name}.ts`, import.meta.url), 'utf8');
  const exports = {};
  new Function('exports', 'require', ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports, path => load(path.replace('./', '')));
  modules.set(name, exports);
  return exports;
}
const {defaultCertificateDesign, normalizeCertificateDesign}=load('certificate-design');
const {defaultSiteContent, normalizeSiteContent}=load('data');
test('legacy certificates retain the original renderer and edited designs survive serialization',()=>{
 assert.equal(normalizeSiteContent(defaultSiteContent).certificateTemplate.design, undefined);
 const content=structuredClone(defaultSiteContent);
 content.certificateTemplate.design=defaultCertificateDesign();
 content.certificateTemplate.design.elements.title.x=200;
 content.certificateTemplate.design.elements.title.width=1200;
 content.certificateTemplate.design.elements.title.color='#008800';
 content.certificateTemplate.design.logo='data:image/png;base64,aGVsbG8=';
 assert.deepEqual(normalizeSiteContent(JSON.parse(JSON.stringify(content))),content);
});
test('reject invalid geometry, non-finite positions and unsafe logo URLs',()=>{
 for (const change of [d=>d.elements.title.x=-1,d=>d.elements.title.width=2000,d=>d.elements.title.y=NaN,d=>d.elements.title.fontSize=0,d=>d.elements.title.color='red',d=>d.logo='https://example.com/logo.svg',d=>d.logo='data:image/svg+xml;base64,aGVsbG8=',d=>d.logo='a'.repeat(400001)]) {
 const d=defaultCertificateDesign();change(d);assert.equal(normalizeCertificateDesign(d),null);
 }
 assert.ok(normalizeCertificateDesign(defaultCertificateDesign()));
});
