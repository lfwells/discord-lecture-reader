import * as config from '../core/config.js';
import { getGuildDocument } from '../guild/guild.js';
import { getStats } from './analytics.js';
import { pluralize } from '../core/utils.js';
import { send } from '../core/client.js';

export default async function(client)
{
    client.on('message', async (msg) =>  
    {
        if (msg.channel.id == config.ERROR_LOG_CHANNEL_ID) return; //dont get stuck in a loop recording error logs lol
        //console.log(msg);
        var guildDocument = getGuildDocument(msg.guild.id);
        var record = {};
        record.dump = JSON.stringify(msg);
        record.author = msg.author.id;
        record.member = msg.member.id;
        record.channel = msg.channel.id;
        record.content = msg.content;
        //console.log(record);

        await guildDocument.collection("analytics").add(record);
    });

    
    //commands (/stats)
    // The data for our command
    const statsCommand = {
        name: 'stats',
        description: 'Replies with the server stats (TODO: just stats for this channel, etc)',
        options: [/*{
            name: 'user',
            type: 'USER',
            description: 'The user to see the awards for (leave blank for YOU)',
            required: false,
        }*/],
    };
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        var commands = await guild.commands.fetch(); 
            for (const command in commands)
            {
                console.log(guild.name+"delete "+await command.delete());
            }
        /*console.log(guild.name+"add "+*/await guild.commands.create(statsCommand);//); 
    });

    client.on('interaction', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (!interaction.isCommand()) return;
        
        console.log("got interaction", interaction.commandName, interaction.options.length);
    
        // Check if it is the correct command
        if (interaction.commandName === "stats") 
        {

            //this can take too long to reply, so we immediately reply
            var msg = await interaction.reply("Fetching stats...", {ephemeral:true});

            var statsEmbed = {
                title: "Top 5 Posters",
                fields: [],
                description:"As requested by <@"+interaction.user.id+">"
            };

            var stats = await getStats(interaction.guild);
            for (var i = 0; i < Math.min(stats.members.length, 5); i++)
            {
                statsEmbed.fields.push({
                    name:stats.members[i].name,
                    value:pluralize(stats.members[i].posts.length, "Post")
                });
            }

            /*const user = await client.users.cache.get(interaction.member.user.id);
            user.send(exampleEmbed);*/
            
            //await interaction.reply({embed: statsEmbed});
            await send(interaction.channel, {embed: statsEmbed});
        }
    });

}