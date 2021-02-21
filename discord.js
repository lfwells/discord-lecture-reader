const Discord = require('discord.js');
const client = new Discord.Client();

var myArgs = process.argv.slice(2);
console.log('run with args: ', myArgs);

var port = 1090;
var host = "localhost";

fs = require('fs');

//create a server to listen to requests
var http = require('http');
http.createServer(function (req, res) {
  var url = req.url;
  url = url.replace("/?", "");
  var pollText = decodeURI(url);
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
  channel = channelManager.cache.filter(c => c.name == myArgs[1] && c.guild.name == myArgs[0]).first();
  if (channel)
  {
    console.log(`Checking for polls in channel ${channel.name}`);
    messagesManager = channel.messages;
    PollDetails();
  }
  else
  {
    console.error("Couldn't find channel "+myArgs[1]);
  }
});

var mostRecent = null; 
client.on('messageReactionAdd', (e) => {
  if (e.message.channel == channel)
  {
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
            var i = 0;
            reactions.each((data,key) => {
              var votes = parseInt(data.count)-1;
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
          });

        })
        .catch(console.error);
}

client.on('message', msg => {

  if(msg.channel.guild.name == myArgs[0])
  {
    if (msg.content === '/clearpoll') {
      fs.writeFileSync("poll.txt", "", function (err) {   
      });
      msg.reply('Cleared poll from stream');
    }
      
    if (msg.channel.name == myArgs[1])
    {
          var text = msg.author.username +": "+msg.content+"\n"
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