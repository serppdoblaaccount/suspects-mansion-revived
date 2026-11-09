import { verifyToken } from "./auth.js";
const json=(res,status,data)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));};
async function db(path,options={}){const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Faltan las variables de Supabase.");const r=await fetch(url.replace(/\/$/,"")+"/rest/v1/"+path,{...options,headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=representation",...(options.headers||{})}});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{}if(!r.ok)throw new Error(d?.message||"Error de base de datos.");return d;}
export default async function handler(req,res){
 try{
  const id=verifyToken(req.headers.authorization?.replace(/^Bearer\s+/i,""));if(!id||id!==process.env.ADMIN_USER_ID)return json(res,403,{error:"Se requiere una sesión de administrador válida."});
  if(req.method==="GET"){
   const users=await db("players?select=id,nickname,created_at,banned,is_admin&order=created_at.desc");
   return json(res,200,{users:users.map(u=>({id:u.id,nickname:u.nickname,createdAt:u.created_at,banned:!!u.banned,isAdmin:!!u.is_admin}))});
  }
  if(req.method==="PATCH"){
   const {userId,banned}=req.body||{};if(typeof userId!=="string"||typeof banned!=="boolean")return json(res,400,{error:"Solicitud no válida."});
   if(userId===process.env.ADMIN_USER_ID)return json(res,400,{error:"No puedes bloquear tu propia cuenta de administrador."});
   const rows=await db("players?id=eq."+encodeURIComponent(userId),{method:"PATCH",body:JSON.stringify({banned})});
   if(!rows.length)return json(res,404,{error:"Usuario no encontrado."});
   return json(res,200,{ok:true});
  }
  return json(res,405,{error:"Método no permitido."});
 }catch(e){return json(res,500,{error:e.message||"Error interno."});}
}
