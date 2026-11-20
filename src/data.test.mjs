import test from "node:test";
import assert from "node:assert/strict";
import {seed,bookingTotal,amountPaid,balance,servicePrice,teamConflict,validateBooking,expensesFor,bookingProfit,overlaps} from "./data.js";
test("seed has complete linked records",()=>{const db=seed();assert.ok(db.customers.length);assert.ok(db.services.length);assert.ok(db.bookings.every(b=>db.customers.some(c=>c.id===b.customerId)&&db.services.some(s=>s.id===b.serviceId)));});
test("totals and payments reconcile",()=>{const db=seed();const b=db.bookings[0];assert.equal(bookingTotal(b),3999);assert.equal(amountPaid(db,b.id),500);assert.equal(balance(db,b),3499);assert.equal(expensesFor(db,b.id),750);assert.equal(bookingProfit(db,b),3249);});
test("package pricing configurable",()=>{const db=seed();assert.equal(servicePrice(db.services[1],"Platinum"),4999);});
test("overlapping same-team appointments rejected",()=>{const db=seed();assert.equal(overlaps("09:00",180,"11:00",60),true);assert.equal(overlaps("09:00",180,"12:00",60),false);assert.equal(teamConflict(db,"T1",db.bookings[0].date,"10:00",60),true);assert.equal(teamConflict(db,"T1",db.bookings[0].date,"12:00",60),false);});
test("booking validation checks discount, address, assignments",()=>{const db=seed();const b={...db.bookings[2],address:"",discount:100000,teamId:"T1",time:"09:30"};assert.equal(validateBooking(db,b).length,3);});
