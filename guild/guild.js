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
  await Promise.all(guilds.map( async (guild) => { 
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
  if (req.session && req.session.auth)
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
        if (req.discordUser && GUILD_CACHE && GUILD_CACHE[g2.id].admins && GUILD_CACHE[g2.id].admins.indexOf(req.discordUser.id) >= 0) {
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
  req.path.indexOf("/text/") > 0 || 
  req.path.endsWith("/text/latest/") || 
  req.path.indexOf("/poll") >= 0 || 
  req.path.indexOf("/recordProgress/") >= 0 || 
  req.path.indexOf("/recordSectionProgress/") >= 0)  //TODO: this shouldn't bypass security, it should instead require a secret key (but this will mean we need to update our browser sources etc)
    next() 
  else
  {
    var client = getClient();
    var adminGuilds = (await getAdminGuilds(client, req)).map(g => g.id);
    if (adminGuilds.indexOf(req.guild.id) >= 0)
    {
      next();
    }
    else
    {
      res.render("accessDenied");
    }
  }
}

export function getGuildDocument(guildID)
{
  return guildsCollection.doc(guildID);
}

//TODO: these three funcs need to be generic, so we can tag many channel types
export function loadLectureChannel(required)  
{
    return async function(req,res,next)  
    {
      var client = getClient();
      if (req.guild && GUILD_CACHE[req.guild.id] && GUILD_CACHE[req.guild.id].lectureChannelID)
      {
        req.lectureChannelID = GUILD_CACHE[req.guild.id].lectureChannelID;
      }
  
      if (req.guild && (!GUILD_CACHE[req.guild.id] || !GUILD_CACHE[req.guild.id].lectureChannelID))
      {
        req.guildDocumentSnapshot = await req.guildDocument.get();
        req.lectureChannelID = await req.guildDocumentSnapshot.get("lectureChannelID");
        if (!GUILD_CACHE[req.guild.id]) { GUILD_CACHE[req.guild.id] = {} }
        GUILD_CACHE[req.guild.id].lectureChannelID = req.lectureChannelID;
      } 
      if (req.lectureChannelID)
      {
        //console.log("req.lectureChannelID", req.lectureChannelID);
        req.lectureChannel = await client.channels.fetch(req.lectureChannelID);//.cache.filter(c => c.id == lectureChannelID);
        res.locals.lectureChannel = req.lectureChannel;
      }
      else
      {
        //no lecture channel defined
        if (required)
        {
          res.end("No lecture channel set. Please set one on dashboard page.");
          return;
        }
      }
      next(); 
    }
}

//TODO: these three funcs need to be generic, so we can tag many channel types
export function loadAwardChannel(required)  
{
  return async function(req,res,next)  
  {
    var client = getClient();
    if (req.guild && GUILD_CACHE[req.guild.id] && GUILD_CACHE[req.guild.id].awardChannelID)
    {
      req.awardChannelID = GUILD_CACHE[req.guild.id].awardChannelID;
    }

    if (req.guild && (!GUILD_CACHE[req.guild.id] || !GUILD_CACHE[req.guild.id].awardChannelID))
    {
      req.guildDocumentSnapshot = await req.guildDocument.get();
      req.awardChannelID = await req.guildDocumentSnapshot.get("awardChannelID");
      if (!GUILD_CACHE[req.guild.id]) { GUILD_CACHE[req.guild.id] = {} }
      GUILD_CACHE[req.guild.id].awardChannelID = req.awardChannelID;
    } 
    if (req.awardChannelID)
    {
      //console.log("req.awardChannelID", req.awardChannelID);
      req.awardChannel = await client.channels.fetch(req.awardChannelID);//.cache.filter(c => c.id == awardChannelID);
      res.locals.awardChannel = req.awardChannel;
    }
    else
    {
      //no lecture channel defined
      if (required)
      {
        res.end("No award channel set. Please set one on dashboard page.");
        return;
      }
    }
    next(); 
  }
}
  
export function loadOffTopicChannel(required)  
{
  return async function(req,res,next)  
  {
    var client = getClient();
    if (req.guild && GUILD_CACHE[req.guild.id] && GUILD_CACHE[req.guild.id].offTopicChannelID)
    {
      req.offTopicChannelID = GUILD_CACHE[req.guild.id].offTopicChannelID;
    }

    if (req.guild && (!GUILD_CACHE[req.guild.id] || !GUILD_CACHE[req.guild.id].offTopicChannelID))
    {
      req.guildDocumentSnapshot = await req.guildDocument.get();
      req.offTopicChannelID = await req.guildDocumentSnapshot.get("offTopicChannelID");
      if (!GUILD_CACHE[req.guild.id]) { GUILD_CACHE[req.guild.id] = {} }
      GUILD_CACHE[req.guild.id].offTopicChannelID = req.offTopicChannelID;
    } 
    if (req.offTopicChannelID)
    {
      //console.log("req.offTopicChannelID", req.offTopicChannelID);
      req.offTopicChannel = await client.channels.fetch(req.offTopicChannelID);//.cache.filter(c => c.id == offTopicChannel);
      res.locals.offTopicChannel = req.offTopicChannel;
    }
    else
    {
      //no lecture channel defined
      if (required)
      {
        res.error = "No off-topic channel set. Please set one on dashboard page.";
        res.end(res.error);
        return res;
      }
    }
    next(); 
    return res; //TODO: do this for other channels? or just wait until this is generic
  }
}


  
export async function loadAdminRoleID(req,res,next)   
{
  if (req.guild && GUILD_CACHE[req.guild.id] && GUILD_CACHE[req.guild.id].adminRoleID)
  {
    req.adminRoleID = GUILD_CACHE[req.guild.id].adminRoleID;
  }

  if (req.guild && (!GUILD_CACHE[req.guild.id] || !GUILD_CACHE[req.guild.id].adminRoleID))
  {
    req.guildDocumentSnapshot = await req.guildDocument.get();
    req.adminRoleID = await req.guildDocumentSnapshot.get("adminRoleID");
    if (!GUILD_CACHE[req.guild.id]) { GUILD_CACHE[req.guild.id] = {} }
    GUILD_CACHE[req.guild.id].adminRoleID = req.adminRoleID;
  }
    
  if (req.adminRoleID)
  {
    req.adminRole = await req.guild.roles.fetch(req.adminRoleID);
    res.locals.adminRole = req.adminRole;
  }

  next(); 
  return res; 
}

//non-route version (but still spoofing route version)
//todo: generic for all
export async function getOffTopicChannel(guild, required)
{
  var client = getClient();
  var res = await loadOffTopicChannel(required)(getFakeReq(guild), {locals:{}}, () => {});
  if (required && res.error)
  {
    console.log(res.error);
    //anything else?
  }
  return res.locals.offTopicChannel;
}
//non-route version (but still spoofing route version)
//todo: generic for all
export async function getAdminRole(guild)
{
  var client = getClient();
  var res = await loadAdminRoleID(getFakeReq(guild), {locals:{}}, () => {});
  if (res.error)
  {
    console.log(res.error);
    //anything else?
  }
  return res.locals.adminRole;
}

//TODO: this will need a refresh button or a detect that a member role has changed
export async function init_admin_users(client)
{
  console.log("init_admin_users");

  var guilds = client.guilds.cache;
  //store them in the db
  guilds.each( async (guild) => 
  { 
    var adminRole = await getAdminRole(guild);
    if (adminRole)
    {
      console.log(guild.name);
      GUILD_CACHE[guild.id].admins = adminRole.members.map(m=>m.user.id);
      console.log(GUILD_CACHE[guild.id].admins);
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