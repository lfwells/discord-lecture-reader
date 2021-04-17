import * as config from '../core/config.js';
import { handleAwardNicknames, isAwardChannelID, getAwardChannelID } from "./awards.js";

export default async function(client)
{
    client.on('message', async (msg) => 
    {
        if (await isAwardChannelID(msg.channel))
        {
            //detect update to awards (add)
            console.log("message added in off topics list");
            handleAwardNicknames(client, msg.channel);
        }
    });

    client.on('messageUpdate', async(msg) =>
    {
        if (await isAwardChannelID(msg.channel))
        {
            //detect update to awards (edit)
            console.log("message update in off topics list");
            handleAwardNicknames(client, msg.channel);
        }
    });

    client.on('messageDelete', async(msg) =>
    {
        if (await isAwardChannelID(msg.channel))
        {
            //detect update to awards (delete)
            console.log("message delete in off topics list");
            handleAwardNicknames(client, msg.channel);
        }
    });

    // The data for our command
    const flexCommand = {
        name: 'flex',
        description: 'Replies with your earned awards!',
        options: [{
            name: 'user',
            type: 'STRING',
            description: 'The user to see the awards for (leave blank for YOU)',
            required: false,
        }],
    };
  
    // Creating a guild-specific command
    var guilds = client.guilds.cache;
    //store them in the db
    guilds.each( async (guild) => { 
        guild.commands.create(flexCommand); 
    });

    client.on('interaction', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (!interaction.isCommand()) return;
    
        // Check if it is the correct command
        if (interaction.commandName === "flex") 
        {
            var member;
            if (interaction.options.length > 0) 
            {
                member = await guild.members.fetch(interaction.options[0].value.replace("<@", "").replace(">", "").replace("!", ""));
            }
            else
            {
                member = interaction.member;
            }

            var flex = "";
            
            //search the awards channel
            var awards = [];
            var awardChannelID = await getAwardChannelID(interaction.guild.id);
            if (!awardChannelID)
            {
                interaction.reply("No awards channel set up.");
                return;
            }

            var awardChannel = await client.channels.cache.get(awardChannelID);
            var messages = await awardChannel.messages.fetch();
            messages.forEach(message => 
            {
                //check that they have the award
                if (message.mentions.users.has(member.user.id))
                {
                    var content = message.cleanContent;
                    var newLinePos = content.indexOf("\n");
                    if (newLinePos > 0)
                        content = content.substr(0, newLinePos);
                    awards.push(content);
                }
            });

            flex = "<@"+member.id+"> has "+awards.length+" award" + (awards.length == 1 ? "" : "s") +"\n"+awards.join("\n");
            if (awards.length == 0)
            {
                flex += ":(";
            }
            interaction.reply(flex);
        }

    });
}