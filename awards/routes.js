import { handleAwardNicknames, getAwardList, getAwardListFullData, giveAward, getAwardByEmoji, getLeaderboard, getAwardsDatabase, getAwardDocument, getAwardChannel, useLegacyAwardsSystem } from "./awards.js";
import { getClient, send } from "../core/client.js";
import { configureWelcomeScreen } from "../guide/routes.js";
import * as config from "../core/config.js";
import { beginStreamingRes } from "../core/server.js";
import { pluralize } from "../core/utils.js";
import e from "express";

//todo: summary (public?) pages that list achievements?
export async function namesTest(req,res,next) 
{
  console.log(req.awardChannelID);
  console.log(req.awardChannel);
  
  var client = getClient();
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


export async function editor(req,res,next)
{
  var awards = await getAwardsDatabase(req.guild);
  awards = awards.docs.map(function(doc) {
    var d = doc.data();
    d.emoji = doc.id;
    return d;
  });
  await res.render("awards_editor", { awards });
  next();
}

export async function editor_post(req,res,next)
{
  beginStreamingRes(res);

  res.write("Updating Awards Database...\n");

  for (var i = 0; i < req.body.length; i++)
  {
    res.write(`\tUpdating ${req.body[i].emoji} ${req.body[i].title}...`);
    var id = req.body[i].emoji.trim();
    delete req.body[i].emoji;
    
    var doc = await getAwardDocument(req.guild, id);
    await doc.set(req.body[i], { merge: true });
    res.write("Done\n");
  }
  res.write(`Updated ${pluralize(req.body.length, "award")}.\n`);

  res.write(`Updating achievements channel...`);
  await handleAwardNicknames(getClient(), await getAwardChannel(req.guild));
  res.write("Done\n");
  res.end();
}

export async function getAwardsData(req,res,next)
{
    res.locals.awards = await getAwardListFullData(req.guild, req.classList);
    
    var useLegacyAwards = await useLegacyAwardsSystem(req.guild);
    res.locals.checkAward = function(student, award)
    {
      var complete = false;
      if (useLegacyAwards)
      {
        complete = award.students.find(s => s.discordID == student.discordID);
      }
      else
      {
        complete = Object.keys(award.earned ?? {}).indexOf(student.discordID) >= 0;
      }

      if (complete)
      {
        return '<td title="'+award.title+'" class="pageResult complete">&nbsp;</td>';
      }
      else
      {
        return '<td title="'+award.title+'" class="pageResult not_complete"><button onclick="award(\''+student.discordID+'\', \''+award.emoji+'\', this)">'+award.emoji+'</button></td>';
      }
    };
    next();
}

export async function displayAwards(req, res, next) 
{
  console.log(res.locals.offTopicChannelID);
    res.render("awards", { showAwardEditorButton: !(await useLegacyAwardsSystem(req.guild)) });
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
        if (req.query.popupChannelID && req.query.popupChannelID != config.SELECT_FIELD_NONE)
        {
          var channel = await req.guild.channels.cache.get(req.query.popupChannelID);
          await send(channel, {embeds: [ achievementEmbed ]});
        }
        res.json({success:true});
      }
    }
  }
}

export async function importAchievments(req,res,next)
{
  var titleAndDescriptionDelim = req.body.titleAndDescriptionDelim ?? "--";
  var awards = req.body.paste.split("\n");

  //var unified_emoji_ranges = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;//['\ud83c[\udf00-\udfff]','\ud83d[\udc00-\ude4f]','\ud83d[\ude80-\udeff]'];
  //var reg = new RegExp(unified_emoji_ranges);//.join('|'), 'g');
  var reg = new RegExp(/[a-zA-Z0-9]/);

  awards = awards.filter(element => reg.test(element[0]) == false && element[0] != " " && element[0] != "@" && element[0] != ":"  && element[0] != "—" && element[0] != "<"  && element[0] != ">"  && element[0] != "." && element[0] != "\r"  )
  awards = awards.map((element) => { 
    var firstSpace = element.indexOf(" ");
    var secondHalf = element.substring(firstSpace).replace("---", "--");
    secondHalf = secondHalf.split(titleAndDescriptionDelim);
    return {
      emoji: element.substring(0, firstSpace).trim(),
      title: secondHalf[0].trim(),
      description: secondHalf[1].trim()
    }
  });
  
  for (var i = 0; i < awards.length; i++)
  {
    var id = awards[i].emoji.trim();
    delete awards[i].emoji;
    
    var doc = await getAwardDocument(req.guild, id);
    await doc.set(awards[i], { merge: true });
  }

  await handleAwardNicknames(getClient(), await getAwardChannel(req.guild));
  res.write(`Imported ${pluralize(awards.length, "award")}.`);
}