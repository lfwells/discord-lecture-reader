import { handleAwardNicknames, getAwardList, getAwardListFullData, giveAward, getAwardByEmoji, getLeaderboard } from "./awards.js";
import { getClient, send } from "../core/client.js";
import e from "express";
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

export async function getAwardsList(req,res,next)
{
  var awards = await getAwardList(req.guild);
  res.json(awards);
}
export async function leaderboard(req,res,next)
{
  req.classList = await getLeaderboard(req.guild, req.classList); 
  await res.render("leaderboard");
  next();
}
export async function leaderboardOBS(req,res,next)
{
  req.classList = await getLeaderboard(req.guild, req.classList);
  await res.render("leaderboard_obs");
  next();
}

export async function getAwardsData(req,res,next)
{
    res.locals.awards = await getAwardListFullData(req.guild, req.classList);
    
    res.locals.checkAward = function(student, award)
    {
      var complete = award.students.find(s => s.discordID == student.discordID);
      if (complete)
      {
        return '<td title="'+award.name+'" class="pageResult complete">&nbsp;</td>';
      }
      else
      {
        return '<td title="'+award.name+'" class="pageResult not_complete"><button onclick="award(\''+student.discordID+'\', \''+award.emoji+'\', this)">'+award.emoji+'</button></td>';
      }
    };
    next();
}

export async function displayAwards(req, res, next) 
{
    res.render("awards");
    next()
}

export async function getGiveAward(req, res, next)
{
  console.log(req.query); 
  if (req.query.emoji == undefined)
  {
    res.json({error:"no award"});
  }
  else if (req.query.studentDiscordID == undefined)
  {
    res.json({error:"no student"});
  }
  else
  {
    var award = await getAwardByEmoji(req.guild, req.query.emoji);
    if (award == undefined)
    {
      res.json({error:"award not found"});
    }
    else
    {
      var member = await req.guild.members.cache.get(req.query.studentDiscordID);
      if (member == undefined)
      {
        res.json({error:"member not found"});
      }
      else
      {
        var achievementEmbed = await giveAward(req.guild, award, member);

        //display popup if asked for
        if (req.query.popupChannelID)
        {
          var channel = await req.guild.channels.cache.get(req.query.popupChannelID);
          await send(channel, {embed:achievementEmbed});
        }
        res.json({success:true});
      }
    }
  }
}