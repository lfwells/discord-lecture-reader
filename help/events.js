import { setGuildContextForInteraction } from '../core/errors.js';
import { asyncFilter, asyncForEach } from '../core/utils.js';
import { adminCommandData, allCommandData, commandEnabledForGuild, registerApplicationCommand, registerCommand } from '../guild/commands.js';
import { getGuildProperty } from '../guild/guild.js';
import { isAdmin } from '../roles/roles.js';

export default async function(client)
{
    var helpCommand = {
        name: "help",
        description: "List all the commands the bot can run (only visible to you)"
    }
    var directoryCommand = {
        name: "directory",
        description: "List all the channels and their descriptions (only visible to you)."
    }
    await registerApplicationCommand(client, helpCommand);
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, directoryCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {
        setGuildContextForInteraction(interaction);
        
        // If the interaction isn't a slash command, return
        if (!interaction.isApplicationCommand()) return;

        if (interaction.commandName === "help") 
        {
            await doHelpCommand(interaction);            
        }
        else if (interaction.commandName === "directory") 
        {
            await doDirectoryCommand(interaction);            
        }
    });
    
}

async function doHelpCommand(interaction)
{
    await interaction.deferReply({ephemeral:true});

    var botName = interaction.client.user.username;
    if (interaction.guild) botName = await getGuildProperty("botName", interaction.guild);

    var note = "";
    if (interaction.guild == undefined) note = "\n\nNote that you can only run these commands on a server, not in this DM channel.\n\nNote that not all classes use all of these commands.";

    var commandData = Object.entries(allCommandData);
    if (interaction.member && await isAdmin(interaction.member))
    {
        commandData = [...commandData, ...Object.entries(adminCommandData)];
    }
    var commands = await asyncFilter(commandData, async (c) => interaction.guild == undefined || await commandEnabledForGuild(c[0], interaction.guild));

    await interaction.editReply({
        content:"Here are the commands that you can run on me!"+note,
        embeds: [
            {
                title: botName+" Commands",
                thumbnail: await interaction.client.user.displayAvatarURL(),
                fields:commands.map((kvp) => {
                    var key = kvp[0];
                    var data = kvp[1];

                    if (data.description == undefined) return null;

                    var optionsText = "";
                    if (data.options && data.options.length > 0)
                    {
                        var options = data.options.map(o => o.required ? o.name : "["+o.name+"]");
                        optionsText = " "+ options.join(" ");
                    }

                    return {
                        name:"`/"+(key+optionsText).substring(0, 250)+"`",
                        value:data.description.substring(0, 255)
                    }
                }).filter(e => e != null)
            }
        ]
    });
}

async function doDirectoryCommand(interaction)
{
    await interaction.deferReply({ephemeral:true});

    var guild = interaction.guild;

    var categories = {};


    var noCategoryChannels =  guild.channels.cache.filter(channel => channel.type !== "GUILD_CATEGORY" && channel.parent == null).sort((a,b) => a.position - b.position)
    noCategoryChannels.forEach(c => {
        if (!categories["NONE"]) categories["NONE"] = [];
        if (c.permissionsFor(interaction.member).has("VIEW_CHANNEL"))
            categories["NONE"].push(c);
    });

    var categoryChannels = guild.channels.cache.filter(channel => channel.type === "GUILD_CATEGORY").sort((a,b) => a.position - b.position);
    categoryChannels.forEach(cat => {
        var sortedChannels = cat.children.sort((a,b) => a.position - b.position).filter(c => c.permissionsFor(interaction.member).has("VIEW_CHANNEL"));
        console.log(cat.name, sortedChannels.size);
        sortedChannels.forEach(c => {
            if (!categories[cat.name]) categories[cat.name] = [];
            categories[cat.name].push(c);
        });
    }); 

    function displayChannel(c)
    {
        //TODO: check admin perms   
        if (c.topic)
            return `**<#${c.id}>** - *${c.topic}*`;
        return `**<#${c.id}>**`;
    }

    
    await interaction.editReply({
        content:"Here are the channels in the server:",
    });
    var info = "";
    if (categories["NONE"])
    {
        var info = categories["NONE"].map(displayChannel).join("\n");
        info += "\n";

        delete categories["NONE"];

        await interaction.followUp({ content: info, ephemeral: true });
    }

    await asyncForEach(Object.entries(categories), async (kvp) => {
        var cat = kvp[0];
        var channels = kvp[1];
        var info = `***${cat}***\n`;
        
        //need to split it up into chunks if too big, so can't do it this elegant way.
        //info += channels.map(displayChannel).join("\n");
        await asyncForEach(channels.map(displayChannel), async (c) => 
        {
            if ((info + c + "\n").length > 1900)
            {
                await interaction.followUp({ content: info, ephemeral: true });
                info = "";
            }
            info += c+"\n";
        });
        if (info.length > 0)
        {
            await interaction.followUp({ content: info, ephemeral: true });
        }
    });

}
