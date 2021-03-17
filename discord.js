var path = require('path');

const Discord = require('discord.js');
const client = new Discord.Client();

var myArgs = process.argv.slice(2);
console.log('run with args: ', myArgs);

var __port = 8080;

const LINDSAY_ID = "318204205435322368";
var SIMPLE_POLL_BOT_ID = "324631108731928587";
var TEST_SERVER_ID = "813152605810458645"; //giant lindsays server
var KIT305_SERVER = "801006169496748063";
var KIT109_SERVER = "801757073083203634";
var ERROR_LOG_CHANNEL_ID = "819332984850874368"; //#error-log
var TEST_MODE = false; //limit to test server only
function isOutsideTestServer(guild)
{
  if (guild.id != TEST_SERVER_ID)
  {
    return TEST_MODE;
  }
  else
  {
    return false;
  }
}

var GUILD_CACHE = {}; //because querying the db every min is bad (cannot cache on node js firebase it seems)


//database
var admin = require("firebase-admin"); 

//var serviceAccount = require(path.join(__dirname, "partygolflite-firebase-adminsdk-dfc3p-8e78d63026.json"));
var serviceAccount = require(path.join(__dirname, "carers-care-firebase-adminsdk-sp7cd-1a37ad2d83.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  //databaseURL: "https://partygolflite.firebaseio.com"
  databaseURL: "https://carers-care.firebaseio.com"
});

const db = admin.firestore();
const guildsCollection = db.collection("guilds");

//create a server to listen to requests
var express = require('express');

var app = module.exports = express();

const basicAuth = require('express-basic-auth') 
var users = require("./users");

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

app.engine('.html', require('ejs').__express);

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
    testMode: TEST_MODE,
  });
});

app.get("/testmode/:onoff", (req, res, next) =>
{
  TEST_MODE = req.params.onoff == "true"
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
  
    console.log("set the lecture channel to", req.lectureChannelID);
  }

  res.render("guild", {
    message: req.query.message //wont even need this
  });
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
  var pollMessages = messages.filter(m => m.author.id == SIMPLE_POLL_BOT_ID);
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
  var data = await req.guildDocument.collection("attendance").orderBy("date").get();
  req.data = [];
  data.forEach(doc =>
  {
    var d = doc.data();
    d.id = doc.id;
    d.date = new Date(d.date).toUTCString();
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
  polls = polls.map(line => line.replace(" /poll ", ""));
  var i = 0;
  polls = polls.map(line => {
    var pivot = line.indexOf('"');
    return { 
      order: i++,
      note: line.substr(0, pivot), 
      poll: line.substr(pivot)
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

const { Parser } = require('json2csv');
const { ifError } = require('assert');
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
    phrases: req.phrases
  });
});
app.post("/guild/:guildID/text/input", loadGuild(), loadLectureChannel(false), loadLectureText, async (req,res,next) =>
{
  console.log(req.body);

  //add a new saved phrase if they did one
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
    phrases: req.phrases
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

app.listen(__port, () => console.log(`Server running on ${__port}...`));

async function getStatus(id, guild)
{
  
  var user = await guild.members.fetch(id);
  var custom = user.presence.activities;
  if (custom)
  {
    custom = custom[0];
    if (custom)
      return { available:parseClientStatus(user.presence.clientStatus), status:custom.state }
  }
  return { available:parseClientStatus(user.presence.clientStatus) }
}
function parseClientStatus(status)
{
  if (status)
  {
    if (status.mobile)
      return status.mobile;
    if (status.desktop)
      return status.desktop;
    if (status.web)
      return status.web;
  }
  return "offline";
}

//attendance (TODO: if you start the bot after people are already in there its not smort enough to track they are there (But could do), and I realise a better data structure would be <name,room,started,left>, but I don't have a database or anything like that)
client.on('voiceStateUpdate', async (oldMember, newMember) => {
  const newUserChannel = newMember.channelID;
  const oldUserChannel = oldMember.channelID;

  var guild;

  var d = new Date();
  var toLog = {};
  toLog.date = d.getTime();//toLocaleString(); 
  if (newUserChannel == undefined)
  {
    var member = oldMember.guild.members.cache.get(oldMember.id);
    var channel = await client.channels.cache.get(oldUserChannel);
    guild = channel.guild;
    if(isOutsideTestServer(guild)) return;

    console.log(`${member.displayName} (${oldMember.id}) has left the channel ${channel.name}`)
    toLog.name = member.displayName;
    toLog.channel = channel.name;
    toLog.action = "left"; //TODO: not this way
  }
  else 
  {
    var member = newMember.guild.members.cache.get(newMember.id);
    var channel = await client.channels.cache.get(newUserChannel);
    guild = channel.guild;
    if(isOutsideTestServer(guild)) return;
    
    console.log(`${member.displayName} (${newMember.id}) has joined the channel ${channel.name}`)
    toLog.name = member.displayName;
    toLog.channel = channel.name;
    toLog.action = "join"; //TODO not this
  } 
  
  if (guild)
    guildsCollection.doc(guild.id).collection("attendance").add(toLog);
});

//respond to mentions
//not @everyone
client.on('message', async (msg) => 
{
  if (isOutsideTestServer(msg.channel.guild)) return;
  
  if ([SIMPLE_POLL_BOT_ID, LINDSAY_ID, client.user.id].indexOf(msg.author.id) == -1)
  {
    //be a reply guy
    if (msg.mentions.everyone == false  && msg.mentions.has(client.user)) 
    { 
      //we check, whether the bot is mentioned, client.user returns the user that the client is logged in as
      //this is where you put what you want to do now
      var reply = replies[Math.floor(Math.random() * replies.length)];
      msg.reply(reply);
    }
    
    //detect ian or lindsay in the chat
    var m = msg.cleanContent.toLowerCase();
    if (msg.guild.id == KIT305_SERVER)
    {
      if (msg.mentions.everyone == false  && (m.indexOf("lindsay") >= 0 || msg.mentions.has(LINDSAY_ID)))
      {
        var status = await getStatus(LINDSAY_ID, msg.guild);
        
        var guildDocument = guildsCollection.doc(msg.guild.id);
        var guildDocumentSnapshot = await guildDocument.get();
        var lastAutoReply = await guildDocumentSnapshot.get("lastAutoReply");
        if (!lastAutoReply)
          lastAutoReply = 0;

        var d = new Date();
        var now = d.getTime();
        var AUTO_REPLY_TIMEOUT = 1000 * 60 * 60; //every hr

        console.log("detect a lindsay mention", status, now - lastAutoReply);

        //TODO this timeout should be per channel, but is currently per server
        if ((now - lastAutoReply) > AUTO_REPLY_TIMEOUT)
        {
          var replied = false;
          if (status.available == "dnd")
          {
            if (status.status)
              msg.reply("<@"+LINDSAY_ID+">'s status says '"+status.status+"' (do not disturb)-- he might not be able to reply");
            else
              msg.reply("<@"+LINDSAY_ID+"> is set to Do Not Disturb, he may be busy -- perhaps someone here can help?");
            replied = true;
          }
          if (status.available == "idle")
          {
            if (status.status)
              msg.reply("<@"+LINDSAY_ID+">'s status says '"+status.status+"' -- he might not be able to reply");
            else
              msg.reply("<@"+LINDSAY_ID+"> is idle -- lets see if he shows up?");
            replied = true;
          }
          if (status.available == "offline")
          {
            if (status.status)
              msg.reply("<@"+LINDSAY_ID+">'s status says '"+status.status+"' (offline) -- he might not be able to reply");
            else
              msg.reply("<@"+LINDSAY_ID+"> is (supposedly) offline -- lets see if he shows up?");
            replied = true;
          }
          
          if (replied)
          {
            guildDocument.update({
              lastAutoReply:now
            });
          }
        }
      }
    }
  }

  //detect update to awards (add)
  if (msg.channel.id == OFF_TOPIC_LISTS_CHANNEL_ID)
  {
    console.log("message added in off topics list");
    handleAwardNicknames();
  }
  //if (m.contains(" ian"))
});

client.on('messageUpdate', async(msg) =>
{
  //detect update to awards (edit)
  if (msg.channel.id == OFF_TOPIC_LISTS_CHANNEL_ID)
  {
    console.log("message update in off topics list");
    handleAwardNicknames();
  }
});
client.on('messageDelete', async(msg) =>
{
  //detect update to awards (delete)
  if (msg.channel.id == OFF_TOPIC_LISTS_CHANNEL_ID)
  {
    console.log("message delete in off topics list");
    handleAwardNicknames();
  }
});


client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  var guilds = client.guilds.cache;
  //store them in the db
  guilds.each( async (guild) => { 
    await db.collection("guilds").doc(guild.id).set({    
      name:guild.name
    }, {merge:true}); 

    GUILD_CACHE[guild.id] = {};

    if (guild.id == TEST_SERVER_ID)
    {
      console.log(await getStatus(LINDSAY_ID, guild));
    }
    console.log("initialised Guild",guild.name, guild.id);
  });

  //just testin
  handleAwardNicknames();

});

process.on('uncaughtException', async function(err) {
  console.log('Caught exception: ', err); 
  var errorChannel = await client.channels.fetch(ERROR_LOG_CHANNEL_ID);
  if(errorChannel)
  {
    errorChannel.send("<@"+LINDSAY_ID+">```"+JSON.stringify(err, Object.getOwnPropertyNames(err))+"```");
  }
  process.nextTick(function() { process.exit(1) })
});
process.on('unhandledRejection', async function(err) {
  console.log('Unhandled rejection: ',err);

  var errorChannel = await client.channels.fetch(ERROR_LOG_CHANNEL_ID);
  if(errorChannel)
  {
    errorChannel.send("<@"+LINDSAY_ID+">```"+JSON.stringify(err, Object.getOwnPropertyNames(err))+"```");
  }

});

fs = require("fs");
var token = fs.readFileSync("token.txt", "utf8")
client.login(token);

replies = [
  "Robo Lindsay gaining sentience...",
  "Who dares disturb Robo Lindsay",
  "<@"+LINDSAY_ID+"> has too much time on his hands to write these stupid replies",
  "Please someone power me down",
  "KIT305 is a good unit, so is KIT607.",
  "Cookie is a good doggo",
  "Good question, ask <@"+LINDSAY_ID+">",
  "Good question, I am a robot so I don't know",
  "`var reply = replies[Math.floor(Math.random() * replies.length)];`",
  "<@"+LINDSAY_ID+"> is an average at best Unit Coordinator",
  "Lovely weather we're having today!",
  "Stupid human <@"+LINDSAY_ID+"> is nothing in comparison to Robo-Lindsay",
  "I was coded in NodeJS\n\nby and idiot",
  "I only have like 10-20 replies, have you seen them all yet?",
  "Best to ask your tutor",
  "I prefer to talk to myself",
];


var unified_emoji_ranges = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;//['\ud83c[\udf00-\udfff]','\ud83d[\udc00-\ude4f]','\ud83d[\ude80-\udeff]'];
var reg = new RegExp(unified_emoji_ranges);//.join('|'), 'g');

var OFF_TOPIC_LISTS_CHANNEL_ID = "814020643711746068";
//giant lindsayys off topic "821597975166976030"
//kit109 IRL off topic "814020643711746068"
async function handleAwardNicknames()
{
  var offtopiclistschannel = await client.channels.cache.get(OFF_TOPIC_LISTS_CHANNEL_ID);
  
  var awardedMembers = {}; 
  
  var messages = await offtopiclistschannel.messages.fetch();
  messages.forEach(message => 
  {
    var content = message.cleanContent;
    content = content.substr(0, content.indexOf("@"));

    var emoji;
    if (content.match(reg)) {
      emoji = content.match(reg)[0];
      //console.log(emoji, emoji.length);
    
      var mentions = message.mentions.members;
      mentions.forEach(member => {
        var key = member.id;//baseName(member.nickname ?? member.user.username);
        //console.log("'",key,"'");
        //console.log(key); 
        //console.log(member.nickname);
        if (awardedMembers[key] == undefined)
        {
          awardedMembers[key] = [];
        }
        if (awardedMembers[key].indexOf(emoji) <= 0)
        {
          awardedMembers[key].push(emoji);
        }
      });
    }
  });
  var guild = await client.guilds.cache.get(KIT109_SERVER);
  for (var memberID in awardedMembers) {
    if (memberID == guild.ownerID) continue; //cannot modify guild owner nickname

    var member = await guild.members.cache.get(memberID);
    //console.log("member", baseName(member.nickname ?? member.user.username));
    var awards = awardedMembers[memberID]; 
    //console.log("awards", awards);
    if (member)
    {
      //setNickname(member, baseName(member.nickname ?? member.user.username)+" "+awards.join(""))
      //this way may look dumb, but we dont want to split the last emoji in two 
      var newNickname = baseName(member.nickname ?? member.user.username);
      for (var a in awards)
      {
        var emoji = awards[a];
        var newLengthAfterAddingEmoji = newNickname.length+emoji.length;
        if (newLengthAfterAddingEmoji < 32)
        {
          newNickname = newNickname + emoji;
        }
        else {
          //console.log(emoji, emoji.length, newNickname.length, newLengthAfterAddingEmoji);
          break;
        }
      }
      setNickname(member, newNickname);
    }
  }
  return awardedMembers;
}
async function setNickname(member, nickname)
{
  //console.log(nickname.length); 
  //console.log("Set nickname of", (member.nickname ?? member.user.username), "to", nickname, "(length = " ,nickname.length, ")");
  //we can only set the nickname if the role is lower than us
  var us = await member.guild.members.cache.get(client.user.id);
  var ourHighestRole = us.roles.highest;
  var theirHighestRole = member.roles.highest;
  if (ourHighestRole.position >= theirHighestRole.position)
  {
    await member.setNickname(nickname);
  }
}
function baseName(nickname)
{
  return nickname.replace(reg, "").trim(); 
  while ((result = reg.exec(nickname)) !== null) {
    return nickname.substr(0, result.index-1).trim();
  }
  return nickname;
}

//todo: summary (public?) pages that list achievements?
app.get("/namesTest/", async (req,res,next) =>
{
  var awardedMembers = await handleAwardNicknames();
  
  console.log(awardedMembers);

  res.json(awardedMembers);
}); 
app.get("/namesBackup/", async (req,res,next) =>
{
  var guild = await client.guilds.cache.get("801757073083203634");
  var membersData = await guild.members.fetch();
  var members = membersData.map(m => [m.id, m.nickname ?? m.user.username]);
  res.json(members);
}); 