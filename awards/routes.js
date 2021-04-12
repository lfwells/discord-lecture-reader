import { handleAwardNicknames } from "./awards.js";
import getClient from "../core/client.js";
var client = getClient();

//todo: summary (public?) pages that list achievements?
export async function namesTest(req,res,next) 
{
  console.log(req.awardChannelID);
  console.log(req.awardChannel);
  var awardedMembers = await handleAwardNicknames(client, req.awardChannel);
  
  console.log(awardedMembers);

  res.json(awardedMembers);
}

export async function namesBackup(req,res,next)
{
  var membersData = await req.guild.members.fetch();
  var members = membersData.map(m => [m.id, m.nickname ?? m.user.username]);
  res.json(members);
}
