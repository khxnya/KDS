const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'..','xlsx.js'),'utf8');
const sandbox={TextEncoder,Uint8Array,Uint32Array,DataView,Date,Intl,Blob,URL,setTimeout,console};sandbox.globalThis=sandbox;vm.runInNewContext(source,sandbox);
const bytes=sandbox.KDSXLSX.buildWorkbook({projects:[{id:'p_1',name:'Website refresh',budget:12500,created_at:'2026-11-11T10:30:00Z',brief:'=HYPERLINK("bad")'}],leads:[]},{generatedAt:new Date('2026-11-11T12:00:00Z'),timezone:'Africa/Johannesburg'});
assert.equal(bytes[0],0x50);assert.equal(bytes[1],0x4b);
function entries(data){const out={};let at=0;while(at<data.length){const sig=data[at]|data[at+1]<<8|data[at+2]<<16|data[at+3]<<24;if(sig!==0x04034b50)break;const view=new DataView(data.buffer,data.byteOffset+at),size=view.getUint32(18,true),nl=view.getUint16(26,true),xl=view.getUint16(28,true),start=at+30+nl+xl,name=new TextDecoder().decode(data.slice(at+30,at+30+nl));out[name]=new TextDecoder().decode(data.slice(start,start+size));at=start+size;}return out;}
const files=entries(bytes);for(const name of ['[Content_Types].xml','xl/workbook.xml','xl/styles.xml','xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml','docProps/core.xml'])assert.ok(files[name],name);
assert.match(files['xl/workbook.xml'],/name="Projects"/);assert.match(files['xl/workbook.xml'],/name="Leads"/);
assert.match(files['xl/styles.xml'],/FF14263D/);assert.match(files['xl/styles.xml'],/FF2F6FC2/);assert.match(files['xl/styles.xml'],/FFE7B950|E7B950/);
assert.match(files['xl/worksheets/sheet1.xml'],/state="frozen"/);assert.match(files['xl/worksheets/sheet1.xml'],/<autoFilter/);assert.match(files['xl/worksheets/sheet1.xml'],/&apos;=HYPERLINK/);
assert.match(files['xl/worksheets/sheet2.xml'],/No records available/);assert.ok(!files['xl/worksheets/sheet1.xml'].includes('<f>'));
assert.equal(sandbox.KDSXLSX.formulaSafe(' +SUM(A1)'),"' +SUM(A1)");assert.equal(sandbox.KDSXLSX.formulaSafe('normal'),'normal');
console.log('PASS branded XLSX structure, worksheets, metadata, empty state and formula-injection protection');
