import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

const json=(res,status,data)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));};
const env=()=>{const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");return {url:url.replace(/\/$/,""),key};};
async function db(path,options={}){const {url,key}=env();const r=await fetch(url+"/rest/v1/"+path,{...options,headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=representation",...(options.headers||{})}});const body=await r.text();let data=null;try{data=body?JSON.parse(body):null}catch{}if(!r.ok)throw new Error(data?.message||data?.details||"Error de base de datos.");return data;}
function token(id){const secret=process.env.AUTH_TOKEN_SECRET;if(!secret)throw new Error("Falta AUTH_TOKEN_SECRET.");const payload=Buffer.from(JSON.stringify({sub:id,exp:Date.now()+1000*60*60*24*14})).toString("base64url");const sig=createHmac("sha256",secret).update(payload).digest("base64url");return payload+"."+sig;}
export function verifyToken(value){try{const [p,s]=String(value||"").split(".");const secret=process.env.AUTH_TOKEN_SECRET;if(!p||!s||!secret)return null;const expected=createHmac("sha256",secret).update(p).digest();const actual=Buffer.from(s,"base64url");if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;const data=JSON.parse(Buffer.from(p,"base64url").toString());return data.exp>Date.now()?data.sub:null;}catch{return null;}}
function validCredentials(body){return typeof body?.nickname==="string"&&body.nickname.trim().length>=2&&body.nickname.trim().length<=18&&typeof body?.salt==="string"&&body.salt.length<=100&&typeof body?.passwordHash==="string"&&/^[A-Za-z0-9+/]{40,50}={0,2}$/.test(body.passwordHash);}
export default async function handler(req,res){
 if(req.method!=="POST")return json(res,405,{error:"Método no permitido."});
 try{
  const body=req.body||{};const action=body.action;
  if(action==="register"){
   if(!validCredentials(body))return json(res,400,{error:"Datos de cuenta no válidos."});
   const nickname=body.nickname.trim().replace(/\s+/g," ");
   const existing=await db("players?select=id&nickname=ilike."+encodeURIComponent(nickname));
   if(existing.length)return json(res,409,{error:"Ese nombre ya está registrado."});
   const id="SMR-"+randomUUID().toUpperCase();
   const rows=await db("players",{method:"POST",body:JSON.stringify({id,nickname,salt:body.salt,password_hash:body.passwordHash})});
   const player=rows[0];return json(res,201,{token:token(player.id),user:{id:player.id,nickname:player.nickname}});
  }
  if(action==="challenge"){
   if(typeof body.nickname!=="string")return json(res,400,{error:"Nombre no válido."});
   const rows=await db("players?select=salt,banned&nickname=ilike."+encodeURIComponent(body.nickname.trim()));
   const player=rows[0];if(!player||player.banned)return json(res,404,{error:"No existe una cuenta activa con ese nombre."});
   return json(res,200,{salt:player.salt});
  }
  if(action==="login"){
   if(typeof body.nickname!=="string"||typeof body.passwordHash!=="string")return json(res,400,{error:"Datos no válidos."});
   const rows=await db("players?select=id,nickname,salt,password_hash,banned&nickname=ilike."+encodeURIComponent(body.nickname.trim()));
   const player=rows[0];if(!player||player.banned||player.password_hash!==body.passwordHash)return json(res,401,{error:"Nombre o contraseña incorrectos."});
   return json(res,200,{token:token(player.id),user:{id:player.id,nickname:player.nickname}});
  }
  if(action==="bootstrap"){
   const setup=process.env.ADMIN_SETUP_TOKEN;const adminId=process.env.ADMIN_USER_ID;
   if(!setup||!adminId||body.setupToken!==setup)return json(res,403,{error:"No autorizado para configurar el administrador."});
   if(!validCredentials(body))return json(res,400,{error:"Datos de cuenta no válidos."});
   const exists=await db("players?select=id&id=eq."+encodeURIComponent(adminId));
   if(exists.length)return json(res,409,{error:"La cuenta administradora ya está creada."});
   const rows=await db("players",{method:"POST",body:JSON.stringify({id:adminId,nickname:body.nickname.trim(),salt:body.salt,password_hash:body.passwordHash,is_admin:true})});
   const player=rows[0];return json(res,201,{token:token(player.id),user:{id:player.id,nickname:player.nickname}});
  }
  return json(res,400,{error:"Acción desconocida."});
 }catch(e){return json(res,500,{error:e.message||"Error interno."});}
}
