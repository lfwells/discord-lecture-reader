import * as config from "../core/config.js";
import { isOutsideTestServer } from "../core/utils.js";

import getClient from "../core/client.js";
var client = getClient();

import { getGuildCache } from "./guild.js";
var GUILD_CACHE = getGuildCache();

export function guildList(req, res) 
{
    
  res.render('guildList', {
    guilds: client.guilds.cache.filter(g => !isOutsideTestServer(g)),
    testMode: config.getTestMode(),
  });
}

export async function guildHome(req, res) 
{  
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

    req.query.message = "set the award channel to #"+req.awardChannel.name;
  }

  res.render("guild");
}
