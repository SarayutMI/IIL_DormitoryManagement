import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const KEY='yoodii-dormitory-v1';
const data=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function submit(page){await page.locator('#dialog-form button[type=submit]').click();}
async function visit(page,path){await page.goto('/#'+path);await expect(page.locator('.page-heading h1')).toBeVisible();}

test('all screens render without errors, mobile layout is contained',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of ['dashboard','rooms','tenants','meters','bills','contracts','repairs','reports','settings','history'])await visit(page,path);
  await visit(page,'dashboard');await page.screenshot({path:'test-results/dashboard-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await visit(page,'dashboard');
  await expect.poll(()=>page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await page.screenshot({path:'test-results/dashboard-mobile.png',fullPage:true});
  await expect(page.getByRole('button',{name:'เปิดเมนู'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'เปิดเมนู'}).click();await expect(page.locator('.sidebar')).toHaveClass(/open/);
  await page.locator('.sidebar a[href="#rooms"]').click();await expect(page.locator('h1')).toHaveText('จัดการห้องพัก');
  expect(errors).toEqual([]);
});

test('empty database to room, tenant, contract, invoice, partial and full payment',async({page})=>{
  await visit(page,'settings');await page.locator('[data-action=clear-data]').click();await page.locator('[name=confirm]').fill('เริ่มใหม่');await submit(page);
  await visit(page,'rooms');await page.locator('[data-action=add-room]').click();await page.locator('[name=number]').fill('501');await submit(page);
  await visit(page,'tenants');await page.locator('[data-action=add-tenant]').click();await page.locator('[name=name]').fill('ผู้เช่าทดสอบ');await page.locator('[name=phone]').fill('0812345678');await submit(page);
  await expect(page.locator('tbody')).toContainText('ผู้เช่าทดสอบ');
  await visit(page,'contracts');await page.locator('[data-action=add-contract]').click();await submit(page);await expect(page.locator('.contract-card')).toHaveCount(1);
  const word=page.waitForEvent('download');await page.locator('[data-action=word]').click();const download=await word;expect(download.suggestedFilename()).toMatch(/\.docx$/);
  await visit(page,'meters');await page.locator('input[name$="waterPrev"]').fill('100');await page.locator('input[name$="waterNow"]').fill('110');await page.locator('input[name$="electricPrev"]').fill('1000');await page.locator('input[name$="electricNow"]').fill('1100');await page.locator('[data-action=save-meters]').click();
  await visit(page,'bills');await page.locator('[data-action=generate]').click();await submit(page);expect((await data(page)).bills[0].total).toBe(4530);
  await page.locator('[data-action=bill-detail]').click();await page.locator('[data-action=payment]').click();await page.locator('[name=amount]').fill('1000');await submit(page);expect((await data(page)).bills[0].paid).toBe(1000);
  await page.locator('[data-action=bill-detail]').click();await page.locator('[data-action=payment]').click();await submit(page);await page.reload();await expect(page.locator('tbody')).toContainText('ชำระแล้ว');
  expect((await data(page)).bills[0].payments).toHaveLength(2);
  await visit(page,'meters');await expect(page.locator('input[name$="waterNow"]')).toBeDisabled();
});

test('cancel then regenerate invoices with unique document numbers and correct damage',async({page})=>{
  await visit(page,'bills');const s=await data(page);const unpaid=s.bills.filter(b=>b.paid===0).slice(0,2);
  for(const b of unpaid){await page.locator(`[data-action=bill-detail][data-id="${b.id}"]`).click();await page.locator('[data-action=cancel-bill]').click();await page.locator('[name=reason]').fill('แก้ไขค่ามิเตอร์ทดสอบ');await submit(page);}
  await page.locator('[data-action=generate]').click();await submit(page);
  const latest=await data(page);expect(latest.bills).toHaveLength(14);expect(new Set(latest.bills.map(b=>b.number)).size).toBe(14);
  await page.locator('[data-action=generate]').click();await submit(page);await expect(page.locator('.form-error')).toContainText('ไม่มีห้องพร้อมออกบิล');
});

test('repair charge attaches to next invoice and bill PDF opens document',async({page})=>{
  await visit(page,'repairs');await page.locator('[data-action=add-repair]').click();await page.locator('[name=title]').fill('กระจกหน้าต่างแตก');await page.locator('textarea[name=description]').fill('เปลี่ยนกระจกใหม่ 1 บาน');await page.locator('[name=cost]').fill('800');await page.locator('[name=chargeTenant]').check();await submit(page);
  const s=await data(page),month=s.bills[0].month;const d=new Date(month+'-01T12:00:00');d.setMonth(d.getMonth()+1);const next=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  await visit(page,'meters');await page.locator('#month-picker').fill(next);await page.locator('#month-picker').dispatchEvent('change');
  for(const row of await page.locator('tr[data-meter-room]').all()){for(const k of ['water','electric']){const prev=await row.locator(`[name$="_${k}Prev"]`).inputValue();await row.locator(`[name$="_${k}Now"]`).fill(String(Number(prev)+10));}}
  await page.locator('[data-action=save-meters]').click();await page.locator('.sidebar a[href="#bills"]').click();await page.locator('[data-action=generate]').click();await submit(page);
  const latest=await data(page),charged=latest.bills.find(b=>b.month===next&&b.roomId==='r1');expect(charged.lines.some(l=>l.label.includes('กระจกหน้าต่างแตก')&&l.total===800)).toBeTruthy();
  await page.locator(`[data-action=bill-detail][data-id="${charged.id}"]`).click();const popupPromise=page.waitForEvent('popup');await page.locator('[data-action=bill-pdf]').click();const popup=await popupPromise;await expect(popup.locator('h2')).toContainText('ใบแจ้งหนี้');await expect(popup.locator('body')).toContainText('กระจกหน้าต่างแตก');await popup.close();
});

test('settings snapshot, CSV export and JSON restore',async({page})=>{
  await visit(page,'settings');const initial=await data(page);await page.locator('[name=waterRate]').fill('25');await page.locator('#settings-form button[type=submit]').click();let s=await data(page);expect(s.settings.waterRate).toBe(25);expect(s.bills[0].total).toBe(initial.bills[0].total);
  const downloaded=page.waitForEvent('download');await page.locator('[data-action=backup]').click();expect((await downloaded).suggestedFilename()).toMatch(/\.json$/);
  await page.locator('#import-file').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(initial))});await page.locator('[name=confirm]').fill('กู้คืน');await submit(page);s=await data(page);expect(s.settings.waterRate).toBe(18);
  await visit(page,'bills');const csv=page.waitForEvent('download');await page.locator('[data-action=export-bills]').click();expect((await csv).suggestedFilename()).toMatch(/\.csv$/);
});

test('contracts, bills and receipts render TH Sarabun PSK, print A4 PDF and embed Word fonts',async({page})=>{
  await visit(page,'contracts');
  await page.locator('[data-action=contract-detail]').first().click();
  await expect(page.locator('.preview-paper')).toHaveCSS('font-family','"TH SarabunPSK", serif');
  await expect(page.locator('.preview-paper h2')).toHaveCSS('font-family','"TH SarabunPSK", serif');
  const wordPromise=page.waitForEvent('download');await page.locator('#modal [data-action=word]').click();
  const word=await wordPromise;await word.saveAs('test-results/contract-sarabun.docx');
  expect((await readFile('test-results/contract-sarabun.docx')).toString()).toContain('word/fonts/THSarabunPSK-Regular.odttf');
  const contractPromise=page.waitForEvent('popup');await page.locator('#modal [data-action=contract-pdf]').click();
  const contract=await contractPromise;await expect(contract.locator('#print-button')).toBeEnabled();
  await expect(contract.locator('.document-paper')).toHaveCSS('font-family','"TH SarabunPSK", serif');
  const cdp=await contract.context().newCDPSession(contract);
  await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const {root}=await cdp.send('DOM.getDocument');
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.document-paper h2'});
  const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
  expect(fonts.some(f=>f.isCustomFont&&f.familyName.includes('Sarabun'))).toBeTruthy();
  await contract.screenshot({path:'test-results/contract-print.png',fullPage:true});
  const pdf=await contract.pdf({path:'test-results/contract-sarabun.pdf',format:'A4',preferCSSPageSize:true});
  expect(pdf.subarray(0,4).toString()).toBe('%PDF');await contract.close();
  await page.locator('#modal [data-action=close]').click();await visit(page,'bills');
  await page.locator('[data-action=bill-detail]').last().click();
  await expect(page.locator('.preview-paper td').first()).toHaveCSS('font-family','"TH SarabunPSK", serif');
  const billPromise=page.waitForEvent('popup');await page.locator('[data-action=bill-pdf]').click();
  const bill=await billPromise;await expect(bill.locator('#print-button')).toBeEnabled();
  await bill.pdf({path:'test-results/bill-sarabun.pdf',format:'A4',preferCSSPageSize:true});await bill.close();
  const receiptPromise=page.waitForEvent('popup');await page.locator('[data-action=receipt]').click();
  const receipt=await receiptPromise;await expect(receipt.locator('#print-button')).toBeEnabled();
  await expect(receipt.locator('h2')).toContainText('หลักฐานรับชำระ');
  await receipt.pdf({path:'test-results/receipt-sarabun.pdf',format:'A4',preferCSSPageSize:true});await receipt.close();
});
