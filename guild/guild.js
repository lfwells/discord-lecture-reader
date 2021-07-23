import * as config from '../core/config.js'; 
import { db, guildsCollection } from "../core/database.js";
import { getStatus, isOutsideTestServer } from "../core/utils.js";
import { init_invites } from "../invite/invite.js";

import { getClient } from "../core/client.js";

var GUILD_CACHE = {}; //because querying the db every min is bad (cannot cache on node js firebase it seems)s
export function getGuildCache() { return GUILD_CACHE; }

export async function init(client)
{
  var guilds = client.guilds.cache;
  //store them in the db
  guilds.each( async (guild) => { 
    await db.collection("guilds").doc(guild.id).set({    
      name:guild.name
    }, {merge:true}); 

    GUILD_CACHE[guild.id] = {};

    if (guild.id == config.TEST_SERVER_ID)
    {
      console.log(await getStatus(config.LINDSAY_ID, guild));
    }
    console.log("initialised Guild",guild.name, guild.id);
  });

  init_invites(client);
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

  export function getGuildDocument(guildID)
  {
    return guildsCollection.doc(guildID);
  }

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
    