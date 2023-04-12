import admin from "firebase-admin";

import { guildsCollection, transfer } from "../core/database.js";
import { init_invites } from "../invite/invite.js";
import { init_roles } from '../roles/roles.js';

import { getClient } from "../core/client.js";
import { oauth } from '../_oathDiscord.js';
import { init_sheet_for_guild } from '../analytics/sheets.js';
import { init_sessions } from '../attendance/sessions.js';
import { unregisterAllCommandsIfNecessary } from "./commands.js";
import { asyncFilter, asyncForEach, isOutsideTestServer } from "../core/utils.js";
import { init_status_channels } from "./statusChannels.js";
import { stripEmoji } from "../awards/awards.js";
import { init_presence_scrape } from "../analytics/presence.js";
import { getPostsData } from "../analytics/analytics.js";

import { setGuildContextForRoute } from "../core/errors.js";
import { getPermissions, isUTASBotAdminCached } from "../core/permissions.js";
import { loadClassList } from "../classList/classList.js";
import { profileIsPublic } from "../profile/profile.js";

export var GUILD_CACHE = {}; //because querying the db every min is bad (cannot cache on node js firebase it seems)

const guessConfiguration = {
  ruleChannelID: { type:"channel", name:"rules" },
  lectureChannelID: { type:"channel", name:"lecture-chat" },
  awardChannelID: { type:"channel", name:"achievements" },
  offTopicChannelID: { type:"channel", name:"off-topic" },
  todoChannelID: { type:"channel", name:"todo-list" },
  offTopicCategoryID: { type:"category", name:"Off Topic" },
  adminRoleID: { type:"role", name:"Unit Coordinator" },
  studentRoleID: { type:"role", name:"Current Student" },
};

export default async function init(client)
{
  var guilds = client.guilds.cache;
  //store them in the db
  await Promise.all(guilds.map( async (guild) => 
  { 
    //load guild info
    await guild.fetch();
    (await guildsCollection.doc(guild.id)).set({    
      name:guild.name
    }, {merge:true}); 

    //cache the info (reduce firebase reads)
    GUILD_CACHE[guild.id] = guild;//{}
    
    //aspriational function to move away from firebase and store in mongo one day
    await transfer(guild.id);

    //wipe all the commands (they get generated again by the init functions)
    await unregisterAllCommandsIfNecessary(guild);
    
    //run the init functions
    await init_admin_users(guild);
    await init_invites(guild);
    await init_roles(guild);
    await init_sessions(guild);
    await init_sheet_for_guild(guild);
    init_status_channels(guild); //not awaiting, so that it can happen in background
    init_presence_scrape(guild); //not awaiting, so that it can happen in background

    console.log("Initialised Guild",guild.name, guild.id);
  })
  );;
  console.log("Done awaiting all guilds"); 
}

//TODO: these two need to return error if not authed or wrong id
export function load() {
  return async function(req, res, next)
  {
    var guildID = req.params.guildID;
    var client = getClient();
    req.guild = await client.guilds.fetch(guildID); 
    req.guildDocument = await getGuildDocument(guildID);

    if (req.guild == undefined)
    {
      res.end("Guild not found");
      return;
    }

    if (req.discordUser)
    {
      var permissions = await getPermissions(req.discordUser.id);
      var guilds = Object.values(await oauth.getUserGuilds(req.session.auth.access_token));
      req.guild.isGuildAdmin = await isUTASBotAdminCached(permissions) ||  await isGuildAdmin(req.guild, client, req, guilds);
    }

    if (isOutsideTestServer(req.guild))
    {
      res.end("Tried to use non-test server in test mode. Disable test mode.");
    }
    else
    {
      res.locals.guild = req.guild;
      setGuildContextForRoute(req);
      next();
    }
  }
}

export async function isGuildAdmin(g, client, req, ownedGuilds)
{  
  if (!ownedGuilds) ownedGuilds = Object.values(await oauth.getUserGuilds(req.session.auth.access_token)); 
  return ownedGuilds.findIndex(g2 => {
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
  }) >= 0;
}
export async function getGuilds(client, req, showAllGuilds)
{
  if (req.session && req.session.auth && req.discordUser)
  {
    var guilds = Object.values(await oauth.getUserGuilds(req.session.auth.access_token)); 
    var permissions = req.permissions;
    //console.log("user guilds", guilds);
    var result = showAllGuilds ? client.guilds.cache : client.guilds.cache.filter(g => guilds.findIndex(g2 => g2.id == g.id) >= 0);

    if (req.path.indexOf("clone") == -1)
    {
      //a once-off cache totalPost count
        await asyncForEach(result, async function(guild)  
        {
          guild.isGuildAdmin = await isUTASBotAdminCached(permissions) ||  await isGuildAdmin(guild, client, req, guilds);

          await getGuildProperty("totalPosts", guild, "totalPosts");
          if (!guild.totalPosts)
          {
            console.log("NO DB CACHE for totalPosts for guild", guild.name, "fetching once-off");
            guild.totalPosts = (await getPostsData(guild)).length;
            console.log("total posts", guild.name ?? "NO NAME DUMBO", guild.totalPosts);
            await setGuildProperty(guild, "totalPosts", guild.totalPosts);
          }
        });
    }
    return result;
  }
  return [];
}

export async function checkGuildAdmin(req, res, next)
{
  if (req.path.indexOf("/obs/") >= 0 || 
    req.path.indexOf("/text") >= 0 || 
    req.path.indexOf("/text/latest") >= 0 || 
    req.path.indexOf("/poll") >= 0 || 
    req.path.indexOf("/recordProgress") >= 0 || 
    req.path.indexOf("/recordSectionProgress") >= 0)  //TODO: this shouldn't bypass security, it should instead require a secret key (but this will mean we need to update our browser sources etc)
  {
    next();
    return;
  }
  else if (req.discordUser)
  {
    var client = getClient();
    if (await isUTASBotAdminCached(req.permissions) || await isGuildAdmin(req.guild, client, req))
    {
      next();
      return;
    }
  }

  await loadClassList(req, res);
  req.classList = await asyncFilter(req.classList, async (member) => await profileIsPublic(member));
  
  res.render("guildPublic", {
    classList: req.classList,
  });
}

export async function getGuildDocument(guildID)
{
  return await guildsCollection.doc(guildID);
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
      //console.log("loadGuildProperty cache miss --", property, "- ", req.guild.name, GUILD_CACHE[req.guild.id][property]);
      //console.log(Object.keys(GUILD_CACHE[req.guild.id]).indexOf(property));
      req.guildDocumentSnapshot = await req.guildDocument.get();
      req[property] = await req.guildDocumentSnapshot.get(property);
      if (!GUILD_CACHE[req.guild.id]) { GUILD_CACHE[req.guild.id] = {} }
      
      GUILD_CACHE[req.guild.id][property] = req[property];
      //console.log("loadGuildProperty setting", property, GUILD_CACHE[req.guild.id][property]);
      //console.log(Object.keys(GUILD_CACHE[req.guild.id]).indexOf(property)); 
      
    } 
    res.locals[property] = req[property];

    if (property == "ruleChannelID" && isCommunityGuild(req.guild)) //special case
    {
      req[channelProperty] = await req.guild.rulesChannelID;
      res.locals[channelProperty] = req[channelProperty];
      GUILD_CACHE[req.guild.id][channelProperty] = req[channelProperty];
    }
    //auto detect an ChannelID or RoleID
    else if (req[property])
    {
      if (property.endsWith("ChannelID"))
      {
        var channelProperty = property.replace("ChannelID", "Channel");
        req[channelProperty] = GUILD_CACHE[req.guild.id][channelProperty] ?? await client.channels.fetch(req[property]);
        res.locals[channelProperty] = req[channelProperty];
        GUILD_CACHE[req.guild.id][channelProperty] = req[channelProperty];
        
      }
      if (property.endsWith("RoleID"))
      {
        var roleProperty = property.replace("RoleID", "Role");
        req[roleProperty] = GUILD_CACHE[req.guild.id][roleProperty] ?? await req.guild.roles.fetch(req[property]);
        res.locals[roleProperty] = req[roleProperty];
        GUILD_CACHE[req.guild.id][roleProperty] = req[roleProperty];
      }
      if (property.endsWith("CategoryID"))
      {
        var categoryProperty = property.replace("CategoryID", "Category");
        req[categoryProperty] = GUILD_CACHE[req.guild.id][categoryProperty] ?? await req.guild.channels.fetch(req[property]);
        res.locals[categoryProperty] = req[categoryProperty];
        GUILD_CACHE[req.guild.id][categoryProperty] = req[categoryProperty];
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
  var req = await getFakeReq(guild);
  var res = {locals:{}, end:(a)=>{}};
  await loadGuildProperty(property, required)(req, res, () => {});
  if (defaultValue != undefined && (res.error || res.locals[property] == undefined))
  {
    //console.log(`getGuildProperty got error ${res.error}, now filling in default value ${defaultValue}`);
    res.error = false;
    await saveGuildProperty(property, defaultValue, req, res);
  }

  if (required && (res.error || res.locals[property] == undefined))
  {
    console.log(res.error);
    return null;
    //anything else?
  }
  return res.locals[property];
}
export async function getGuildPropertyConverted(property, guild, defaultValue, required) //this version will return the channel/role object itself
{
  var req = await getFakeReq(guild);
  var res = {locals:{}};
  await loadGuildProperty(property, required)(req, res, () => {});

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
  if (property == "ruleChannelID" && isCommunityGuild(guild)) //special case
  {
    return await guild.rulesChannel;
  }
  if (property.endsWith("ChannelID"))
  {
    property = property.replace("ChannelID", "Channel");
  }
  if (property.endsWith("RoleID"))
  {
    property = property.replace("RoleID", "Role");
  }
  if (property.endsWith("CategoryID"))
  {
    property = property.replace("CategoryID", "Category");
  }
  if (property.endsWith("SheetID"))
  {
    property = property.replace("SheetID", "Sheet");
    return GUILD_CACHE[property];
  }

  return res.locals[property];
}
export async function setGuildProperty(guild, property, value)
{
  var res = {locals:{}};
  await saveGuildProperty(property, value, await getFakeReq(guild), res);
}

export async function saveGuildProperty(property, value, req, res)
{
  if (value == "true") value = true;
  if (value == "false") value = false;
  var toSave = {};
  toSave[property] = value;
  await req.guildDocument.update(toSave);
  req[property] = value;
  GUILD_CACHE[req.guild.id][property] = value;

  if (property == "ruleChannelID" && isCommunityGuild(req.guild)) //special case
  {
    var client = getClient();
    var channel = await client.channels.fetch(req[property]);
    await req.guild.setRulesChannel(channel);
  }

  await loadGuildProperty(property, false)(req, res, () => {});
}

export async function deleteGuildProperty(guild, property)
{
  var guildDocument = await getGuildDocument(guild.id);
  var toUpdate = {};
  toUpdate[property] = admin.firestore.FieldValue.delete();
  await guildDocument.update(toUpdate);
  delete GUILD_CACHE[guild.id][property];
}

//a series of functions to auto-fill the settings of the server. Ideally will work perfectly if done on the server template
//these functions will modify the actual server config if the guess finds something and it was null
export async function guessConfigurationValues(guild, save)
{
  console.log(`Guessing guild ${guild.name} configuration values...`);
  await Promise.all(Object.keys(guessConfiguration).map( async (property) => 
  { 
    await guessConfigurationValue(guild, property, false, save);
  }));
}
export async function guessConfigurationValue(guild, property, convert, save)
{
  var guessInfo = guessConfiguration[property];
  if (guessInfo.type == "channel")
  {
    return await guessChannel(guild, property, guessInfo.name, convert, save);
  }
  else if (guessInfo.type == "category")
  {
    return await guessChannel(guild, property, guessInfo.name, convert, save);
  }
  else if (guessInfo.type == "role")
  {
    return await guessRole(guild, property, guessInfo.name, convert, save);
  }
}
async function guessChannel(guild, property, guess, convert, save) //guess should match the template
{
  console.log("guess channel",property);
  var stored = await getGuildProperty(property, guild);
  if (stored) {
    console.log(`guess for ${property} didn't need to happen, it was already set ${stored}`);
    if (convert)
      return await getGuildPropertyConverted(property, guild);
    else
      return stored;
  }
  
  var guessedChannel = await guild.channels.cache.find(c => stripEmoji(c.name) === guess);
  console.log(`guess for ${property} found ${guessedChannel?.id ?? "NOTHING"}`);

  if (guessedChannel && save)
  {
    await setGuildProperty(guild, property, guessedChannel.id);
  }

  if (convert)
    return guessedChannel;
  else
    return guessedChannel?.id;
}
async function guessRole(guild, property, guess, convert, save) //guess should match the template
{
  console.log("guess role",property);
  var stored = await getGuildProperty(property, guild);
  if (stored) {
    console.log(`guess for ${property} didn't need to happen, it was already set ${stored}`);
    if (convert)
      return await getGuildPropertyConverted(property, guild);
    else
      return stored;
  }
  
  var guessedRole = await guild.roles.cache.find(c => c.name === guess);
  console.log(`guess for ${property} found ${guessedRole?.id ?? "NOTHING"}`);

  if (guessedRole && save)
  {
    await setGuildProperty(guild, property, guessedRole.id);
  }

  if (convert)
    return guessedRole;
  else
    return guessedRole?.id;
}

//TODO: this will need a refresh button or a detect that a member role has changed
export async function init_admin_users(guild)
{
  //console.log(`init_admin_users ${guild.name}`);
  var adminRole = await getGuildPropertyConverted("adminRoleID", guild);
  if (adminRole)
  {
    //console.log(guild.name);
    GUILD_CACHE[guild.id].admins = adminRole.members.map(m=>m.user.id);
    //console.log(GUILD_CACHE[guild.id].admins);
  }
}

async function getFakeReq(guild)
{
  var req = {
    guild: guild,
    guildDocument: await await getGuildDocument(guild.id),
    query:{}
  }
  return req;
}

export async function hasFeature(guild, feature, defaultValue)
{
  return await getGuildProperty("feature_"+feature, guild, defaultValue ?? false);
}

export async function setBotNickname(guild, nickname)
{
  console.log("Setting Bot Nickname", nickname, "...");
  return await (await getBotMemberForGuild(guild)).setNickname(nickname);
}
export async function getBotMemberForGuild(guild)
{
  var client = getClient();
  return await guild.members.cache.get(client.user.id);
}
export function isCommunityGuild(guild) {
  return guild.features?.includes('COMMUNITY');
}