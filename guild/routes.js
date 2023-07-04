import { getClient } from "../core/client.js";
import * as config from "../core/config.js";
import { isUTASBotAdmin } from "../core/permissions.js";
import { beginStreamingRes, renderErrorPage } from "../core/server.js";
import { isOutsideTestServer } from "../core/utils.js";
import { getFavouriteGuilds, toggleFavouriteGuild } from "./favourites.js";

import { getGuilds, saveGuildProperty, setBotNickname } from "./guild.js";

export async function loadGuildList(req,res,next)
{
  var client = getClient();
  req.guilds = (await getGuilds(client, req, await isUTASBotAdmin(req.discordUser?.id)))
    .filter(g => !isOutsideTestServer(g)).sort((a, b) => a.name.localeCompare(b.name));
  next();
}
export async function guildList(req, res) 
{  
  let favs = await getFavouriteGuilds(req.discordUser?.id);

  res.render('guildList', {
    guilds: req.guilds,
    favouriteGuilds: favs,
    testMode: config.getTestMode()
  });
}

export function serverAddedRedirect(req,res,next)
{
  var guildID = req.query.guild_id;
  return _serverAddedRedirect(`/guild/${guildID}/serverAdded`)(req,res,next);
}
export function serverAddedInGuideRedirect(req,res,next)
{
  var guildID = req.query.guild_id;
  return _serverAddedRedirect(`/guild/${guildID}/guide/minimum#serverAdded`)(req,res,next);
}
function _serverAddedRedirect(redirect) 
{
  return function(req,res,next)
  {
    var guildID = req.query.guild_id;
    if (guildID)
    {
      console.log(guildID);
      res.redirect(redirect);
    }
    else
    {
      renderErrorPage(req.query.error_description)(req,res,next);
    }
  };
}
export function serverAdded(req,res,next)
{
  res.render("serverAdded");
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

    console.log(property, value);
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
export async function setFeature(req, res) 
{  
  var property = req.body.feature;
  var value = req.body.value ?? false;
  console.log(property, value);
  await saveGuildProperty("feature_"+property, value, req, res);

  res.json({success:true});
}
export async function setGuildProperty(req, res)
{
  var property = req.body.id;
  property = property.replace("set", "");
  property = property.charAt(0).toLowerCase() + property.slice(1);
  var value = req.body.value ?? false;
  console.log(property, value);
  await saveGuildProperty(property, value, req,res);
  
  res.json({success:true});
}

export async function toggleFavouriteGuildRoute(req,res,next)
{
  var guildId = req.query.guildID;
  await toggleFavouriteGuild(req.discordUser?.id, guildId);
  res.redirect("/");
}

export async function deleteCategory(req,res,next)
{
  await beginStreamingRes(res);

  var categoryID = req.params.categoryID;
  var guild = req.guild;
  var category = guild.channels.cache.get(categoryID);
  if (category)
  {
    await res.write(`Deleting category ${category.name}...\n`);
    //loop through all channels with parent category and delete them
    for (var channel of guild.channels.cache.values())
    {
      if (channel.parent?.id == categoryID)
      {
        await res.write(`Deleting channel ${channel.name}...\n`);
        //await channel.delete();
      }
    }
    //delete category
    await res.write(`Finish Deleting category ${category.name}...\n`);
    //await category.delete();
    await res.write(`Done.`);
  }
  else
  {
    await res.write(`Category ${categoryID} not found.`);
  }
}