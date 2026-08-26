import { registerPunchSchema, resolveTimeExceptionSchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { InMemoryTimeRepository } from "./time.repository.js";
const repository=new InMemoryTimeRepository();
export async function timeRoutes(app:FastifyInstance){
 app.get("/overview",async(_req,reply)=>sendData(reply,await repository.overview()));
 app.post("/punches",async(request,reply)=>{const parsed=registerPunchSchema.safeParse(request.body);if(!parsed.success)return reply.code(400).send({error:"validation_error",issues:parsed.error.issues});const result=await repository.register(parsed.data);return"error"in result?reply.code(422).send({error:result.error}):sendData(reply,result.data,201)});
 app.post<{Params:{id:string}}>("/exceptions/:id/resolve",async(request,reply)=>{const parsed=resolveTimeExceptionSchema.safeParse(request.body);if(!parsed.success)return reply.code(400).send({error:"validation_error"});const value=await repository.resolve(request.params.id,parsed.data.note);return value?sendData(reply,value):reply.code(404).send({error:"exception_not_found"})});
 app.post<{Params:{id:string}}>("/employees/:id/approve",async(request,reply)=>{const value=await repository.approveEmployee(request.params.id);return value?sendData(reply,value):reply.code(404).send({error:"employee_not_found"})});
}
