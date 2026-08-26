import type { EmployeeTimeSummary, TimeException, TimeOverview, TimePunch } from "@fluxrh/contracts";
import { calculateBalance, calculateWorkedMinutes } from "./time-calculator.js";

const baseDate="2026-08-25";const iso=(date:string,time:string)=>`${date}T${time}:00.000-03:00`;
const punch=(id:string,employeeId:string,employeeName:string,type:TimePunch["type"],date:string,time:string,source:TimePunch["source"]="qr_code"):TimePunch=>({id,employeeId,employeeName,type,recordedAt:iso(date,time),source,locationName:"Matriz São Paulo",deviceId:"device-demo-01",latitude:-23.5505,longitude:-46.6333});
const schedules=[{id:"sch_5x2",name:"Administrativo 5×2",pattern:"5x2" as const,startTime:"08:00",endTime:"17:48",breakMinutes:60,weeklyHours:44,nightShift:false,employeesCount:72,color:"#155eef"},{id:"sch_12x36",name:"Operacional 12×36",pattern:"12x36" as const,startTime:"07:00",endTime:"19:00",breakMinutes:60,weeklyHours:42,nightShift:false,employeesCount:41,color:"#7a50c8"},{id:"sch_6x1",name:"Tarde 6×1",pattern:"6x1" as const,startTime:"13:40",endTime:"22:00",breakMinutes:60,weeklyHours:44,nightShift:true,employeesCount:35,color:"#17a673"}];
const rawPunches:TimePunch[]=[
 punch("p1","emp_carlos","Carlos Mendes","clock_in",baseDate,"07:01"),punch("p2","emp_carlos","Carlos Mendes","break_start",baseDate,"12:02"),punch("p3","emp_carlos","Carlos Mendes","break_end",baseDate,"13:00"),punch("p4","emp_carlos","Carlos Mendes","clock_out",baseDate,"19:03"),
 punch("p5","emp_beatriz","Beatriz Lima","clock_in",baseDate,"08:14"),punch("p6","emp_beatriz","Beatriz Lima","break_start",baseDate,"12:05"),punch("p7","emp_beatriz","Beatriz Lima","break_end",baseDate,"13:04"),
 punch("p8","emp_marina","Marina Souza","clock_in",baseDate,"07:58"),punch("p9","emp_marina","Marina Souza","break_start",baseDate,"12:01"),punch("p10","emp_marina","Marina Souza","break_end",baseDate,"13:00"),punch("p11","emp_marina","Marina Souza","clock_out",baseDate,"17:51")
];
const exceptions:TimeException[]=[
 {id:"tex_1",employeeId:"emp_beatriz",employeeName:"Beatriz Lima",date:baseDate,type:"missing_punch",title:"Marcação de saída ausente",description:"Não há registro de saída para a jornada de hoje.",severity:"high",status:"open",createdAt:iso(baseDate,"18:10")},
 {id:"tex_2",employeeId:"emp_beatriz",employeeName:"Beatriz Lima",date:baseDate,type:"late_arrival",title:"Atraso de 14 minutos",description:"Entrada registrada após a tolerância configurada.",severity:"medium",status:"open",minutes:14,createdAt:iso(baseDate,"08:14")},
 {id:"tex_3",employeeId:"emp_carlos",employeeName:"Carlos Mendes",date:"2026-08-24",type:"short_break",title:"Intervalo inferior ao previsto",description:"Intervalo realizado com 42 minutos.",severity:"medium",status:"in_review",minutes:18,createdAt:iso("2026-08-24","19:05")}
];

function makeDay(employeeId:string,employeeName:string,date:string,expectedMinutes:number,punchTimes:string[],status:"regular"|"exception"="regular"){
 const types:TimePunch["type"][]=["clock_in","break_start","break_end","clock_out"];const punches=punchTimes.map((time,index)=>punch(`${employeeId}_${date}_${index}`,employeeId,employeeName,types[index],date,time));const workedMinutes=calculateWorkedMinutes(punches);const balance=calculateBalance(workedMinutes,expectedMinutes,new Date(`${date}T12:00:00`).getDay()===0);return{date,scheduledStart:"08:00",scheduledEnd:"17:48",punches,workedMinutes,expectedMinutes,...balance,nightMinutes:0,status};
}
const daysCarlos=[makeDay("emp_carlos","Carlos Mendes","2026-08-21",660,["07:00","12:00","13:00","19:02"]),makeDay("emp_carlos","Carlos Mendes","2026-08-23",0,["07:00","12:00","13:00","19:00"]),makeDay("emp_carlos","Carlos Mendes",baseDate,660,["07:01","12:02","13:00","19:03"])];
const daysMarina=[makeDay("emp_marina","Marina Souza","2026-08-21",528,["07:59","12:02","13:01","17:49"]),makeDay("emp_marina","Marina Souza","2026-08-24",528,["08:01","12:00","13:00","17:51"]),makeDay("emp_marina","Marina Souza",baseDate,528,["07:58","12:01","13:00","17:51"])];
const daysBeatriz=[makeDay("emp_beatriz","Beatriz Lima","2026-08-21",528,["08:00","12:00","13:00","17:48"]),makeDay("emp_beatriz","Beatriz Lima","2026-08-24",528,["08:04","12:10","13:09","17:50"]),makeDay("emp_beatriz","Beatriz Lima",baseDate,528,["08:14","12:05","13:04"],"exception")];
const sum=(days:ReturnType<typeof makeDay>[])=>({workedMinutes:days.reduce((s,d)=>s+d.workedMinutes,0),expectedMinutes:days.reduce((s,d)=>s+d.expectedMinutes,0),balanceMinutes:days.reduce((s,d)=>s+d.balanceMinutes,0),overtimeMinutes:days.reduce((s,d)=>s+d.overtime50Minutes+d.overtime100Minutes,0)});
const employees:EmployeeTimeSummary[]=[
 {employeeId:"emp_carlos",employeeName:"Carlos Mendes",position:"Supervisor Operacional",scheduleName:"Operacional 12×36",...sum(daysCarlos),absenceDays:0,exceptionCount:1,status:"review",days:daysCarlos},
 {employeeId:"emp_marina",employeeName:"Marina Souza",position:"Analista de RH",scheduleName:"Administrativo 5×2",...sum(daysMarina),absenceDays:0,exceptionCount:0,status:"approved",days:daysMarina},
 {employeeId:"emp_beatriz",employeeName:"Beatriz Lima",position:"Assistente Administrativa",scheduleName:"Administrativo 5×2",...sum(daysBeatriz),absenceDays:0,exceptionCount:2,status:"review",days:daysBeatriz}
];
const station={id:"station_sp_01",name:"Recepção · Matriz São Paulo",token:"FLUXRH-SP-20260825-2045",rotatesAt:new Date(Date.now()+5*60_000).toISOString(),active:true};

export class InMemoryTimeRepository{
 async overview():Promise<TimeOverview>{return{summary:{presentToday:3,expectedToday:4,openExceptions:exceptions.filter(x=>x.status!=="resolved").length,overtimeHours:18.6,positiveBankMinutes:742,closingProgress:68},qrStation:structuredClone(station),schedules:structuredClone(schedules),punches:structuredClone(rawPunches),exceptions:structuredClone(exceptions),employees:structuredClone(employees)}}
 async register(input:{employeeId:string;employeeName:string;type:TimePunch["type"];token:string;deviceId:string;locationName:string}){if(input.token!==station.token)return{error:"invalid_token" as const};const value:TimePunch={id:`p_${crypto.randomUUID()}`,employeeId:input.employeeId,employeeName:input.employeeName,type:input.type,recordedAt:new Date().toISOString(),source:"qr_code",locationName:input.locationName,deviceId:input.deviceId};rawPunches.unshift(value);return{data:structuredClone(value)}}
 async resolve(id:string,note:string){const value=exceptions.find(x=>x.id===id);if(!value)return undefined;value.status="resolved";value.resolutionNote=note;return structuredClone(value)}
 async approveEmployee(id:string){const value=employees.find(x=>x.employeeId===id);if(!value)return undefined;value.status="approved";return structuredClone(value)}
}
