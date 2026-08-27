import type { Admission, CreateAdmissionInput, WorkflowOverview } from "@fluxrh/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { InMemoryWorkflowsRepository, type WorkflowsRepository } from "./workflows.repository.js";
import { WorkflowEngine } from "./workflow.engine.js";

type InstanceRow = { id:string; status:Admission["status"]; current_step:Admission["currentStep"]; context:Omit<Admission,"id"|"tasks"> };
type TaskRow = { id:string; instance_id:string; step_key:Admission["currentStep"]; title:string; description:string; kind:Admission["tasks"][number]["kind"]; status:Admission["tasks"][number]["status"]; assignee_label:string; due_at:string; completed_at:string|null };

export class SupabaseWorkflowsRepository implements WorkflowsRepository {
  private engine=new WorkflowEngine();
  private factory=new InMemoryWorkflowsRepository();
  constructor(private client:SupabaseClient){}
  private async all():Promise<Admission[]>{
    const {data:instances,error}=await this.client.from("workflow_instances").select("id,status,current_step,context").eq("subject_type","candidate").order("started_at",{ascending:false});
    if(error)throw new Error(`admissions_load_failed:${error.message}`);
    const ids=(instances??[]).map(row=>row.id);
    const result=ids.length?await this.client.from("workflow_tasks").select("id,instance_id,step_key,title,description,kind,status,assignee_label,due_at,completed_at").in("instance_id",ids).order("created_at"):{data:[],error:null};
    if(result.error)throw new Error(`admission_tasks_load_failed:${result.error.message}`);
    return (instances as InstanceRow[]??[]).map(row=>({...row.context,id:row.id,status:row.status,currentStep:row.current_step,tasks:(result.data as TaskRow[]??[]).filter(t=>t.instance_id===row.id).map(t=>({id:t.id,title:t.title,description:t.description,stepKey:t.step_key,kind:t.kind,status:t.status,assignee:t.assignee_label,dueAt:t.due_at,...(t.completed_at?{completedAt:t.completed_at}:{})}))}));
  }
  list(){return this.all();}
  async find(id:string){return (await this.all()).find(item=>item.id===id);}
  async overview():Promise<WorkflowOverview>{const instances=await this.all();const fallback=await this.factory.overview();const tasks=instances.flatMap(item=>item.tasks.filter(t=>t.status!=="completed").map(t=>({...t,workflowId:item.id,subject:item.candidateName})));return {...fallback,instances,tasks,summary:{running:instances.filter(x=>x.status==="running").length,pendingTasks:tasks.length,automatedToday:0,exceptions:instances.filter(x=>x.status==="exception").length}};}
  async create(input:CreateAdmissionInput){const draft=await this.factory.create(input);const {data,error}=await this.client.rpc("save_admission_workflow",{admission_payload:{...draft,id:""}});if(error)throw new Error(`admission_create_failed:${error.message}`);return (await this.find(data as string))!;}
  async advance(id:string,note?:string){const current=await this.find(id);if(!current)return undefined;const updated=this.engine.advance(current,"Usuário autenticado",note);const {error}=await this.client.rpc("save_admission_workflow",{admission_payload:updated});if(error)throw new Error(`admission_transition_failed:${error.message}`);return this.find(id);}
}
