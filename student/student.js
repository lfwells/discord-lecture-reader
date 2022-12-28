import admin from "firebase-admin";

import { studentsCollection } from "../core/database.js";
import { asyncForEach } from "../core/utils.js";

export var STUDENT_CACHE = {}; //because querying the db every min is bad (cannot cache on node js firebase it seems)

export default async function init(client)
{
  /*
  var guilds = client.guilds.cache;
  //store them in the db
  await Promise.all(guilds.map( async (guild) => 
  { 
    await asyncForEach(Array.from(guild.members.cache.entries()), async function(kvp) {
      var studentDiscordID = kvp[0];
      var studentDiscordData = kvp[1];

    });
  })
  );;*/

  var allStudentsData = await studentsCollection.get();
  allStudentsData.forEach(d => {
    STUDENT_CACHE[d.id] = d.data();
  });
  console.log(`Done awaiting all students - total ${getStudentCount()}`); 
}

export function getStudentCount()
{
  return Object.entries(STUDENT_CACHE).length
}
export function getStudent(studentDiscordID)
{
  return STUDENT_CACHE[studentDiscordID];
}
export async function getStudentDocument(studentDiscordID)
{
  return await studentsCollection.doc(studentDiscordID);
}

export function loadStudentProperty(property, required)
{
  return async function(req,res,next)  
  {
    if (req.studentDiscordID && STUDENT_CACHE[req.studentDiscordID] && STUDENT_CACHE[req.studentDiscordID][property])
    {
      req[property] = STUDENT_CACHE[req.studentDiscordID][property];
    }

    if (req.guild && (!STUDENT_CACHE[req.studentDiscordID] || !GUILD_CACHE[req.studentDiscordID][property]))
    {
      req.guildDocumentSnapshot = await req.guildDocument.get();
      req[property] = await req.guildDocumentSnapshot.get(property);
      if (!STUDENT_CACHE[req.studentDiscordID]) { STUDENT_CACHE[req.studentDiscordID] = {} }
      
      STUDENT_CACHE[req.studentDiscordID][property] = req[property];
      
    } 
    res.locals[property] = req[property];

    //auto detect an  RoleID
    if (!req[property])
    {
      if (required)
      {
        res.end("No "+property+" set. Please set one.");
        return;
      }
    }
    next(); 
  }
}
  
//non-route version (but still spoofing route version)
export async function getStudentProperty(property, studentDiscordID, defaultValue, required)
{
  var req = await getFakeReq(studentDiscordID);
  var res = {locals:{}, end:(a)=>{}};
  await loadStudentProperty(property, required)(req, res, () => {});
  if (defaultValue != undefined && (res.error || res.locals[property] == undefined))
  {
    //console.log(`getGuildProperty got error ${res.error}, now filling in default value ${defaultValue}`);
    res.error = false;
    await saveGuildProperty(property, defaultValue, req, res);
  }

  if (required && (res.error || res.locals[property] == undefined))
  {
    console.log(res.error);
    return null;
    //anything else?
  }
  return res.locals[property];
}
export async function setStudentProperty(studentDiscordID, property, value)
{
  var res = {locals:{}};
  await saveStudentProperty(property, value, await getFakeReq(studentDiscordID), res);
}

export async function saveStudentProperty(property, value, req, res)
{
  if (value == "true") value = true;
  if (value == "false") value = false;
  var toSave = {};
  toSave[property] = value;
  await req.studentDocument.set(toSave, { merge: true });
  req[property] = value;

  if (STUDENT_CACHE[req.studentDiscordID] == null)
    STUDENT_CACHE[req.studentDiscordID] = {};
  STUDENT_CACHE[req.studentDiscordID][property] = value;

  await loadStudentProperty(property, false)(req, res, () => {});
}

export async function deleteStudentProperty(studentDiscordID, property)
{
  var studentDocument = await getStudentDocument(studentDiscordID);
  var toUpdate = {};
  toUpdate[property] = admin.firestore.FieldValue.delete();
  await studentDocument.set(toUpdate, { merge: true });
  if (STUDENT_CACHE[studentDiscordID])
    delete STUDENT_CACHE[studentDiscordID][property];
}


async function getFakeReq(studentDiscordID)
{
  var req = {
    studentDiscordID: studentDiscordID,
    studentDocument: await await getStudentDocument(studentDiscordID),
    query:{}
  }
  return req;
}

//TODO: has ethics
export function isStudentMyLOConnected(studentDiscordID)
{
  var student = getStudent(studentDiscordID);
  console.log({
    what: "is connected?",
    student

  });
  return (student != null && student.studentID != null && student.studentID != '');
}