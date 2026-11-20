// Browser-first demo data and shared business rules. No external dependencies.
export const STATUSES = ["New","Confirmed","Assigned","In Progress","Quality Check","Completed","Closed"];
export const PAYMENT_METHODS = ["Cash","UPI","Bank Transfer","Card","Online"];
export const uid = (prefix="ID") => prefix+"-"+(globalThis.crypto?.randomUUID?.() || (Date.now().toString(36)+Math.random().toString(36).slice(2,8))).slice(0,12).toUpperCase();
export const money = (value) => "₹"+Number(value||0).toLocaleString("en-IN",{maximumFractionDigits:2});
export const today = () => new Date().toLocaleDateString("en-CA");
export const amountPaid = (db,bookingId) => db.payments.filter(p=>p.bookingId===bookingId && p.type!=="Refund").reduce((s,p)=>s+Number(p.amount||0),0)-db.payments.filter(p=>p.bookingId===bookingId && p.type==="Refund").reduce((s,p)=>s+Number(p.amount||0),0);
export const bookingTotal = (booking) => Math.max(0,Number(booking.price||0)-Number(booking.discount||0));
export const balance = (db,booking) => bookingTotal(booking)-amountPaid(db,booking.id);
export const expensesFor = (db,bookingId) => db.expenses.filter(e=>e.bookingId===bookingId).reduce((s,e)=>s+Number(e.amount||0),0);
export const bookingProfit = (db,booking) => bookingTotal(booking)-expensesFor(db,booking.id);
export const servicePrice = (service,pkg) => Number(service?.prices?.[pkg]??service?.prices?.Classic??0);
export function overlaps(aStart,aDuration,bStart,bDuration){
  const minutes=(s)=>{const [h,m]=String(s||"0:0").split(":").map(Number);return h*60+(m||0)};
  return minutes(aStart)<minutes(bStart)+Number(bDuration||0) && minutes(bStart)<minutes(aStart)+Number(aDuration||0);
}
export function teamConflict(db,teamId,date,start,duration,exceptId){
  if(!teamId||!date||!start)return false;
  return db.bookings.some(b=>b.id!==exceptId&&b.teamId===teamId&&b.date===date&&!["Cancelled","Closed"].includes(b.status)&&overlaps(start,duration,b.time,b.duration));
}
export function validateBooking(db,b){
  const errors=[];
  if(!db.customers.some(c=>c.id===b.customerId))errors.push("Select a customer");
  if(!db.services.some(s=>s.id===b.serviceId))errors.push("Select a service");
  if(!b.date||!b.time)errors.push("Select date and time");
  if(!String(b.address||"").trim())errors.push("Enter the service address");
  if(Number(b.price)<0||Number(b.discount)<0||Number(b.discount)>Number(b.price))errors.push("Invalid pricing/discount");
  if(b.teamId&&teamConflict(db,b.teamId,b.date,b.time,b.duration,b.id))errors.push("Team has an overlapping booking");
  return errors;
}
export function seed(){
 const date=today();
 const services=[
 {id:"S1",category:"Home Cleaning",name:"1 BHK Cleaning",workers:2,duration:150,prices:{Classic:1999,Luxury:2799,Platinum:3499},checklist:["Living room","Kitchen","Bathroom","Bedroom","Floors"]},
 {id:"S2",category:"Home Cleaning",name:"2 BHK Cleaning",workers:4,duration:180,prices:{Classic:2999,Luxury:3999,Platinum:4999},checklist:["Living room","Bedroom 1","Bedroom 2","Kitchen","Bathroom","Floor cleaning","Final inspection"]},
 {id:"S3",category:"Home Cleaning",name:"3 BHK Cleaning",workers:4,duration:240,prices:{Classic:3999,Luxury:4999,Platinum:6499},checklist:["Living room","Bedrooms","Kitchen","Bathrooms","Windows","Floors"]},
 {id:"S4",category:"AC Services",name:"AC General Service",workers:1,duration:75,prices:{Classic:599,Luxury:799,Platinum:999},checklist:["Inspect AC","Clean filters","Clean coil","Test cooling","Customer demo"]},
 {id:"S5",category:"Sofa & Carpet",name:"Sofa Cleaning",workers:2,duration:120,prices:{Classic:1499,Luxury:1899,Platinum:2299},checklist:["Inspect fabric","Vacuum","Shampoo","Extract","Drying instructions"]},
 {id:"S6",category:"Bathroom Cleaning",name:"Bathroom Deep Cleaning",workers:2,duration:90,prices:{Classic:799,Luxury:999,Platinum:1299},checklist:["Tiles","Fixtures","Toilet","Floor","Quality check"]},
 {id:"S7",category:"Commercial Cleaning",name:"Office Deep Cleaning",workers:6,duration:360,prices:{Classic:9999,Luxury:14999,Platinum:19999},checklist:["Workstations","Floor","Washrooms","Glass","Supervisor review"]}
 ];
 const customers=[
 {id:"C1",name:"Ananya Reddy",phone:"9876543210",email:"ananya@example.com",type:"Residential",address:"Magunta Layout, Nellore",source:"WhatsApp"},
 {id:"C2",name:"Rahul Kumar",phone:"9876543211",email:"rahul@example.com",type:"Residential",address:"Balaji Nagar, Nellore",source:"Phone"},
 {id:"C3",name:"ABC Offices",phone:"9876543212",email:"manager@example.com",type:"Commercial",address:"Mini Bypass Road, Nellore",source:"Website"}
 ];
 const employees=[
 {id:"E1",name:"Suresh",phone:"9876500001",role:"Supervisor",skill:"Home Cleaning",teamId:"T1",rate:650,active:true},
 {id:"E2",name:"Lakshmi",phone:"9876500002",role:"Cleaner",skill:"Home Cleaning",teamId:"T1",rate:500,active:true},
 {id:"E3",name:"Kiran",phone:"9876500003",role:"Cleaner",skill:"Home Cleaning",teamId:"T1",rate:500,active:true},
 {id:"E4",name:"Priya",phone:"9876500004",role:"Cleaner",skill:"Home Cleaning",teamId:"T1",rate:500,active:true},
 {id:"E5",name:"Ramesh",phone:"9876500005",role:"AC Technician",skill:"AC Services",teamId:"T2",rate:800,active:true},
 {id:"E6",name:"Deepak",phone:"9876500006",role:"Technician Assistant",skill:"AC Services",teamId:"T2",rate:450,active:true}
 ];
 const teams=[{id:"T1",name:"Cleaning Team A",skill:"Home Cleaning"},{id:"T2",name:"AC Service Team",skill:"AC Services"}];
 const bookings=[
 {id:"B1001",customerId:"C1",serviceId:"S2",package:"Luxury",price:3999,discount:0,date,time:"09:00",duration:180,teamId:"T1",address:"Magunta Layout, Nellore",status:"Assigned",source:"WhatsApp",instructions:"Call before arrival",checklist:[],quality:false,customerApproved:false,photos:[],createdAt:new Date().toISOString()},
 {id:"B1002",customerId:"C2",serviceId:"S4",package:"Classic",price:599,discount:0,date,time:"14:00",duration:75,teamId:"T2",address:"Balaji Nagar, Nellore",status:"Confirmed",source:"Phone",instructions:"",checklist:[],quality:false,customerApproved:false,photos:[],createdAt:new Date().toISOString()},
 {id:"B1003",customerId:"C3",serviceId:"S7",package:"Classic",price:9999,discount:500,date,time:"15:30",duration:360,teamId:"",address:"Mini Bypass Road, Nellore",status:"New",source:"Website",instructions:"Site inspection required",checklist:[],quality:false,customerApproved:false,photos:[],createdAt:new Date().toISOString()}
 ];
 return {version:1,settings:{company:"JB Facilities Management Service",city:"Nellore",tax:0,role:"Admin",notify:true},customers,services,employees,teams,bookings,enquiries:[{id:"Q1",customer:"Meena",phone:"9876543213",service:"2 BHK Cleaning",source:"Phone",date,followUp:date,status:"New",notes:"Interested in weekend service"}],payments:[{id:"P1",bookingId:"B1001",amount:500,method:"UPI",type:"Payment",date}],expenses:[{id:"X1",bookingId:"B1001",amount:750,category:"Labour",note:"Advance labour allocation",date}],complaints:[],feedback:[],activity:[{id:"A1",at:new Date().toISOString(),text:"Demo workspace initialized"}]};
}
export const clone = (x) => JSON.parse(JSON.stringify(x));
