import * as config from '../core/config.js';
import { getGuildDocument, hasFeature } from '../guild/guild.js';
import { createFirebaseRecordFrom, getStats, getStatsWeek, getStudentStreak, getTopActiveDays, getTopBestStreak, getTopCurrentStreak } from './analytics.js';
import { offTopicCommandOnly, pluralize } from '../core/utils.js';
import { send } from '../core/client.js';
import { MessageActionRow, MessageButton } from 'discord.js';
import { getCachedInteraction, registerCommand, storeCachedInteractionData } from '../guild/commands.js';

export default async function(client)
{
    client.on('messageCreate', async (msg) =>  
    {
        if (msg.inGuild() == false) return;

        if (await hasFeature(msg.guild, "analytics") == false) return;
        if (msg.channel.id == config.ERROR_LOG_CHANNEL_ID) return; //dont get stuck in a loop recording error logs lol

        var guildDocument = await getGuildDocument(msg.guild.id);
        await guildDocument.collection("analytics").add(await createFirebaseRecordFrom(msg));
    });

    
    //commands (/stats)
    // The data for our command
    const statsCommand = {
        name: 'stats',
        description: 'Replies with the server stats.', //(TODO: just stats for this channel, etc)
        options: [{
            name: 'public',
            type: 'BOOLEAN',
            description: 'Should this be posted for all to see, or just you? (Default: false)',
            required: false,
        },{
            name: 'this_channel',
            type: 'BOOLEAN',
            description: 'Should the returned stats be for the current channel only? (Default: false)',
            required: false,
        }],
    };
    const statsWeekCommand = {
        name: 'statsweek',
        description: 'Replies with the server stats for just this week.',
        options: [{
            name: 'public',
            type: 'BOOLEAN',
            description: 'Should this be posted for all to see, or just you? (Default: false)',
            required: false,
        },{
            name: 'this_channel',
            type: 'BOOLEAN',
            description: 'Should the returned stats be for the current channel only? (Default: false)',
            required: false,
        }],
    };
    const statsMeCommand = {
        name: 'statsme',
        description: 'Replies with your server stats.',
        options: [{
            name: 'user',
            type: 'USER',
            description: 'The user to see the stats for (leave blank for YOU)',
            required: false,
        }, {
            name: 'public',
            type: 'BOOLEAN',
            description: 'Should this be posted for all to see, or just you? (Default: false)',
            required: false,
        },{
            name: 'this_channel',
            type: 'BOOLEAN',
            description: 'Should the returned stats be for the current channel only? (Default: false)',
            required: false,
        }],
    };
    const streakCommand = {
        name: 'post_streak',
        description: "See info about yours (or others) best and current daily posting streaks.",
        options: [  
            {
                name: "best", type:"SUB_COMMAND", description: "Best daily post streak",
                options: 
                [
                    {
                        name: "other", type: "USER", description: "Optionally see the best post streak of another user"
                    }, {
                        name: 'public',
                        type: 'BOOLEAN',
                        description: 'Should this be posted for all to see, or just you? (Default: false)',
                        required: false,
                    }
                ]
            },
            {
                name: "current", type:"SUB_COMMAND", description: "Current daily post streak",
                options: 
                [
                    {
                        name: "other", type: "USER", description: "Optionally see the best post streak of another user"
                    }, {
                        name: 'public',
                        type: 'BOOLEAN',
                        description: 'Should this be posted for all to see, or just you? (Default: false)',
                        required: false,
                    }
                ]
            },
            {
                name: "server_best", type:"SUB_COMMAND", description: "See who has the best daily post streak on the server",
                options: [{
                    name: 'public',
                    type: 'BOOLEAN',
                    description: 'Should this be posted for all to see, or just you? (Default: false)',
                    required: false,
                }]
            },
            {
                name: "server_current", type:"SUB_COMMAND", description: "See who has the best daily post streak on the server",
                options: [{
                    name: 'public',
                    type: 'BOOLEAN',
                    description: 'Should this be posted for all to see, or just you? (Default: false)',
                    required: false,
                }]
            }
        ]
    };
    const activeDaysCommand = {
        name: 'active_days',
        description: "See info about yours (or others) total number of active days.",
        options: [  
            {
                name: "me", type:"SUB_COMMAND", description: "See your (or someone else's) total number of active days.",
                options: 
                [
                    {
                        name: "other", type: "USER", description: "Optionally see the best post streak of another user"
                    }, {
                        name: 'public',
                        type: 'BOOLEAN',
                        description: 'Should this be posted for all to see, or just you? (Default: false)',
                        required: false,
                    }
                ]
            },
            {
                name: "server_best", type:"SUB_COMMAND", description: "See who has the highest number of active days on the server",
                options: [{
                    name: 'public',
                    type: 'BOOLEAN',
                    description: 'Should this be posted for all to see, or just you? (Default: false)',
                    required: false,
                }]
            },
        ]
    };
    const buttonCommand = {
        name: 'useless_button',
        description: 'Literally just a counter button everyone can press. Why? I DON\'T KNOW!',
        options: [{
            name: 'text',
            type: 'STRING',
            description: 'The text to appear on the button',
            required: false,
        }],}; 

    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, statsCommand);
        await registerCommand(guild, statsWeekCommand); 
        await registerCommand(guild, statsMeCommand); 
        await registerCommand(guild, streakCommand); 
        await registerCommand(guild, activeDaysCommand);
        await registerCommand(guild, buttonCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (interaction.isCommand() && interaction.guild)
        {
            if (interaction.commandName === "useless_button") 
            {
                await doButtonCommand(interaction);            
            }
            
            if (interaction.commandName === "stats" || 
                interaction.commandName === "statsweek" ||
                interaction.commandName == "post_streak" ||
                interaction.commandName == "active_days")
            {
                if (await hasFeature(interaction.guild, "analytics") == false)
                {
                    interaction.reply({
                        content: "Post stats not enabled on this server",
                        ephemeral: true
                    });
                    return;
                }
            }
        
            // Check if it is the correct command
            if (interaction.commandName === "stats" || interaction.commandName === "statsweek") 
            {
                doStatsCommand(interaction);
            }
            // Check if it is the correct command
            else if (interaction.commandName === "statsme") 
            {
                doStatsMeCommand(interaction);            
            }
            else if (interaction.commandName == "post_streak")
            {
                var subCommand = interaction.options.getSubcommand();
                if (subCommand === "best")
                {
                    doPostStreakCommand(interaction, {
                        best:true,
                        server:false
                    });
                }
                else if (subCommand === "current")
                {
                    doPostStreakCommand(interaction, {
                        best:false,
                        server:false
                    });
                }
                else if (subCommand === "server_best")
                {
                    doPostStreakCommand(interaction, {
                        best:true,
                        server:true
                    });
                }
                else if (subCommand === "server_current")
                {
                    doPostStreakCommand(interaction, {
                        best:false,
                        server:true
                    });
                }
            }
            else if (interaction.commandName == "active_days")
            {
                var subCommand = interaction.options.getSubcommand();
                if (subCommand === "me")
                {
                    doActiveDaysCommand(interaction, {
                        server:false
                    });
                }
                else if (subCommand === "server_best")
                {
                    doActiveDaysCommand(interaction, {
                        server:true
                    });
                }
            }
        }
        // If the interaction isn't a slash command, return
        else if (interaction.isMessageComponent() && interaction.message.interaction)
        {
            if (interaction.message.interaction.commandName === "useless_button") 
            {
                await doButtonCommandButton(interaction, await getCachedInteraction(interaction.guild, interaction.message.interaction.id));
            }
        }
    });

}

async function doStatsCommand(interaction)
{
    var thisWeek = interaction.commandName === "statsweek";

    var publicPost = interaction.options.getBoolean("public") ?? false;

    var channelFilter = (interaction.options.getBoolean("this_channel") ?? false) ? (m => m.channel == interaction.channel.id) : null;

    //only allow in off topic
    if (publicPost && await offTopicCommandOnly(interaction)) return;

    //this can take too long to reply, so we immediately reply
    await interaction.deferReply({ ephemeral: !publicPost });

    var statsEmbed = {
        title: "Top 10 Posters " +(thisWeek ? "This Week" : ""),
        fields: [],
        thumbnail: { 
            url:interaction.guild.iconURL() //this is null and at this point I don't care lol
        }
    };

    var stats = await (thisWeek ? getStatsWeek(interaction.guild, null, channelFilter) : getStats(interaction.guild, null, channelFilter));
    for (var i = 0; i < Math.min(stats.members.length, 10); i++)
    {
        statsEmbed.fields.push({
            name:stats.members[i].name,
            value:pluralize(stats.members[i].posts.length, "Post")
        });
    };
    statsEmbed.description = pluralize(stats.total, "Total Post");
    if (thisWeek) statsEmbed.description += "This Week";

    if (channelFilter != null) statsEmbed.title = `#${interaction.channel.name} Channel ${statsEmbed.title}`;

    await interaction.editReply({embeds: [ statsEmbed ]});
}

async function doStatsMeCommand(interaction)
{
    var publicPost = interaction.options.getBoolean("public") ?? false;
    
    var channelFilter = (interaction.options.getBoolean("this_channel") ?? false) ? (m => m.channel == interaction.channel.id) : null;

    var member = interaction.options.getMember("user") ?? interaction.member; 
    if (member.id === undefined)
    {
        member = await interaction.guild.members.fetch(member);
    }
    
    //only allow in off topic
    if (publicPost && await offTopicCommandOnly(interaction)) return;

    //this can take too long to reply, so we immediately reply
    await interaction.deferReply({ ephemeral: !publicPost });

    var statsEmbed = {
        title: "Stats for "+(member.nickname ?? member.username),
        fields: [],
        thumbnail: { 
            url:member.user?.displayAvatarURL()
        }
    };

    var stats = await getStats(interaction.guild, null, channelFilter);
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

    if (channelFilter != null) statsEmbed.title = `#${interaction.channel.name} Channel ${statsEmbed.title}`;

    await interaction.editReply({embeds: [ statsEmbed ] });
}

var clicks = 0; //TODO: give this command a text, give this command unique counters zz
async function doButtonCommand(interaction)
{
    //only allow in off topic
    if (await offTopicCommandOnly(interaction)) return;
    
    await interaction.deferReply();

    await storeCachedInteractionData(interaction.guild, interaction.id, { clicks: 0 });

    const row = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('primary')
            .setLabel(interaction.options.getString("text") ?? 'Click me for nothing interesting to happen')
            .setStyle('PRIMARY')
            .setEmoji('😄')
    );

    const rows = [ row ]

    await interaction.editReply({content: pluralize(clicks, "click"), components: rows});
}

async function doPostStreakCommand(interaction, options)
{
    var publicPost = interaction.options.getBoolean("public") ?? false;
    
    var member = interaction.options.getMember("user") ?? interaction.member; 
    if (member.id === undefined)
    {
        member = await interaction.guild.members.fetch(member);
    }

    //only allow in off topic
    if (publicPost && await offTopicCommandOnly(interaction)) return;
    
    //this can take too long to reply, so we immediately reply
    await interaction.deferReply({ ephemeral: !publicPost });

    var statsEmbed = {
        title: "Post Streak",
        fields: [],
        thumbnail: { 
            url:member.user?.displayAvatarURL()
        }
    };

    if (options.best) 
        statsEmbed.title = `Best ${statsEmbed.title}`;
    else
        statsEmbed.title = `Current ${statsEmbed.title}`;

    if (options.server) 
        statsEmbed.title = `Server Top 10 ${statsEmbed.title}`;
    else
        statsEmbed.title = `${statsEmbed.title} for ${(member.nickname ?? member.username)}`;

    if (options.server == false)
    {
        var streak = await getStudentStreak(interaction.guild, member.id);
        console.log({streak});
        statsEmbed.fields.push({
            name:pluralize(options.best ? streak.bestStreak : streak.currentStreak, "Active Day")+" in a row!",
            value:`Their total active days is ${streak.totalActiveDays}`
        });
    }
    else
    {
        var streaks = options.best ? await getTopBestStreak(interaction.guild) : await getTopCurrentStreak(interaction.guild);
        for (var i = 0; i < Math.min(streaks.length, 10); i++)
        {
            statsEmbed.fields.push({
                name:streaks[i].name,
                value:pluralize(options.best ? streaks[i].bestStreak : streaks[i].currentStreak, "Active Day")+ " in a row"
            });
        };
    }

    await interaction.editReply({embeds: [ statsEmbed ] });
}

async function doActiveDaysCommand(interaction, options)
{
    var publicPost = interaction.options.getBoolean("public") ?? false;
    
    var member = interaction.options.getMember("user") ?? interaction.member; 
    if (member.id === undefined)
    {
        member = await interaction.guild.members.fetch(member);
    }

    //only allow in off topic
    if (publicPost && await offTopicCommandOnly(interaction)) return;
    
    //this can take too long to reply, so we immediately reply
    await interaction.deferReply({ ephemeral: !publicPost });

    var statsEmbed = {
        title: "Active Days",
        fields: [],
        thumbnail: { 
            url:member.user?.displayAvatarURL()
        }
    };

    if (options.server) 
        statsEmbed.title = `Server Top 10 ${statsEmbed.title}`;
    else
        statsEmbed.title = `${statsEmbed.title} for ${(member.nickname ?? member.username)}`;

    if (options.server == false)
    {
        var streak = await getStudentStreak(interaction.guild, member.id);
        console.log({streak});
        statsEmbed.fields.push({
            name:pluralize(streak.totalActiveDays, "Active Day"),
            value:`That is ${streak.totalActiveDays} more than 0!`
        });
    }
    else
    {
        var streaks = await getTopActiveDays(interaction.guild);
        for (var i = 0; i < Math.min(streaks.length, 10); i++)
        {
            statsEmbed.fields.push({
                name:streaks[i].name,
                value:pluralize(streaks[i].totalActiveDays, "Active Day")
            });
        };
    }

    await interaction.editReply({embeds: [ statsEmbed ] });
}

async function doButtonCommandButton(i, originalInteraction)
{
    if (i.customId === 'primary') {
        //await i.deferUpdate();
        //await wait(4000);
        
        originalInteraction = await storeCachedInteractionData(i.guild, originalInteraction.id, { clicks: originalInteraction.clicks + 1 });
        
        var extra = "";
        if (config.LINDSAYS_SERVERS.indexOf(i.guild.id) >= 0)
        {
            if (originalInteraction.clicks == 5) extra = ", oh boy, here we go.";
            if (originalInteraction.clicks == 10) extra = ", clicky clicky! That feels nice!";
            if (originalInteraction.clicks == 11) extra = ", (ew)";
            if (originalInteraction.clicks == 69) extra = ", nice.";
            if (originalInteraction.clicks == 420) extra = ", go to bed, kiddos.";
            if (originalInteraction.clicks == 666) extra = ", now you've done it!";
            if (originalInteraction.clicks == 777) extra = ", cha-ching!";
        }

        await i.update({ content: pluralize(originalInteraction.clicks, "click") + extra });
    }
}
