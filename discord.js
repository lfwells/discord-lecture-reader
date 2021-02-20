const Discord = require('discord.js');
const client = new Discord.Client();

var myArgs = process.argv.slice(2);
console.log('run with args: ', myArgs);

fs = require('fs');

var messagesManager;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  var channelManager = client.channels;
  channelManager.fetch("802055032257511424")
    .then(channel => {
      messagesManager = channel.messages;
      PollDetails();
      //setInterval(PollDetails, 500);
    });
});

client.on('messageReactionAdd', PollDetails);
client.on('messageReactionRemove', PollDetails);

function PollDetails()
{
  var output = "";
  messagesManager.fetch()
        .then(messages => {
          var pollMessages = messages.filter(m => m.author.id === '324631108731928587');
          //console.log(pollMessages);
          //console.log(`${pollMessages.size} poll messages`);
          var latestPoll = pollMessages.last();
          if (latestPoll)
          {
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
              output += data.count +" "+results[i]+"\n";
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
    if (msg.content === 'ping') {
      msg.reply('pong');
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