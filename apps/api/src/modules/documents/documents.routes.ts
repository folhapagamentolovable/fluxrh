import { acceptDocumentSchema, createDocumentRequestSchema, validateDocumentSchema } from "@fluxrh/contracts";
import type { FastifyInstance } from "fastify";
import { sendData } from "../../shared/http.js";
import { InMemoryDocumentsRepository } from "./documents.repository.js";

const repository=new InMemoryDocumentsRepository();
export async function documentsRoutes(app:FastifyInstance){
  app.get("/overview",async(_request,reply)=>sendData(reply,await repository.overview()));
  app.get<{Params:{id:string}}>("/:id",async(request,reply)=>{const value=await repository.find(request.params.id);return value?sendData(reply,value):reply.code(404).send({error:"document_not_found"})});
  app.post("/requests",async(request,reply)=>{const parsed=createDocumentRequestSchema.safeParse(request.body);return parsed.success?sendData(reply,await repository.create(parsed.data),201):reply.code(400).send({error:"validation_error",issues:parsed.error.issues})});
  app.post<{Params:{id:string}}>("/:id/validate",async(request,reply)=>{const parsed=validateDocumentSchema.safeParse(request.body);if(!parsed.success)return reply.code(400).send({error:"validation_error",issues:parsed.error.issues});const value=await repository.validate(request.params.id,parsed.data.decision,parsed.data.note);return value?sendData(reply,value):reply.code(404).send({error:"document_not_found"})});
  app.post<{Params:{id:string}}>("/:id/accept",async(request,reply)=>{const parsed=acceptDocumentSchema.safeParse(request.body);if(!parsed.success)return reply.code(400).send({error:"validation_error",issues:parsed.error.issues});const value=await repository.accept(request.params.id,parsed.data.signerName,parsed.data.signerDocument,request.ip,String(request.headers["user-agent"]??"FluxRH Web"));return value?sendData(reply,value):reply.code(404).send({error:"document_not_found"})});
}
