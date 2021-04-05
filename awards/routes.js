import { handleAwardNicknames } from "./awards.js";

//todo: summary (public?) pages that list achievements?
export async function namesTest(req,res,next) 
{
  var awardedMembers = await handleAwardNicknames();
  
  console.log(awardedMembers);

  res.json(awardedMembers);
}

export async function namesBackup(req,res,next)
{
  var guild = await client.guilds.cache.get("801757073083203634");
  var membersData = await guild.members.fetch();
  var members = membersData.map(m => [m.id, m.nickname ?? m.user.username]);
  res.json(members);
}
