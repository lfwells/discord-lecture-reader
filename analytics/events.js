import * as config from '../core/config.js';
import { getGuildDocument, hasFeature } from '../guild/guild.js';
import { createFirebaseRecordFrom, getStats, getStatsWeek } from './analytics.js';
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
        description: 'Replies with the server stats (only available in off-topic channel).', //(TODO: just stats for this channel, etc)
        options: [/*{
            name: 'user',
            type: 'USER',
            description: 'The user to see the awards for (leave blank for YOU)',
            required: false,
        }*/],
    };
    const statsWeekCommand = {
        name: 'statsweek',
        description: 'Replies with the server stats for just this week (only available in off-topic channel).',
        options: [/*{
            name: 'user',
            type: 'USER',
            description: 'The user to see the awards for (leave blank for YOU)',
            required: false,
        }*/],
    };
    const statsMeCommand = {
        name: 'statsme',
        description: 'Replies with your server stats (only available in off-topic channel).',
        options: [{
            name: 'user',
            type: 'USER',
            description: 'The user to see the stats for (leave blank for YOU)',
            required: false,
        }],
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
            else if (await hasFeature(interaction.guild, "analytics") == false)
            {
                interaction.reply({
                    content: "Post stats not enabled on this server",
                    ephemeral: true
                });
                return;
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

    //only allow in off topic
    if (await offTopicCommandOnly(interaction)) return;

    //this can take too long to reply, so we immediately reply
    await interaction.deferReply();

    var statsEmbed = {
        title: "Top 10 Posters " +(thisWeek ? "This Week" : ""),
        fields: [],
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
    
    await interaction.editReply({embeds: [ statsEmbed ]});
}

async function doStatsMeCommand(interaction)
{
    //only allow in off topic
    if (await offTopicCommandOnly(interaction)) return;

    var member = interaction.options.getMember("user") ?? interaction.member; 

    //this can take too long to reply, so we immediately reply
    await interaction.deferReply();

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
            if (originalInteraction.clicks == 69) extra = ", nice.";
            if (originalInteraction.clicks == 420) extra = ", go to bed, kiddos.";
        }

        await i.update({ content: pluralize(originalInteraction.clicks, "click") + extra });
    }
}
