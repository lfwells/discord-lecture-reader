const Discord = require('discord.js');
const client = new Discord.Client();

var myArgs = process.argv.slice(2);
console.log('run with args: ', myArgs);

fs = require('fs');

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

client.on('messageReactionAdd', (e) => {
  if (e.message.channel == channel)
  {
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
            output = "Poll: "+question+"\n";

            var results = [];
            description = latestPoll.embeds[0].description.split("\n");
            //console.log(description);
            for (var i = 0; i < description.length; i++)
            {
              if (description[i] == "") break;
              results.push(description[i].substr(3));
            }

            var reactions = latestPoll.reactions.cache;
            var i = 0;
            reactions.each((data,key) => {
              output += (parseInt(data.count)-1) +" "+results[i]+"\n";
              i++;
            });
          }
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