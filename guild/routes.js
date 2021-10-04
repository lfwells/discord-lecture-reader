import { getClient } from "../core/client.js";
import * as config from "../core/config.js";
import { isOutsideTestServer } from "../core/utils.js";

import { getAdminGuilds, GUILD_CACHE, saveGuildProperty } from "./guild.js";

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
  //todo: a generic settings list maybe?

  var setLectureChannelID = req.query.setLectureChannelID;
  if (setLectureChannelID)
  {
    await saveGuildProperty("lectureChannelID", setLectureChannelID, req, res);
  }

  var setAwardChannelID = req.query.setAwardChannelID;
  if (setAwardChannelID)
  {
    await saveGuildProperty("awardChannelID", setAwardChannelID, req, res);
  }

  var setOffTopicChannelID = req.query.setOffTopicChannelID;
  if (setOffTopicChannelID)
  {
    await saveGuildProperty("offTopicID", setOffTopicChannelID, req, res);
  }

  var setAdminRoleID = req.query.setAdminRoleID;
  if (setAdminRoleID)
  {
    await saveGuildProperty("adminRoleID", setAdminRoleID, req, res);
  }

  var setStudentRoleID = req.query.setStudentRoleID;
  if (setStudentRoleID)
  {
    await saveGuildProperty("studentRoleID", setStudentRoleID, req, res);
  }


  res.render("guild");
}
