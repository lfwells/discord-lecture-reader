const Discord = require('discord.js');
const client = new Discord.Client();

var myArgs = process.argv.slice(2);
console.log('run with args: ', myArgs);

fs = require('fs');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

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

          fs.appendFile('lecture-chat.txt', text, function (err) {   
          });
    }
    //console.log(msg.content)
    //console.log(msg)
  }
});

var token = fs.readFileSync("token.txt", "utf8")
client.login(token);