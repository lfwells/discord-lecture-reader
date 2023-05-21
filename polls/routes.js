import moment from "moment";
import { loadAllMessagesForChannel } from "../analytics/analytics.js";
import { send } from "../core/client.js";
import * as config from "../core/config.js";
import { redirectToWhereWeCameFrom } from "../core/utils.js";

import { getGuildProperty, GUILD_CACHE } from "../guild/guild.js";
import { doPollCommand } from "./events.js";
var previousRequest;

//poll display details
//TODO: this not really poll discord constantly if we can avoid
export async function load(req,res,next)
{
  var messagesManager = req.lectureChannel.messages;
  var messages = await messagesManager.fetch();//TODO need more than just the 100 most recent messages, is possible poll could be lost, so we need to search more, also uncertain if this uses cache or not
  
  var latestClearMessage = messages.filter(m => m.content.startsWith("/clearpoll")).first(); 
  //var latestClearPoll = parseInt(await req.guildDocumentSnapshot.get("latestClearPoll"));
  var latestClearPoll = GUILD_CACHE[req.guild.id].latestClearPoll;
  var simplePollMessages = messages.filter(m => m.author.id == config.SIMPLE_POLL_BOT_ID); 
  //console.log(pollMessages);
  //console.log(`${pollMessages.size} poll messages`);
  var latestSimplePoll = simplePollMessages.first();
  var latestSimplePollTimestamp = latestSimplePoll ? latestSimplePoll.createdTimestamp : 0;

  var latestRoboLindsPoll = await getGuildProperty("latestRoboLindsPoll", req.guild, null);//GUILD_CACHE[req.guild.id].latestRoboLindsPoll;
  var latestRoboLindsPollTimestamp = await getGuildProperty("latestRoboLindsPollTimestamp", req.guild, null);//GUILD_CACHE[req.guild.id].latestRoboLindsPollTimestamp;
  if (latestRoboLindsPoll && latestSimplePoll)
  {
    if (latestRoboLindsPollTimestamp > latestSimplePollTimestamp)
    {
      latestSimplePoll = null;
    }
    else if (latestRoboLindsPollTimestamp <= latestSimplePollTimestamp)
    {
      latestRoboLindsPoll = null;
    }
  }

  if (latestSimplePoll)
  { 
    if (latestClearPoll && latestSimplePoll.createdTimestamp < latestClearPoll) 
    {
      //console.log("latest pool was before most recent clearpoll");
      res.end("");
      return;
    }
    if (latestClearMessage && latestSimplePoll.createdTimestamp < latestClearMessage.createdTimestamp) 
    {
      //console.log("latest pool was before most recent clearpoll message");
      res.end("");
      return;
    }
    
    var pollInfo = await readSimplePoll(latestSimplePoll);
    req.results = pollInfo.results;
    req.mostVotes = pollInfo.mostVotes;
    req.question = pollInfo.question;
    req.oneVoteSize = pollInfo.oneVoteSize;
  }
  else if (latestRoboLindsPoll)
  {
    //console.log(latestRoboLindsPoll.fields[0].value.replace("votes", "").replace("vote", "").trim());
    if (latestClearPoll && latestRoboLindsPollTimestamp < latestClearPoll) 
    {
      //console.log("latest pool was before most recent clearpoll");
      res.end("");
      return;
    }
    if (latestClearMessage && latestRoboLindsPollTimestamp < latestClearMessage.createdTimestamp) 
    {
      //console.log("latest pool was before most recent clearpoll message");
      res.end("");
      return;
    }

    var p = latestRoboLindsPoll;
    p = JSON.parse(p);
    var pollInfo = await readRoboLindsayPoll(p);
    req.results = pollInfo.results;
    req.mostVotes = pollInfo.mostVotes;
    req.question = pollInfo.question;
    req.oneVoteSize = pollInfo.oneVoteSize;
  }
  next();
} 

async function readSimplePoll(post)
{
  var req = {};
  var question = post.content;
  question = question.replace("**", "");
  question = question.replace(":bar_chart: ", "");
  question = question.replace("**", "");

  //display question
  req.question = "Poll: "+question+"\n";

  //display graph (TODO: right align?)
  var results = [];
  if (post.embeds.length == 0) //yes/no poll
  {
    results.push({ answer:"Yes" });
    results.push({ answer:"No" });
  }
  else
  {
    var embeds = post.embeds[0];
    if (!embeds) {
      res.end("");
      return;
    }
  
    var description = embeds.description.split("\n");
    var longestOption = 0;
    for (var i = 0; i < description.length; i++)
    {
      if (description[i] == "") break;
      var option = description[i].substr(3);
      longestOption = Math.max(longestOption, option.length);
      results.push({ answer: option });
    }
  }

  var reactions = post.reactions.cache;
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
  req.oneVoteSize = config.DEFAULT_VOTE_SIZE_OBS;
  //console.log(results);

  return req;
}
async function readRoboLindsayPoll(post)
{  
  var req = {};
  var question = post.title;
  console.log({post});
  //display question
  req.question = "Poll: "+question+"\n";

  var numberPattern = /\d+/g;
  req.results = post.fields.map(f => ( {
    answer: f.name,
    votes: parseInt(f.value.match( numberPattern ))
  }));
  
  var i = 0;
  var mostVotes = 0;
  for (let i = 0; i < req.results.length; i++) {
    mostVotes = Math.max(mostVotes, req.results[i].votes);
  }
  req.mostVotes = mostVotes;
  req.oneVoteSize = config.DEFAULT_VOTE_SIZE_OBS;

  return req;
}

export async function obs(req, res)
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
}

export async function pollData(req, res) 
{
  if (req.question == undefined)
  {
    res.end("");
    return;
  }
  var maxVoteWidth = 20;
  var oneVoteSize = config.DEFAULT_VOTE_SIZE_OBS;
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
}

export async function postPoll(req, res) 
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
  var message = await send(req.lectureChannel, pollText);
  message.delete();

  //show web page
  res.end(`Poll ${pollText} sent to ${req.lectureChannel.name}`);
}
export async function postPollRoboLinds(req, res) //legacy, powerpoint version
{
  await postPollRoboLindsInternal(req,res,null);
}
export async function postPollRoboLindsWebInterface(req,res)
{
  await postPollRoboLindsInternal(req,res,true);
}
async function postPollRoboLindsInternal(req,res,webInterface)
{
  var pollText = req.params.pollText;

  pollText = pollText.replace("/poll ", "");
  pollText = pollText.replace("%2Fpoll ", "");
  
  //turn it into a simple poll command
  console.log("post poll",pollText);

  //ward off evil powerpoint duplicate requests
  if (pollText == previousRequest && webInterface == null) 
  {  
    res.end();
    return; 
  }
  previousRequest = pollText;

  var myRegexp = /[^\s"]+|"([^"]*)"/gi;
  var myString = pollText;
  var myArray = [];

  do {
      //Each call to exec returns the next regex match as an array
      var match = myRegexp.exec(myString);
      if (match != null)
      {
          //Index 1 in the array is the captured group if it exists
          //Index 0 is the matched text, which we use if no captured group exists
          myArray.push(match[1] ? match[1] : match[0]);
      }
  } while (match != null);
  console.log(myArray);

  //send the message on discord
  
  var post = await send(req.lectureChannel, {embeds:[{title:"Loading..."}]});
  await doPollCommand(post, {
    question: myArray[0],
    options: myArray.slice(1),
    multi_vote: true, //TODO: get ALL of these from the json
    allow_undo: true,
    poll_emoji: "█",
    restrict_see_results_button: false,
    authorID: req.query.authorID ?? "" //TODO: get this from the logged in discordID
  });
  
  //show web page
  res.end(`Poll ${pollText} sent to ${req.lectureChannel.name}`);
}

export async function clearPoll(req, res) 
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
}

export async function pollHistory(req,res,next)
{
  //var messagesManager = req.lectureChannel.messages;
  //var messages = await messagesManager.fetch();//TODO need more than just the 100 most recent messages, is possible poll could be lost, so we need to search more, also uncertain if this uses cache or not
  var messages = await loadAllMessagesForChannel(req.lectureChannel);
  console.log(messages[0]);
  
  var polls = [];

  var roboLindsayMessages = messages.filter(m => m.author.id == config.ROBO_LINDSAY_ID); 
  await Promise.all(roboLindsayMessages.map( async (post) => 
  {
    //if (post.interaction && post.interaction.commandName == config.POLL_COMMAND)
    if (post.embeds && post.embeds.length > 0)
    {
      try 
      {
        if (post.interaction && post.interaction.commandName == config.POLL_COMMAND)
        {
          var p = await readRoboLindsayPoll(post.embeds[0]);
          p.timestamp = moment(post.createdTimestamp);
          polls.push(p);
        }
      }
      catch (e) { console.error(e); }
    }
  }));

  var simplePollMessages = messages.filter(m => m.author.id == config.SIMPLE_POLL_BOT_ID); 
  
  await Promise.all(simplePollMessages.map( async (post) => 
  {
    polls.push(await readSimplePoll(post));
  }));
  res.render("poll_history", {
    polls: polls
  });
}