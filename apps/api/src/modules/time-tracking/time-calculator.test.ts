import { describe, expect, it } from "vitest";
import type { TimePunch } from "@fluxrh/contracts";
import { calculateBalance, calculateWorkedMinutes } from "./time-calculator.js";

const makePunch=(id:string,recordedAt:string):TimePunch=>({id,employeeId:"emp",employeeName:"Teste",type:"clock_in",recordedAt,source:"qr_code",locationName:"Matriz",deviceId:"device"});
describe("time calculator",()=>{
 it("calculates worked minutes excluding the break",()=>{const punches=[makePunch("1","2026-08-25T08:00:00-03:00"),makePunch("2","2026-08-25T12:00:00-03:00"),makePunch("3","2026-08-25T13:00:00-03:00"),makePunch("4","2026-08-25T17:48:00-03:00")];expect(calculateWorkedMinutes(punches)).toBe(528)});
 it("separates weekday and Sunday overtime",()=>{expect(calculateBalance(600,528,false)).toMatchObject({balanceMinutes:72,overtime50Minutes:72,overtime100Minutes:0});expect(calculateBalance(600,0,true)).toMatchObject({overtime50Minutes:0,overtime100Minutes:600})});
});
