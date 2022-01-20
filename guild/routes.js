import { getClient } from "../core/client.js";
import * as config from "../core/config.js";
import { isOutsideTestServer } from "../core/utils.js";

import { getAdminGuilds, GUILD_CACHE, saveGuildProperty, setBotNickname } from "./guild.js";

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
  res.render("guild");
}

export async function guildHomePost(req, res, next)
{
  if (req.body.setBotName && req.body.setBotName.trim() != "")
    await setBotNickname(req.guild, req.body.setBotName);

  var settingsQueryKeys = Object.keys(req.body).filter(k => k.startsWith("set"));
  await Promise.all(settingsQueryKeys.map( async (setting) => 
  { 
    var property = setting.replace("set", "");
    property = property.charAt(0).toLowerCase() + property.slice(1);
    var value = req.body[setting];
    if (value == "__DISCORD_BOT_NONE__") return;

    await saveGuildProperty(property, value, req, res);
  }));

  next();
}

export async function guildFeatures(req, res) 
{  
  //todo: a generic settings list maybe?
  var settingsQueryKeys = Object.keys(req.query).filter(k => k.startsWith("set"));
  await Promise.all(settingsQueryKeys.map( async (setting) => 
  { 
    var property = setting.replace("set", "");
    property = property.charAt(0).toLowerCase() + property.slice(1);
    await saveGuildProperty(property, req.query[setting], req, res);
  }));

  res.render("guildFeatures");
}