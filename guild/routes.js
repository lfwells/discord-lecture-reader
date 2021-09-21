import { getClient } from "../core/client.js";
import * as config from "../core/config.js";
import { isOutsideTestServer } from "../core/utils.js";

import { getAdminGuilds, GUILD_CACHE } from "./guild.js";

export async function guildList(req, res) 
{  
  var client = getClient();
  res.render('guildList', {
    guilds: (await getAdminGuilds(client, req)).filter(g => !isOutsideTestServer(g)).sort((a, b) => a.name.localeCompare(b.name)),
    testMode: config.getTestMode(),
  });
}

export async function guildHome(req, res) 
{  
  var client = getClient();

  //todo: these three need to be generic
  var setLectureChannelID = req.query.setLectureChannelID;
  if (setLectureChannelID)
  {
    await req.guildDocument.update({
      lectureChannelID: setLectureChannelID
    });
    req.lectureChannelID = setLectureChannelID;
    GUILD_CACHE[req.guild.id].lectureChannelID = setLectureChannelID;

    req.lectureChannel = await client.channels.fetch(req.lectureChannelID);//.cache.filter(c => c.id == lectureChannelID);
    res.locals.lectureChannel = req.lectureChannel;

    req.query.message = "set the lecture channel to #"+req.lectureChannel.name;
  }
  
  //todo: these three need to be generic
  var setAwardChannelID = req.query.setAwardChannelID;
  if (setAwardChannelID)
  {
    await req.guildDocument.update({
      awardChannelID: setAwardChannelID
    });
    req.awardChannelID = setAwardChannelID;
    GUILD_CACHE[req.guild.id].awardChannelID = setAwardChannelID;

    req.awardChannel = await client.channels.fetch(req.awardChannelID);//.cache.filter(c => c.id == awardChannelID);
    res.locals.awardChannel = req.awardChannel;

    req.query.message = "set the award channel to @"+req.awardChannel.name;
  }

  //todo: these three need to be generic
  var setOffTopicChannelID = req.query.setOffTopicChannelID;
  if (setOffTopicChannelID)
  {
    await req.guildDocument.update({
      offTopicChannelID: setOffTopicChannelID
    });
    req.offTopicChannelID = setOffTopicChannelID;
    GUILD_CACHE[req.guild.id].offTopicChannelID = setOffTopicChannelID;

    req.offTopicChannel = await client.channels.fetch(req.offTopicChannelID);//.cache.filter(c => c.id == offTopicChannelID);
    res.locals.offTopicChannel = req.offTopicChannel;

    req.query.message = "set the off topic channel to #"+req.offTopicChannel.name;
  }

  var setAdminRoleID = req.query.setAdminRoleID;
  if (setAdminRoleID)
  {
    await req.guildDocument.update({
      adminRoleID: setAdminRoleID
    });
    req.adminRoleID = setAdminRoleID;
    GUILD_CACHE[req.guild.id].adminRoleID = setAdminRoleID;

    req.adminRole = await req.guild.roles.fetch(req.adminRoleID);//.cache.filter(c => c.id == offTopicChannelID);
    res.locals.adminRole = req.adminRole;

    req.query.message = "set the admin role to #"+req.adminRole.name;
  }

  var setStudentRoleID = req.query.setStudentRoleID;
  if (setStudentRoleID)
  {
    await req.guildDocument.update({
      studentRoleID: setStudentRoleID
    });
    req.studentRoleID = setStudentRoleID;
    GUILD_CACHE[req.guild.id].studentRoleID = setStudentRoleID;

    req.studentRole = await req.guild.roles.fetch(req.studentRoleID);//.cache.filter(c => c.id == offTopicChannelID);
    res.locals.studentRole = req.studentRole;

    req.query.message = "set the student role to #"+req.studentRole.name;
  }


  res.render("guild");
}
