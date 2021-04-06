import path from 'path';
const __dirname = path.resolve(); //todo put in export

import client from './core/client.js';

var myArgs = process.argv.slice(2);
console.log('run with args: ', myArgs);

import * as config from './core/config.js'; 


var GUILD_CACHE = {}; //because querying the db every min is bad (cannot cache on node js firebase it seems)

//import * as emoji from 'emoji.json'; //TODO work out how to import this, read their github
var emoji = [];

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

//poll display details
//TODO: this not really poll discord constantly if we can avoid
async function loadPoll(req,res,next)
{
  var messagesManager = req.lectureChannel.messages;
  var messages = await messagesManager.fetch();//get 100 most recent messages, is possible poll could be lost, so we need to search more, also uncertain if this uses cache or not
  
  var latestClearMessage = messages.filter(m => m.content.startsWith("/clearpoll")).first(); 
  //var latestClearPoll = parseInt(await req.guildDocumentSnapshot.get("latestClearPoll"));
  var latestClearPoll = GUILD_CACHE[req.guild.id].latestClearPoll;
  var pollMessages = messages.filter(m => m.author.id == config.SIMPLE_POLL_BOT_ID);
  //console.log(pollMessages);
  //console.log(`${pollMessages.size} poll messages`);
  var latestPoll = pollMessages.first();
  if (latestPoll)
  { 
    if (latestClearPoll && latestPoll.createdTimestamp < latestClearPoll) 
    {
      //console.log("latest pool was before most recent clearpoll");
      res.end("");
      return;
    }
    if (latestClearMessage && latestPoll.createdTimestamp < latestClearMessage.createdTimestamp) 
    {
      //console.log("latest pool was before most recent clearpoll message");
      res.end("");
      return;
    }

    var question = latestPoll.content;
    question = question.replace("**", "");
    question = question.replace(":bar_chart: ", "");
    question = question.replace("**", "");

    //display question
    req.question = "Poll: "+question+"\n";

    //display graph (TODO: right align?)
    var results = [];
    if (latestPoll.embeds.length == 0) //yes/no poll
    {
      results.push({ answer:"Yes" });
      results.push({ answer:"No" });
    }
    else
    {
      var embeds = latestPoll.embeds[0];
      if (!embeds) {
        res.end("");
        return;
      }
    
      description = embeds.description.split("\n");
      var longestOption = 0;
      for (var i = 0; i < description.length; i++)
      {
        if (description[i] == "") break;
        var option = description[i].substr(3);
        longestOption = Math.max(longestOption, option.length);
        results.push({ answer: option });
      }
    }

    var reactions = latestPoll.reactions.cache;
    var i = 0;
    var mostVotes = 0;
    reactions.each((data,key) => {
      var votes = parseInt(data.count)-1;
      if (results[i])
      {
        results[i].votes = votes; //Math.floor(Math.random() * 500);
        mostVotes = Math.max(mostVotes, results[i].votes);
      }
      i++;
    });
    req.results = results;
    req.mostVotes = mostVotes;
    //console.log(results);
  }
  next();
} 
app.get("/guild/:guildID/poll/", loadGuild(), loadLectureChannel(true), loadPoll, async (req, res) =>
{
  if (req.question == undefined)
  {
    res.end("");
    return;
  }

  //display the output
  res.render("poll", {
    question: req.question,
  });
});
app.get("/guild/:guildID/poll/data/", loadGuild(), loadLectureChannel(true), loadPoll, async (req, res) =>
{
  if (req.question == undefined)
  {
    res.end("");
    return;
  }
  var maxVoteWidth = 20;
  var defaultOneVoteSize = 10;//TODO: configure land
  var oneVoteSize = defaultOneVoteSize;
  if (req.mostVotes > maxVoteWidth)
  {
    var ratio = req.mostVotes / maxVoteWidth; //e.g. 40/20 = 2
    oneVoteSize /= ratio;
  }
  res.render("pollTable", {
    question: req.question,
    results: req.results,
    mostVotes: req.mostVotes,
    oneVoteSize: oneVoteSize,
  })
});

//send poll (uses get, so that we can do the cool powerpoint links)
app.get("/guild/:guildID/poll/:pollText/", removeQuestionMark, loadGuild(), loadLectureChannel(true), async (req, res) => 
{
  var pollText = req.params.pollText;
  
  //turn it into a simple poll command
  pollText = "/poll "+pollText;
  console.log("post poll",pollText);

  //ward off evil powerpoint duplicate requests
  if (pollText == previousRequest) 
  {  
    res.end();
    return; 
  }
  previousRequest = pollText;

  //send the message on discord
  var message = await req.lectureChannel.send(pollText);
  message.delete();

  //show web page
  res.end(`Poll ${pollText} sent to ${req.lectureChannel.name}`);
}); 
//clear a poll display (not implemented)
app.get("/guild/:guildID/clearpoll/", loadGuild(), loadLectureChannel(false), async (req, res) => 
{
  console.log("clear poll command");

  var d = new Date();
  await req.guildDocument.update({
    latestClearPoll: d.getTime()
  })
  GUILD_CACHE[req.guild.id].latestClearPoll = d.getTime();
  //old way 
  //await req.lectureChannel.send("/clearpoll");
  //res.end("Poll cleared, please close browser window yourself");
  return redirectToWhereWeCameFrom(req, res, "Poll Cleared!");
  //return redirectToMainPage(req, res, "Poll Cleared!");
});


//display attendance
async function getAttendanceData(req,res,next)
{
  var data = await req.guildDocument.collection("attendance").orderBy("joined").get();
  req.data = [];
  data.forEach(doc =>
  {
    var d = doc.data();
    d.id = doc.id;
    d.joined = new Date(d.joined).toUTCString();
    d.left = d.left ? new Date(d.left).toUTCString() : "";
    req.data.push(d);
  });
  next();
}
app.get("/guild/:guildID/attendance/", loadGuild(), getAttendanceData, async (req, res, next) => 
{
  //show web page
  res.render("attendance", {
    //guild:req.guild,
    data:req.data
  });
  next()
}); 

//scheduled polls
async function loadScheduledPolls(req,res,next) {
  req.pollCollection = req.guildDocument.collection("polls");
  req.pollsSnapshot = await req.pollCollection.orderBy("order", "asc").get();
  req.polls = [];
  req.pollsSnapshot.forEach(poll => req.polls.push(poll.data()));
  next();
}
app.get("/guild/:guildID/pollSchedule", loadGuild(), loadScheduledPolls, async (req,res,next) =>
{
  res.render("pollSchedule", {
    polls: req.polls
  });
});
app.post("/guild/:guildID/pollSchedule", loadGuild(), loadScheduledPolls, async (req,res,next) =>
{
  //TODO: preserver order :(
  var polls = req.body.polls;
  polls = polls.split("\r\n").filter(l => l.trim() != "");
  var i = 0;
  polls = polls.map(line => {
    var pivot = line.indexOf('/poll');
    return { 
      order: i++,
      note: line.substr(0, pivot).replace(" /poll ", "").trim(), 
      poll: line.substr(pivot).trim()
    };
  })
  
console.log("polls", polls);
  // Delete documents in a batch
  const batch = db.batch();
  req.pollsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  const addBatch = db.batch();
  polls.forEach((poll) => {
    var docRef = req.pollCollection.doc();
    addBatch.set(docRef, poll);
  });
  await addBatch.commit();

  res.render("pollSchedule", {
    polls: polls
  });
});

import Parser from 'json2csv';
import ifError from 'assert';
function downloadResource(filename) {
  return function(req, res, next) {
    const json2csv = new Parser({ fields:req.fields });
    const csv = json2csv.parse(req.data);
    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    return res.send(csv);
  }
}
app.get("/guild/:guildID/attendance/csv", loadGuild(), getAttendanceData, downloadResource("attendance.csv")); 

//full screen texts , TODO allow delete
var animations = ["scale", "horizontal", "vertical", "fade"];
var styles = ["arlina", "yikes", "dang", "rainbow"];
async function loadLectureText(req,res,next)
{
  req.textCollection = req.guildDocument.collection("lecture-text").doc("details");
  try {
    req.textCollectionSnapshot = await req.textCollection.get();
  
  req.textCollectionPhrases = req.guildDocument.collection("lecture-text");
  req.textCollectionPhrasesSnapshot = await req.textCollectionPhrases.orderBy("order").get();
  }
  catch {}

  var phrases = []
  if (req.textCollectionPhrasesSnapshot.empty == false)
  {
    req.textCollectionPhrasesSnapshot.forEach(doc  => {
      if (doc.id != "details") 
      {
        phrases.push(doc.data().phrase);
      }
    });
  }
  req.phrases = phrases;

  res.locals.animations = animations;
  res.locals.styles = styles;

  next();
}
//this is the obs page
app.get("/guild/:guildID/text/", loadGuild(), async (req,res,next) =>
{
  res.render("text/text");
}); 
//this is the page for triggering text
app.get("/guild/:guildID/text/input", loadGuild(), loadLectureChannel(false), loadLectureText, async (req,res,next) =>
{
  res.render("text/text_input", {
    phrases: req.phrases,
    emoji: emoji
  });
});
app.post("/guild/:guildID/text/input", loadGuild(), loadLectureChannel(false), loadLectureText, async (req,res,next) =>
{
  console.log(req.body);

  //add a new saved phrase if they did one
  if (req.body.customemoji) req.body.custom = req.body.customemoji;
  var newPhrase = req.body.custom;
  if (newPhrase)
  {
    await req.textCollectionPhrases.add({
      phrase: newPhrase,
      order: req.phrases.length
    });
    req.phrases.push(newPhrase);
    req.body.text = newPhrase;
  }

  if (req.body.robolindsay && req.body.robolindsay == "on")
  {
    await req.lectureChannel.send(req.body.text);
  }

  //trigger the db to have information
  await req.textCollection.set(req.body);
  GUILD_CACHE[req.guild.id].latestText = req.body;

  //back to the page
  req.query.message = "Posted '"+req.body.text+"'!"; 
  res.render("text/text_input", {
    phrases: req.phrases,
    emoji: emoji
  });
});
//the query to see the latest
app.get("/guild/:guildID/text/latest", loadGuild(), /*loadLectureText,*/ async (req,res,next) =>
{
  if (GUILD_CACHE[req.guild.id] && GUILD_CACHE[req.guild.id].latestText)
  {
    res.json(GUILD_CACHE[req.guild.id].latestText);
    GUILD_CACHE[req.guild.id].latestText = null;
    return;
  }
  else if (req.textCollectionSnapshot)
  {
    var data = req.textCollectionSnapshot.data();
    if (data)
    {
      console.log("found latest full screen text", data);
      res.json(data);

      //now immediately delete so it doesnt show again
      await req.textCollection.delete();
      return;
    }
  }
  //otherwise just empty data
  res.json({});
});
//grabbed with ajax on demand
app.get("/guild/:guildID/text/:style/", loadGuild(), async (req,res,next) =>
{
  if (req.params.style == "") 
  {
    res.end("");
    return;
  }
  if (!req.query.animation || req.query.animation == "random") 
  {
    req.query.animation = animations[Math.floor(Math.random() * animations.length)]; 
  }
  if (!req.query.duration)
  {
    req.query.duration = 2;
  }
  if (req.params.style == "random")
  {
    req.params.style = styles[Math.floor(Math.random() * styles.length)]; 
  }

  res.render("text/text_"+req.params.style, {
    animation:req.query.animation,
    duration:req.query.duration,
    inout:req.query.animation == "fade" ? 1 : 0.5
  });
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