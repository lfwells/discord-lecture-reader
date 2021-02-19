const Discord = require('discord.js');
const client = new Discord.Client();

fs = require('fs');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === 'ping') {
    msg.reply('pong');
  }

  if (msg.channel.name == "lecture-chat")
  {
        var text = msg.author.username +": "+msg.content+"\n"
        console.log(text)

        fs.appendFile('lecture-chat.txt', text, function (err) {   
        });
  }
  //console.log(msg.content)
  //console.log(msg)
});

client.login('ODExOTU4MzQwOTY3MDcxNzQ1.YC5xIQ.gHTqtOTdgZM-l0lRyQKGvKgXQf4');