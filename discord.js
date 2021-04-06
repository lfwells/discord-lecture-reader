import path from 'path';
const __dirname = path.resolve(); //todo put in export

import client from './core/client.js';

var myArgs = process.argv.slice(2);
console.log('run with args: ', myArgs);

import * as config from './core/config.js'; 


var GUILD_CACHE = {}; //because querying the db every min is bad (cannot cache on node js firebase it seems)s

//database
import { db, guildsCollection } from "./core/database.js";

//create a server to listen to requests
import express  from 'express';

var app = express();

import basicAuth from 'express-basic-auth';
import users from "./users.js";

app.use(function(req, res, next) {
  if (
    req.path.indexOf("/text/") > 0 || 
    req.path.endsWith("/text/latest/") || 
    req.path.indexOf("/poll/") > 0 || 
    req.path.endsWith(".js") || 
    req.path.endsWith(".css") || 
    req.path.endsWith(".ico")|| 
    req.path.indexOf("/static/") === 0) {
    //console.log("skipping auth to allow polls to work", req.path);
    next();
  } else {
    //console.log("challenge:", req.path);
    basicAuth(users)(req, res, next);
  }
});
/*app.use())*/

app.use(express.json());
app.use(express.urlencoded({extended:true}));
var previousRequest;

import ejs from 'ejs';
app.engine('.html', ejs.__express);

// Optional since express defaults to CWD/views
app.set('views', path.join(__dirname, 'views')); 
app.set('view engine', 'html');
app.use('/static', express.static(path.join(__dirname, 'www')))
app.use(function(req, res, next) {
  res.locals.query = req.query;
  res.locals.params = req.params;
  res.locals.url   = req.originalUrl;
  res.locals.body   = req.body;
  next();
});

//use this handie little tool to allow question marks in poll urls
function removeQuestionMark(req, res, next)
{
  console.log("index of q", req.originalUrl.indexOf("?"));
  if (req.originalUrl.indexOf("?") > 0)
  {
    res.redirect(req.originalUrl.replace("?", "%3F"));
  }
  else
    next();
}

function redirectToMainPage(req,res, message){
  res.redirect("/guild/"+req.params.guildID+"/?message="+message);
}
function redirectToWhereWeCameFrom(req,res,message) {
  res.redirect(req.headers.referer+"?message="+message);
}


import { isOutsideTestServer } from './core/utils.js';
//TODO: these two need to return error if not authed or wrong id
function loadGuild() {
  return async function(req, res, next)
  {
    var guildID = req.params.guildID;
    req.guild = await client.guilds.fetch(guildID);
    req.guildDocument = await guildsCollection.doc(guildID);

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
function loadLectureChannel(required)  
{
  return async function(req,res,next)  
  {
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

//home page (select guild)
app.get("/", (req, res) =>
{
  res.render('guildList', {
    guilds: client.guilds.cache.filter(g => !isOutsideTestServer(g)),
    testMode: config.TEST_MODE,
  });
});

app.get("/testmode/:onoff", (req, res, next) =>
{
  config.TEST_MODE = req.params.onoff == "true"
  res.redirect("/");
}) 

//guild home page (dashboard)
app.get("/guild/:guildID/", loadGuild(), loadLectureChannel(false), async (req, res) => 
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

  res.render("guild");
});

app.listen(config.__port, () => console.log(`Server running on ${config.__port}...`));





import init_award_events from './awards/events.js';
import init_responder_events from './responder/events.js';
import init_attendance_events from './attendance/events.js';
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

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

  //just testin
  init_award_events(client);
  init_responder_events(client);
  init_attendance_events(client);
});

import init_routes from './core/routes.js';
init_routes(app);

import * as errors from './core/errors.js';


import token from './core/token.js';
client.login(token);