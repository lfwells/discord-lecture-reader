import * as config from '../core/config.js'; 
import { db, guildsCollection } from "../core/database.js";
import { getStatus, isOutsideTestServer } from "../core/utils.js";
import { init_invites } from "../invite/invite.js";
import { init_roles } from '../invite/roles.js';

import { getClient } from "../core/client.js";
import { loginPage, oauth } from '../core/login.js';

export var GUILD_CACHE = {}; //because querying the db every min is bad (cannot cache on node js firebase it seems)s

export async function init(client)
{
  var guilds = client.guilds.cache;
  //store them in the db
  await Promise.all(guilds.map( async (guild) => 
  { 
    await guild.fetch();
    await db.collection("guilds").doc(guild.id).set({    
      name:guild.name
    }, {merge:true}); 

    GUILD_CACHE[guild.id] = {};

    if (guild.id == config.TEST_SERVER_ID)
    {
      console.log(await getStatus(config.LINDSAY_ID, guild));
    }
    console.log("initialised Guild",guild.name, guild.id);
  })
  );;
  console.log("done awaiting all guilds"); 

  await init_admin_users(client);
  await init_invites(client);
  await init_roles(client);
}

//TODO: these two need to return error if not authed or wrong id
export function load() {
  return async function(req, res, next)
  {
    var guildID = req.params.guildID;
    var client = getClient();
    req.guild = await client.guilds.fetch(guildID); 
    req.guildDocument = getGuildDocument(guildID);

    if (req.guild == undefined)
    {
      res.end("Guild not found");
      return;
    }

    if (isOutsideTestServer(req.guild))
    {
      res.end("Tried to use non-test server in test mode. Disable test mode.");
    }
    else
    {
      res.locals.guild = req.guild;
      next();
    }
  }
}

export async function getAdminGuilds(client, req)
{
  if (req.session && req.session.auth && req.discordUser)
  {
    var guilds = Object.values(await oauth.getUserGuilds(req.session.auth.access_token)); 
    //console.log("user guilds", guilds);
    var result = client.guilds.cache.filter(g => guilds.findIndex(g2 => {
      if (g2.id == g.id)
      {
        //if owner then yess
        if (g2.owner) { /*console.log("is owner of "+g2.name); */return true; }

        //check admin permissions, but this is not enough
        if ((g2.permissions & 0x0000000008) == 0x0000000008) { /*console.log("is admin of "+g2.name); */return true; }

        //check if theyre in the admins list
        if (req.discordUser && GUILD_CACHE && GUILD_CACHE[g2.id] && GUILD_CACHE[g2.id].admins && GUILD_CACHE[g2.id].admins.indexOf(req.discordUser.id) >= 0) {
          /*console.log("is in staff role of "+g2.name); */return true;
        }
      }
      return false;
    }) >= 0);

    return result;
  }
  return [];
}

export async function checkGuildAdmin(req, res, next)
{
  if (req.path.indexOf("obs") >= 0 || 
  req.path.indexOf("/text") >= 0 || 
  req.path.endsWith("/text/latest/") || 
  req.path.indexOf("/poll") >= 0 || 
  req.path.indexOf("/recordProgress/") >= 0 || 
  req.path.indexOf("/recordSectionProgress/") >= 0)  //TODO: this shouldn't bypass security, it should instead require a secret key (but this will mean we need to update our browser sources etc)
  {
    next();
    return;
  }
  else if (req.discordUser)
  {
    var client = getClient();
    var adminGuilds = (await getAdminGuilds(client, req)).map(g => g.id);
    if (adminGuilds.indexOf(req.guild.id) >= 0)
    {
      next();
      return;
    }
  }
  res.render("accessDenied");
}

export function getGuildDocument(guildID)
{
  return guildsCollection.doc(guildID);
}

export function loadGuildProperty(property, required)
{
  return async function(req,res,next)  
  {
    var client = getClient();
    if (req.guild && GUILD_CACHE[req.guild.id] && GUILD_CACHE[req.guild.id][property])
    {
      req[property] = GUILD_CACHE[req.guild.id][property];
    }

    if (req.guild && (!GUILD_CACHE[req.guild.id] || !GUILD_CACHE[req.guild.id][property]))
    {
      req.guildDocumentSnapshot = await req.guildDocument.get();
      req[property] = await req.guildDocumentSnapshot.get(property);
      if (!GUILD_CACHE[req.guild.id]) { GUILD_CACHE[req.guild.id] = {} }
      GUILD_CACHE[req.guild.id][property] = req[property];
    } 
    res.locals[property] = req[property];

    //auto detect an ChannelID or RoleID
    if (req[property])
    {
      if (property.endsWith("ChannelID"))
      {
        var channelProperty = property.replace("ChannelID", "Channel");
        req[channelProperty] = await client.channels.fetch(req[property]);
        res.locals[channelProperty] = req[channelProperty];
      }
      if (property.endsWith("RoleID"))
      {
        var roleProperty = property.replace("RoleID", "Role");
        req[roleProperty] = await req.guild.roles.fetch(req[property]);
        res.locals[roleProperty] = req[roleProperty];
      }
    }
    else
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
export async function getGuildProperty(property, guild, defaultValue, required)
{
  var res = {locals:{}};
  await loadGuildProperty(property, required)(getFakeReq(guild), res, () => {});

  if (defaultValue != undefined && res.error)
  {
    res.error = false;
    await saveGuildProperty(property, defaultValue, req, res);
  }

  if (required && res.error)
  {
    console.log(res.error);
    return null;
    //anything else?
  }
  return res.locals[property];
}
export async function getGuildPropertyConverted(property, guild, defaultValue, required) //this version will return the channel/role object itself
{
  var res = {locals:{}};
  await loadGuildProperty(property, required)(getFakeReq(guild), res, () => {});

  if (defaultValue && res.error)
  {
    res.error = false;
    await saveGuildProperty(property, defaultValue, req, res);
  }

  if (required && res.error)
  {
    console.log(res.error);
    return null;
    //anything else?
  }
  if (property.endsWith("ChannelID"))
  {
    property = property.replace("ChannelID", "Channel");
  }
  if (property.endsWith("RoleID"))
  {
    property = property.replace("RoleID", "Role");
  }

  return res.locals[property];
}

export async function saveGuildProperty(property, value, req, res)
{
  var toSave = {};
  toSave[property] = value;
  await req.guildDocument.update(toSave);
  req[property] = value;
  GUILD_CACHE[req.guild.id][property] = value;

  await loadGuildProperty(property, false)(req, res, () => {});

  if (property.endsWith("ChannelID"))
  {
    property = property.replace("ChannelID", "Channel");
    req.query.message = "Set "+property+" to #"+ req[property].name+".";
  }
  else if (property.endsWith("RoleID"))
  {
    property = property.replace("RoleID", "Role");
    req.query.message = "Set "+property+" to @"+ req[property].name+".";
  }
  else
  {
    req.query.message = "Set "+property+" to "+ req[property]+".";
  }
}

//TODO: this will need a refresh button or a detect that a member role has changed
export async function init_admin_users(client)
{
  console.log("init_admin_users");

  var guilds = client.guilds.cache;
  //store them in the db
  guilds.each( async (guild) => 
  { 
    var adminRole = await getGuildPropertyConverted("adminRoleID", guild);
    if (adminRole)
    {
      //console.log(guild.name);
      GUILD_CACHE[guild.id].admins = adminRole.members.map(m=>m.user.id);
      //console.log(GUILD_CACHE[guild.id].admins);
    }
  });
}

function getFakeReq(guild)
{
  var req = {
    guild: guild,
    guildDocument: getGuildDocument(guild.id),
  }
  return req;
}