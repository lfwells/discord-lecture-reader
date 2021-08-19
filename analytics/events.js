import * as config from '../core/config.js';
import { getGuildDocument, getOffTopicChannel } from '../guild/guild.js';
import { getStats, getStatsWeek } from './analytics.js';
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
    const statsWeekCommand = {
        name: 'statsweek',
        description: 'Replies with the server stats for just this week',
        options: [/*{
            name: 'user',
            type: 'USER',
            description: 'The user to see the awards for (leave blank for YOU)',
            required: false,
        }*/],
    };
    const statsMeCommand = {
        name: 'statsme',
        description: 'Replies with the YOUR server stats',
        options: [{
            name: 'user',
            type: 'USER',
            description: 'The user to see the stats for (leave blank for YOU)',
            required: false,
        }],
    };
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        var commands = await guild.commands.fetch(); 
        for (const command in commands)
        {
            console.log(guild.name+"delete "+await command.delete());
        }
        /*console.log(guild.name+"add "+*/await guild.commands.create(statsCommand);//); 
        /*console.log(guild.name+"add "+*/await guild.commands.create(statsWeekCommand);//); 
        /*console.log(guild.name+"add "+*/await guild.commands.create(statsMeCommand);//); 
    });

    client.on('interaction', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (!interaction.isCommand()) return;
        
        console.log("got interaction", interaction.commandName, interaction.options.length);
    
        // Check if it is the correct command
        if (interaction.commandName === "stats" || interaction.commandName === "statsweek") 
        {
            var thisWeek = interaction.commandName === "statsweek";

            //only allow in off topic
            var offTopicChannel = await getOffTopicChannel(interaction.guild);
            if (offTopicChannel && interaction.channel != offTopicChannel)
            {
                interaction.reply("You can only `/stats` in <#"+offTopicChannel.id+">", { ephemeral:true });
                return;
            }

            //this can take too long to reply, so we immediately reply
            var msg = await interaction.reply("Fetching stats...", {ephemeral:true});

            var statsEmbed = {
                title: "Top 10 Posters " +(thisWeek ? "This Week" : ""),
                fields: [],
                author: {
                    name:"As requested by "+(interaction.member.displayName),
                    icon_url:interaction.user.displayAvatarURL()
                },
                thumbnail: { 
                    url:interaction.guild.iconURL() //this is null and at this point I don't care lol
                }
            };

            var stats = await (thisWeek ? getStatsWeek(interaction.guild) : getStats(interaction.guild));
            for (var i = 0; i < Math.min(stats.members.length, 10); i++)
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
        // Check if it is the correct command
        else if (interaction.commandName === "statsme") 
        {
            //only allow in off topic
            var offTopicChannel = await getOffTopicChannel(interaction.guild);
            if (offTopicChannel && interaction.channel != offTopicChannel)
            {
                interaction.reply("You can only `/statsme` in <#"+offTopicChannel.id+">", { ephemeral:true });
                return;
            }

            var member = interaction.member; 
            if (interaction.options.length >= 1)
            {
                member = await interaction.guild.members.fetch(interaction.options[0].value.replace("<@", "").replace(">", "").replace("!", ""));
            }

            //this can take too long to reply, so we immediately reply
            var msg = await interaction.reply("Fetching stats...", {ephemeral:true});

            var statsEmbed = {
                title: "Stats for "+(member.nickname ?? member.username),
                fields: [],
                thumbnail: { 
                    url:member.user.displayAvatarURL()
                }
            };

            var stats = await getStats(interaction.guild);
            var posts = [];
            var memberStats = stats.members.find(m => m.memberID == member.id);
            if (memberStats)
            {
                posts = memberStats.posts;
            }
            statsEmbed.fields.push({
                name:pluralize(posts.length, "Post"),
                value:posts.length > 100 ? "'Thats'a lotta posts!'" : "Them's rookie numbers!"
            });
            
            if (interaction.member.id != member.id)
            {
                statsEmbed.author = {
                    name:"As requested by "+(interaction.member.displayName),
                    icon_url:interaction.user.displayAvatarURL()
                }
            }

            await send(interaction.channel, {embed: statsEmbed});
            
        }
    });

}