export const money = n => Number(n).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
export const today = () => { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const monthNow = () => today().slice(0,7);
export const uid = () => crypto.randomUUID();
export const escapeHTML = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const round = n => Math.round((n+Number.EPSILON)*100)/100;
export function amount(n,label='จำนวนเงิน') { const value=Number(n);if(!Number.isFinite(value)||value<0)throw Error(`${label}ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป`);return round(value); }
export function units(previous,current) { const p=amount(previous,'มิเตอร์ก่อนหน้า'),c=amount(current,'มิเตอร์ปัจจุบัน');if(c<p)throw Error('เลขมิเตอร์ปัจจุบันต้องไม่น้อยกว่าครั้งก่อน');return round(c-p); }
export function monthDate(month,day) {if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('รอบเดือนไม่ถูกต้อง');const [y,m]=month.split('-').map(Number);return `${month}-${String(Math.min(day,new Date(y,m,0).getDate())).padStart(2,'0')}`;}
export function billStatus(b) { if(b.cancelled)return 'cancelled';if(round(b.paid)>=b.total)return 'paid';if(b.dueDate<today())return 'overdue';return b.paid>0?'partial':'pending'; }
export function makeBill(state,room,month) {
  if(state.bills.some(b=>b.roomId===room.id&&b.month===month&&!b.cancelled))throw Error(`ห้อง ${room.number} มีบิลเดือนนี้แล้ว`);
  const tenant=state.tenants.find(t=>t.roomId===room.id&&t.active);
  if(!tenant)throw Error(`ห้อง ${room.number} ยังไม่มีผู้เช่าที่ใช้งาน`);
  const m=state.meters.find(m=>m.roomId===room.id&&m.month===month);
  if(!m)throw Error(`ห้อง ${room.number} ยังไม่บันทึกมิเตอร์เดือนนี้`);
  const s=state.settings,lines=[{label:'ค่าเช่าห้อง',qty:1,rate:room.rent},{label:'ค่าน้ำประปา',qty:s.waterMode==='flat'?1:units(m.waterPrev,m.waterNow),rate:s.waterRate},{label:'ค่าไฟฟ้า',qty:s.electricMode==='flat'?1:units(m.electricPrev,m.electricNow),rate:s.electricRate}];
  if(s.serviceRate)lines.push({label:'ค่าบริการส่วนกลาง',qty:1,rate:s.serviceRate});
  const repairs=state.repairs.filter(r=>r.roomId===room.id&&r.chargeTenant&&r.cost>0&&!state.bills.some(b=>!b.cancelled&&b.repairIds?.includes(r.id)));
  repairs.forEach(r=>lines.push({label:`ค่าซ่อม/ค่าเสียหาย: ${r.title}`,qty:1,rate:r.cost}));
  lines.forEach(l=>l.total=round(l.qty*l.rate));
  const serial=state.bills.filter(b=>b.month===month).length+1;
  return {id:uid(),number:`INV-${month.replace('-','')}-${String(serial).padStart(4,'0')}`,roomId:room.id,roomNumber:room.number,tenantName:tenant.name,tenantPhone:tenant.phone,month,issuedDate:monthDate(month,s.billDay),dueDate:monthDate(month,s.dueDay),lines,total:round(lines.reduce((sum,l)=>sum+l.total,0)),paid:0,payments:[],repairIds:repairs.map(r=>r.id),createdAt:new Date().toISOString()};
}
export function recordPayment(bill,value,method,date=today()) {if(bill.cancelled)throw Error('บิลถูกยกเลิกแล้ว');const payment=amount(value);if(payment<=0||payment>round(bill.total-bill.paid))throw Error('ยอดรับชำระต้องมากกว่า 0 และไม่เกินยอดคงเหลือ');bill.payments.push({id:uid(),amount:payment,method,date});bill.paid=round(bill.paid+payment);}
export function seed() {
  const month=monthNow(),names=['กมลชนก สุขใจ','ธนกร วัฒนกุล','พิมพ์ชนก ใจดี','ณัฐวุฒิ ศรีสุข','สุภาวดี แสงทอง','ปกรณ์ กิตติชัย','อริสา พรหมดี','ศุภชัย รุ่งเรือง','ชนิกานต์ สมบูรณ์','วิชญ์พล อารีย์','ปวีณา จันทร์งาม','ธีรภัทร วงศ์ดี'];
  const rooms=Array.from({length:20},(_,i)=>({id:`r${i+1}`,number:`${Math.floor(i/5)+1}0${i%5+1}`,building:'อาคาร A',floor:Math.floor(i/5)+1,type:i%3===0?'Deluxe':'Standard',rent:i%3===0?4500:3500,deposit:i%3===0?9000:7000,status:i<12?'occupied':i===15?'maintenance':i===17?'reserved':'vacant'}));
  const tenants=names.map((name,i)=>({id:`t${i+1}`,name,phone:`081234${String(1000+i)}`,email:'',roomId:rooms[i].id,active:true,moveIn:`${month}-01`,emergency:''}));
  const state={version:1,isDemo:true,settings:{name:'อยู่ดี เรสซิเดนซ์',address:'128 ซอยร่มเย็น แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230',phone:'02-123-4567',owner:'ผู้ให้เช่าตัวอย่าง',waterMode:'meter',electricMode:'meter',waterRate:18,electricRate:7,serviceRate:150,billDay:1,dueDay:5,bank:'ธนาคารตัวอย่าง · 000-0-00000-0'},rooms,tenants,meters:[],bills:[],repairs:[{id:'rep1',roomId:'r3',title:'เครื่องปรับอากาศมีน้ำหยด',category:'เครื่องปรับอากาศ',priority:'สูง',status:'pending',cost:650,chargeTenant:false,date:today(),description:'ตรวจสอบท่อน้ำทิ้งและทำความสะอาด',assignee:''},{id:'rep2',roomId:'r6',title:'เปลี่ยนลูกบิดประตู',category:'อุปกรณ์',priority:'ปกติ',status:'done',cost:350,chargeTenant:true,date:today(),description:'ลูกบิดประตูเสียหาย เปลี่ยนใหม่ 1 ชุด',assignee:'ช่างสมชาย'}],contracts:[],audit:[]};
  tenants.forEach((t,i)=>{state.meters.push({id:uid(),roomId:t.roomId,month,waterPrev:100+i*12,waterNow:108+i*12+i%4,electricPrev:1000+i*120,electricNow:1080+i*120+i*7});const b=makeBill(state,rooms[i],month);state.bills.push(b);if(i<8)recordPayment(b,b.total,i%2?'โอนเงิน':'เงินสด');else if(i===8)recordPayment(b,2000,'โอนเงิน');state.contracts.push({id:`c${i}`,number:`LEASE-${new Date().getFullYear()}-${String(i+1).padStart(3,'0')}`,tenantId:t.id,roomId:t.roomId,start:t.moveIn,end:`${new Date().getFullYear()+1}-${month.slice(5)}-01`,rent:rooms[i].rent,deposit:rooms[i].deposit,terms:'ชำระค่าเช่าตามกำหนด ดูแลทรัพย์สิน และปฏิบัติตามระเบียบหอพัก',signed:i<10,tenantName:t.name,tenantPhone:t.phone,roomNumber:rooms[i].number});});
  return state;
}
export function validateBackup(s) {
  if(s?.version!==1||!s.settings||typeof s.settings.name!=='string')throw Error('รูปแบบไฟล์สำรองไม่ถูกต้อง');
  for(const key of ['rooms','tenants','meters','bills','repairs','contracts','audit'])if(!Array.isArray(s[key]))throw Error(`ข้อมูล ${key} ไม่ถูกต้อง`);
  for(const r of s.rooms)if(!r.id||!r.number||!['occupied','vacant','maintenance','reserved','cleaning'].includes(r.status)||!Number.isFinite(r.rent)||r.rent<0)throw Error('ข้อมูลห้องไม่ถูกต้อง');
  for(const b of s.bills)if(!Array.isArray(b.lines)||!Array.isArray(b.payments)||!Number.isFinite(b.total)||!Number.isFinite(b.paid)||b.paid<0||b.total<b.paid)throw Error('ข้อมูลบิลไม่ถูกต้อง');
  for(const k of ['waterRate','electricRate','serviceRate'])amount(s.settings[k]);
  if(!Number.isInteger(s.settings.billDay)||!Number.isInteger(s.settings.dueDay)||s.settings.billDay<1||s.settings.dueDay>28||s.settings.dueDay<s.settings.billDay)throw Error('รอบบิลไม่ถูกต้อง');
  const text=(v)=>typeof v==='string'&&v.length<=10000;
  const date=v=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(v);
  const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
  const validId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
  const assert=(ok,label)=>{if(!ok)throw Error(`ข้อมูล ${label} ไม่ถูกต้อง`);};
  for(const key of ['rooms','tenants','meters','bills','repairs','contracts','audit']){assert(s[key].every(x=>x&&validId(x.id)),key);assert(new Set(s[key].map(x=>x.id)).size===s[key].length,key);}
  for(const k of ['name','address','phone','owner','bank'])assert(text(s.settings[k]),k);
  for(const k of ['waterMode','electricMode'])assert(['meter','flat'].includes(s.settings[k]),k);
  const roomExists=id=>s.rooms.some(r=>r.id===id);
  for(const r of s.rooms)assert(text(r.number)&&text(r.building)&&text(r.type)&&Number.isInteger(r.floor)&&r.floor>0&&positive(r.deposit),'ห้อง');
  for(const t of s.tenants)assert(text(t.name)&&text(t.phone)&&text(t.email)&&text(t.emergency)&&roomExists(t.roomId)&&typeof t.active==='boolean'&&date(t.moveIn),'ผู้เช่า');
  for(const m of s.meters){assert(roomExists(m.roomId)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(m.month),'มิเตอร์');for(const k of ['waterPrev','waterNow','electricPrev','electricNow'])assert(positive(m[k]),'มิเตอร์');assert(m.waterNow>=m.waterPrev&&m.electricNow>=m.electricPrev,'หน่วยมิเตอร์');}
  const documentNumbers=new Set();
  for(const b of s.bills){assert(roomExists(b.roomId)&&text(b.number)&&text(b.tenantName)&&text(b.roomNumber)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(b.month)&&date(b.issuedDate)&&date(b.dueDate),'บิล');assert(!documentNumbers.has(b.number),'เลขเอกสารซ้ำ');documentNumbers.add(b.number);for(const l of b.lines)assert(text(l.label)&&positive(l.qty)&&positive(l.rate)&&positive(l.total)&&round(l.qty*l.rate)===l.total,'รายการบิล');assert(round(b.lines.reduce((n,l)=>n+l.total,0))===b.total,'ยอดบิล');for(const p of b.payments)assert(positive(p.amount)&&text(p.method)&&date(p.date),'การรับชำระ');assert(round(b.payments.reduce((n,p)=>n+p.amount,0))===b.paid,'ยอดรับชำระ');assert(Array.isArray(b.repairIds)&&b.repairIds.every(validId),'ค่าเสียหาย');}
  for(const r of s.repairs)assert(roomExists(r.roomId)&&text(r.title)&&text(r.category)&&text(r.priority)&&text(r.description)&&text(r.assignee)&&date(r.date)&&positive(r.cost)&&typeof r.chargeTenant==='boolean'&&['pending','progress','done'].includes(r.status),'งานซ่อม');
  for(const c of s.contracts)assert(validId(c.tenantId)&&roomExists(c.roomId)&&text(c.number)&&text(c.tenantName)&&text(c.tenantPhone)&&text(c.roomNumber)&&text(c.terms)&&positive(c.rent)&&positive(c.deposit)&&date(c.start)&&date(c.end)&&typeof c.signed==='boolean','สัญญา');
  for(const a of s.audit)assert(text(a.action)&&text(a.detail)&&typeof a.at==='string'&&Number.isFinite(Date.parse(a.at)),'ประวัติ');
  return s;
}
