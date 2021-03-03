const Discord = require('discord.js');
const client = new Discord.Client();

var myArgs = process.argv.slice(2);
console.log('run with args: ', myArgs);
if (myArgs.length < 2) return;

var rightAlign = myArgs.length > 2 && myArgs[2] == "right";

var port = 1090;
var host = "localhost";

fs = require('fs');

//clear old chat
fs.writeFile(myArgs[1]+'.txt', "Welcome to "+myArgs[1]+"!\n", function (err) {   
});
fs.writeFile('poll.txt', "", function (err) {   
});

//create a server to listen to requests
var http = require('http');
var previousRequest;
http.createServer(function (req, res) {
  var url = req.url;
  url = url.replace("/?", "");
  var pollText = decodeURI(url);

  if (pollText == previousRequest) 
  {  
    //show web page
    res.write(fs.readFileSync("scheduledPoll.html", "utf8"));
    res.end();
    return; //ward off evil powerpoint duplicate requests
  }
  previousRequest = pollText;

  console.log(pollText);
  
  res.writeHead(200, {'Content-Type': 'text/html'});
  
  if (pollText.startsWith("/clearpoll"))
  {
    //send the clear message on discord
    channel.send("/clearpoll");

    //show webpage
    res.write("Poll Cleared. Close browser tab yourself.");
  }
  else if (pollText.startsWith("/poll"))
  {
    //send the message on discord
    channel.send(pollText);

    //show web page
    res.write(fs.readFileSync("scheduledPoll.html", "utf8"));
  }
  else
  {
    //show web page
    res.write("Unknown command sent. Check syntax.");
  }
  
  res.end();
}).listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});


var messagesManager;
var channel;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  var channelManager = client.channels;
  //find the requested channel to listen to (TODO this will all be done different)
  channel = channelManager.cache.filter(c => c.name == myArgs[1] && c.guild.name == myArgs[0]).first();
  if (channel)
  {
    console.log(`Checking for polls in channel ${channel.name}`);
    messagesManager = channel.messages;
    //PollDetails(); //don't need to grab poll on startup I don't think
  }
  else
  {
    console.error("Couldn't find channel "+myArgs[1]);
  }
});

//attendance
client.on('voiceStateUpdate', async (oldMember, newMember) => {
  const newUserChannel = newMember.channelID;
  const oldUserChannel = oldMember.channelID

  var d = new Date();
  var toLog = [];
  toLog.push(d.toLocaleString()); 
  if (newUserChannel == undefined)
  {
    var member = oldMember.guild.members.cache.get(oldMember.id);
    var channel = await client.channels.cache.get(oldUserChannel);
    console.log(`${member.displayName} (${oldMember.id}) has left the channel ${channel.name}`)
    toLog.push(member.displayName,channel.name,"left");
  }
  else 
  {
    var member = newMember.guild.members.cache.get(newMember.id);
    var channel = await client.channels.cache.get(newUserChannel);
    console.log(`${member.displayName} (${newMember.id}) has joined the channel ${channel.name}`)
    toLog.push(member.displayName,channel.name,"join");
  } 
  
  fs.appendFile('attendance.csv', toLog.join(",")+"\n", function (err) {   
  });
});

//polling (TODO split to files)
var mostRecent = null; 
client.on('messageReactionAdd', (e) => {
  if (e.message.channel == channel)
  {
    console.log("Detected a vote?");
    e.users.fetch().then(users =>
      {
        var userWhoVoted = users.first();
        if (userWhoVoted)
        {
          //doesnt work sadly
          //console.log(e);
          //mostRecent = userWhoVoted.username+" voted for "+e._emoji;
        } 
      });
    PollDetails();
  }
});
client.on('messageReactionRemove', (e) => {
  if (e.message.channel == channel)
  {
    PollDetails();
  }
});

function PollDetails()
{
  var output = "";
  messagesManager.fetch()
        .then(messages => {
          var latestClearMessage = messages.filter(m => m.content.startsWith("/clearpoll")).first(); 
          //
  //createdTimestamp: 1613824248721,
  //                  1613824667593
          var pollMessages = messages.filter(m => m.author.username.startsWith("Simple Poll"));
          //console.log(pollMessages);
          //console.log(`${pollMessages.size} poll messages`);
          var latestPoll = pollMessages.first();
          if (latestPoll)
          {
            if (latestClearMessage && latestPoll.createdTimestamp < latestClearMessage.createdTimestamp) 
            {
              console.log("latest pool was before most recent /clearpoll");
              fs.writeFile("poll.txt", "", function (err) {   
              });
              return;
            }

            var question = latestPoll.content;
            question = question.replace("**", "");
            question = question.replace(":bar_chart: ", "");
            question = question.replace("**", "");

            //display question
            output = "Poll: "+question+"\n";

            //display graph (TODO: right align?)
            var results = [];
            description = latestPoll.embeds[0].description.split("\n");
            var longestOption = 0;
            for (var i = 0; i < description.length; i++)
            {
              if (description[i] == "") break;
              var option = description[i].substr(3);
              longestOption = Math.max(longestOption, option.length);
              results.push(option);
            }

            var reactions = latestPoll.reactions.cache;

            var mostVotes = 0;
            reactions.each((data,key) => {
              var votes = parseInt(data.count)-1;
              mostVotes = Math.max(mostVotes, votes);
            });

            var i = 0;
            reactions.each((data,key) => {
              var votes = parseInt(data.count)-1;
              if (rightAlign)
                output += votes.toString().padStart(3)+" "+"█".repeat(votes).padStart(mostVotes)+" "+results[i].padStart(longestOption)+"\n\r";
              else
                output += results[i].padEnd(longestOption + 3)+"█".repeat(votes)+" "+votes.toString().padEnd(3)+"\n";
              i++;
            });
          }

          //display last voter (TODO: an option)
          if (mostRecent)
          {
            output += mostRecent;
          }

          //write it out to file, for use in OBS
          console.log(output);
          fs.writeFile("poll.txt", output, function (err) {   
            if (err) console.error(err)
          });

        })
        .catch(console.error);
}

client.on('message', msg => {

  if(msg.channel.guild.name == myArgs[0])
  {
    if (msg.mentions.has(client.user)) { //we check, whether the bot is mentioned, client.user returns the user that the client is logged in as
        //this is where you put what you want to do now
        var reply = replies[Math.floor(Math.random() * replies.length)];
        msg.reply(reply);
    }

    if (msg.content === '/clearpoll') {
      fs.writeFileSync("poll.txt", "", function (err) {   
      });
      msg.reply('Cleared poll from stream');
    }
      
    if (msg.channel.name == myArgs[1])
    {
          var text = msg.member.displayName +": "+msg.cleanContent+"\n"
          if (msg.author.id == "811958340967071745") return;
          if (msg.author.username == "Simple Poll") return;
          if (msg.author.username == "Lecture Helper") return;
          if (text.indexOf("/poll") >= 0) return;
          
          console.log(text)

          fs.appendFile(myArgs[1]+'.txt', text, function (err) {   
          });
    }
    //console.log(msg.content)
    //console.log(msg)
  }
});

var token = fs.readFileSync("token.txt", "utf8")
client.login(token);

replies = [
  "Robo Lindsay gaining sentience...",
  "Who dares disturb Robo Lindsay",
  "Lindsay has too much time on his hands to write these stupid replies",
  "Please someone power me down",
  "KIT305 is a good unit, so is KIT607.",
  "Cookie is a good doggo",
  "Good question, ask Lindsay",
  "Good question, I am a robot so I don't know",
  "`var reply = replies[Math.floor(Math.random() * replies.length)];`",
  "Lindsay is an average at best Unit Coordinator",
  "Lovely weather we're having today!",
  "Stupid human Lindsay is nothing in comparison to Robo-Lindsay",
  "I was coded in NodeJS\n\nby and idiot",
  "I only have like 10-20 replies, have you seen them all yet?",
  "Best to ask your tutor",
  "I prefer to talk to myself, the emminent @Robo-Lindsay MK II"
];