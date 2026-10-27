import {escapeHTML as e,money,round} from './core.js';
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
const xml=s=>String(s??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
export function contractParagraphs(c,s){return [s.name,s.address,`โทร. ${s.phone}`,'สัญญาเช่าห้องพัก',`เลขที่ ${c.number}`,`ทำสัญญาระหว่าง ${s.owner} (ผู้ให้เช่า) กับ ${c.tenantName} (ผู้เช่า) โทร. ${c.tenantPhone}`,`1. ผู้ให้เช่าตกลงให้เช่าห้องเลขที่ ${c.roomNumber} ณ ${s.name}`,`2. ระยะเวลาเช่าตั้งแต่ ${c.start} ถึง ${c.end}`,`3. ค่าเช่าเดือนละ ${money(c.rent)} บาท เงินประกัน ${money(c.deposit)} บาท`,`4. ${c.terms}`,'เงื่อนไขอื่นและข้อตกลงการคืนเงินประกัน: ให้ผู้ให้เช่าและผู้เช่าระบุและตรวจสอบก่อนลงนาม','เอกสารนี้เป็นแม่แบบสำหรับตรวจสอบและตกลงร่วมกันก่อนใช้งาน','ลงชื่อ ........................................ ผู้ให้เช่า',`(${s.owner})`,'ลงชื่อ ........................................ ผู้เช่า',`(${c.tenantName})`,'ลงชื่อ ........................................ พยาน'];}
export function contractHTML(c,s){const p=contractParagraphs(c,s);return `<div class="document-head"><h1>${e(p[0])}</h1><p>${e(p[1])}<br>${e(p[2])}</p></div><h2 style="text-align:center">สัญญาเช่าห้องพัก</h2>${p.slice(4,12).map(t=>`<p>${e(t)}</p>`).join('')}<div class="signatures"><p>ลงชื่อ ____________________ ผู้ให้เช่า<br>(${e(s.owner)})</p><p>ลงชื่อ ____________________ ผู้เช่า<br>(${e(c.tenantName)})</p></div><p style="text-align:center;margin-top:40px">ลงชื่อ ____________________ พยาน</p>`;}
export function billHTML(b,s,receipt=false){return `<div class="document-head"><h1>${e(s.name)}</h1><p>${e(s.address)}<br>โทร. ${e(s.phone)}</p></div><h2>${receipt?'หลักฐานรับชำระเงิน':'ใบแจ้งหนี้ / ค่าเช่าและค่าสาธารณูปโภค'}</h2><p>เลขที่ ${e(b.number)} · ประจำเดือน ${e(b.month)}<br>ผู้เช่า ${e(b.tenantName)} · ห้อง ${e(b.roomNumber)}<br>วันที่ออกบิล ${e(b.issuedDate)} · ครบกำหนด ${e(b.dueDate)}</p><table><thead><tr><th>รายการ</th><th>จำนวน</th><th>ราคา/หน่วย</th><th style="text-align:right">จำนวนเงิน</th></tr></thead><tbody>${b.lines.map(l=>`<tr><td>${e(l.label)}</td><td>${l.qty}</td><td>${money(l.rate)}</td><td style="text-align:right">${money(l.total)}</td></tr>`).join('')}</tbody></table><div class="document-total">ยอดรวม ${money(b.total)} บาท</div><p>รับชำระแล้ว ${money(b.paid)} บาท · คงเหลือ ${money(round(b.total-b.paid))} บาท</p>${receipt?`<h3>ประวัติการรับชำระ</h3>${b.payments.map(p=>`<p>${e(p.date)} · ${e(p.method)} · ${money(p.amount)} บาท</p>`).join('')}`:`<p>ช่องทางรับชำระ: ${e(s.bank)}</p>`}<p style="margin-top:45px">ผู้รับเงิน / ผู้ออกเอกสาร __________________________</p>`;}
export const DOCUMENT_FONT = 'TH SarabunPSK';
const fontFaces = [
  ['regular', 'Regular', 'embedRegular'],
  ['bold', 'Bold', 'embedBold'],
  ['italic', 'Italic', 'embedItalic'],
  ['boldItalic', 'BoldItalic', 'embedBoldItalic']
];
let fontFilesPromise;
export function loadDocumentFontFiles() {
  fontFilesPromise ??= Promise.all(fontFaces.map(async ([key, name]) => {
    const response = await fetch(new URL(`../assets/fonts/THSarabunPSK-${name}.ttf`, import.meta.url));
    if (!response.ok) throw Error('โหลดฟอนต์เอกสารไม่สำเร็จ กรุณาลองใหม่');
    return [key, new Uint8Array(await response.arrayBuffer())];
  })).then(Object.fromEntries).catch(error => { fontFilesPromise = undefined; throw error; });
  return fontFilesPromise;
}
export function printDocument(html, title) {
  const popup = window.open('', '_blank');
  if (!popup) throw Error('โปรดอนุญาตหน้าต่างป๊อปอัปเพื่อพิมพ์เอกสาร');
  const stylesheetURL = new URL('../assets/documents.css', import.meta.url).href;
  popup.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)}</title><link rel="stylesheet" href="${e(stylesheetURL)}"></head><body class="document-page"><div class="document-toolbar"><button id="print-button" disabled>พิมพ์ / บันทึกเป็น PDF</button><span role="status">กำลังเตรียมฟอนต์เอกสาร…</span></div><article class="document-paper">${html}</article></body></html>`);
  const doc = popup.document;
  const printButton = doc.getElementById('print-button');
  printButton.addEventListener('click', () => popup.print());
  doc.querySelector('link').addEventListener('load', async () => {
    try {
      const loaded = await Promise.all([
        doc.fonts.load(`16pt "${DOCUMENT_FONT}"`, 'สัญญาเช่า ใบแจ้งหนี้'),
        doc.fonts.load(`700 24pt "${DOCUMENT_FONT}"`, 'อยู่ดี')
      ]);
      if (loaded.some(faces => !faces.length)) throw Error('Font unavailable');
      await doc.fonts.ready;
      printButton.disabled = false;
      doc.querySelector('[role="status"]').textContent = 'TH Sarabun PSK · A4 · เลือกบันทึกเป็น PDF ในหน้าต่างพิมพ์';
    } catch {
      doc.querySelector('[role="status"]').textContent = 'โหลดฟอนต์ไม่สำเร็จ กรุณาปิดแล้วเปิดเอกสารใหม่';
    }
  });
  doc.querySelector('link').addEventListener('error', () => {
    doc.querySelector('[role="status"]').textContent = 'โหลดรูปแบบเอกสารไม่สำเร็จ กรุณาปิดแล้วเปิดใหม่';
  });
  doc.close();
  popup.focus();
}
function obfuscateFont(bytes, key) {
  const data = new Uint8Array(bytes);
  const mask = key.replace(/[{}-]/g, '').match(/../g).map(hex => parseInt(hex, 16)).reverse();
  for (let i = 0; i < Math.min(32, data.length); i++) data[i] ^= mask[i % 16];
  return data;
}

function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
export function makeDocx(paragraphs, fontFiles = {}){
  const enc=new TextEncoder();
  const files={
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map(p=>`<w:p><w:pPr><w:spacing w:after="200"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:eastAsia="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t xml:space="preserve">${xml(p)}</w:t></w:r></w:p>`).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="1020" w:bottom="1020" w:left="1020"/></w:sectPr></w:body></w:document>`
  };
  const fontLinks = [], embedded = [];
  for (const [key, name, tag] of fontFaces) {
    if (!fontFiles[key]) continue;
    const fontKey = `{${crypto.randomUUID().toUpperCase()}}`;
    const id = `font${embedded.length + 1}`;
    const filename = `THSarabunPSK-${name}.odttf`;
    files[`word/fonts/${filename}`] = obfuscateFont(fontFiles[key], fontKey);
    fontLinks.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/${filename}"/>`);
    embedded.push(`<w:${tag} r:id="${id}" w:fontKey="${fontKey}"/>`);
  }
  files['[Content_Types].xml'] = files['[Content_Types].xml'].replace('</Types>', '<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>');
  files['word/fontTable.xml'] = `<?xml version="1.0" encoding="UTF-8"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:font w:name="${DOCUMENT_FONT}"><w:altName w:val="TH Sarabun PSK"/><w:family w:val="roman"/><w:pitch w:val="variable"/>${embedded.join('')}</w:font></w:fonts>`;
  if (fontLinks.length) files['word/_rels/fontTable.xml.rels'] = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fontLinks.join('')}</Relationships>`;
  files['word/styles.xml'] = `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${DOCUMENT_FONT}" w:hAnsi="${DOCUMENT_FONT}" w:eastAsia="${DOCUMENT_FONT}" w:cs="${DOCUMENT_FONT}"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:lang w:val="th-TH" w:eastAsia="th-TH"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`;
  files['word/settings.xml'] = '<?xml version="1.0" encoding="UTF-8"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:embedTrueTypeFonts/></w:settings>';
  files['word/_rels/document.xml.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rFonts" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/><Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>';
  const parts=[],central=[];let offset=0,centralSize=0;
  for(const [name,value] of Object.entries(files)){const n=enc.encode(name),data=value instanceof Uint8Array?value:enc.encode(value),crc=crc32(data);const local=new Uint8Array(30+n.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);local.set(n,30);parts.push(local,data);const c=new Uint8Array(46+n.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);c.set(n,46);central.push(c);centralSize+=c.length;offset+=local.length+data.length;}
  const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
export function csv(rows){return new Blob(['\ufeff'+rows.map(r=>r.map(v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});}
