import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {seed,units,makeBill,recordPayment,monthNow,billStatus,validateBackup,round,monthDate} from '../src/core.js';
import {makeDocx,contractParagraphs,csv} from '../src/documents.js';

function fresh(){const s=seed();s.bills=[];return s;}
test('utility units and currency reject invalid data',()=>{assert.equal(units(100,109.5),9.5);assert.throws(()=>units(100,99));assert.throws(()=>units(0,Infinity));assert.throws(()=>units(-1,2));assert.equal(round(1.005),1.01);});
test('monthly bill calculates rent, units, service and tenant damage once',()=>{const s=fresh(),r=s.rooms[5],b=makeBill(s,r,monthNow());assert.equal(b.lines[0].total,r.rent);assert.equal(b.lines[1].total,9*18);assert.equal(b.lines[2].total,115*7);assert.ok(b.repairIds.includes('rep2'));assert.equal(b.total,r.rent+162+805+150+350);s.bills.push(b);assert.throws(()=>makeBill(s,r,monthNow()),/มีบิล/);});
test('bill snapshot survives rate, room and tenant changes',()=>{const s=fresh(),b=makeBill(s,s.rooms[0],monthNow()),total=b.total;s.settings.waterRate=999;s.rooms[0].rent=1;s.tenants[0].name='Changed';assert.equal(b.total,total);assert.equal(b.lines[0].rate,4500);assert.notEqual(b.tenantName,'Changed');});
test('flat utilities ignore meter consumption when calculating charges',()=>{const s=fresh();s.settings.waterMode='flat';s.settings.electricMode='flat';s.settings.waterRate=200;s.settings.electricRate=500;const b=makeBill(s,s.rooms[0],monthNow());assert.equal(b.lines[1].total,200);assert.equal(b.lines[2].total,500);});
test('missing tenant and monthly meter cannot be billed',()=>{const s=fresh();assert.throws(()=>makeBill(s,s.rooms[18],monthNow()),/ผู้เช่า/);s.meters=[];assert.throws(()=>makeBill(s,s.rooms[0],monthNow()),/มิเตอร์/);});
test('partial payment, full payment, overpayment and cancelled bill',()=>{const s=fresh(),b=makeBill(s,s.rooms[0],monthNow());assert.throws(()=>recordPayment(b,0,'เงินสด'));assert.throws(()=>recordPayment(b,b.total+1,'เงินสด'));recordPayment(b,100,'เงินสด');assert.equal(b.paid,100);assert.equal(b.payments.length,1);recordPayment(b,round(b.total-100),'โอนเงิน');assert.equal(billStatus(b),'paid');assert.equal(b.payments.length,2);b.cancelled=true;assert.throws(()=>recordPayment(b,1,'เงินสด'),/ยกเลิก/);});
test('cancelled invoices release damage charge and preserve invoice numbering',()=>{const s=fresh(),r=s.rooms[5],first=makeBill(s,r,monthNow());s.bills.push(first);first.cancelled=true;const replacement=makeBill(s,r,monthNow());assert.notEqual(first.number,replacement.number);assert.ok(replacement.repairIds.includes('rep2'));});
test('batch billing produces unique invoice numbers',()=>{const s=fresh();s.rooms.slice(0,12).forEach(r=>s.bills.push(makeBill(s,r,monthNow())));assert.equal(new Set(s.bills.map(b=>b.number)).size,12);assert.equal(s.bills.filter(b=>b.repairIds.includes('rep2')).length,1);});
test('backup schema rejects broken and invalid numeric data',()=>{assert.equal(validateBackup(seed()).version,1);assert.throws(()=>validateBackup({version:1}));const s=seed();s.bills[0].paid=-1;assert.throws(()=>validateBackup(s));});
test('month dates handle February and reject malformed periods',()=>{assert.equal(monthDate('2027-02',31),'2027-02-28');assert.equal(monthDate('2028-02',31),'2028-02-29');assert.throws(()=>monthDate('2026-13',1));});
test('DOCX is an actual ZIP containing Word XML and Thai text',async()=>{const s=seed(),paragraphs=contractParagraphs(s.contracts[0],s.settings),blob=makeDocx(paragraphs),buffer=new Uint8Array(await blob.arrayBuffer());assert.equal(new DataView(buffer.buffer).getUint32(0,true),0x04034b50);const text=new TextDecoder().decode(buffer);assert.ok(text.includes('word/document.xml'));assert.ok(text.includes('สัญญาเช่าห้องพัก'));assert.ok(text.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'));});
test('CSV preserves Thai and neutralizes spreadsheet formula injection',async()=>{const text=await csv([['ห้อง','=1+1','"quoted"']]).text();assert.ok(text.includes('ห้อง'));assert.ok(text.includes("'=1+1"));assert.ok(text.includes('""quoted""'));});

test('Word sets Thai and Latin text to TH Sarabun PSK 16pt and embeds all four real font files',async()=>{
  const fontFiles={};
  for(const [key,name] of [['regular','Regular'],['bold','Bold'],['italic','Italic'],['boldItalic','BoldItalic']])fontFiles[key]=new Uint8Array(await readFile(new URL(`../assets/fonts/THSarabunPSK-${name}.ttf`,import.meta.url)));
  const bytes=new Uint8Array(await makeDocx(['สัญญาเช่าห้องพัก'],fontFiles).arrayBuffer());
  const view=new DataView(bytes.buffer),files=new Map(),decoder=new TextDecoder();
  let offset=0;
  while(view.getUint32(offset,true)===0x04034b50){
    const size=view.getUint32(offset+18,true),nameSize=view.getUint16(offset+26,true),extraSize=view.getUint16(offset+28,true);
    const name=decoder.decode(bytes.slice(offset+30,offset+30+nameSize)),start=offset+30+nameSize+extraSize;
    files.set(name,bytes.slice(start,start+size));offset=start+size;
  }
  const xml=decoder.decode(files.get('word/document.xml'));
  for(const scope of ['ascii','hAnsi','eastAsia','cs'])assert.ok(xml.includes(`w:${scope}="TH SarabunPSK"`));
  assert.ok(xml.includes('<w:sz w:val="32"/>'));
  const table=decoder.decode(files.get('word/fontTable.xml'));
  for(const [key,name,tag] of [['regular','Regular','embedRegular'],['bold','Bold','embedBold'],['italic','Italic','embedItalic'],['boldItalic','BoldItalic','embedBoldItalic']]){
    const embedded=files.get(`word/fonts/THSarabunPSK-${name}.odttf`);
    assert.equal(embedded.length,fontFiles[key].length);
    const guid=table.match(new RegExp(`<w:${tag}[^>]+w:fontKey="([^"]+)"`))[1];
    const mask=guid.replace(/[{}-]/g,'').match(/../g).reverse().map(b=>parseInt(b,16));
    const restored=new Uint8Array(embedded);
    for(let i=0;i<32;i++)restored[i]^=mask[i%16];
    assert.deepEqual(restored,fontFiles[key]);
    assert.deepEqual(fontFiles[key].slice(0,4),new Uint8Array([0,1,0,0]));
  }
});
