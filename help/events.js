import { asyncFilter } from '../core/utils.js';
import { allCommandData, commandEnabledForGuild, registerApplicationCommand } from '../guild/commands.js';
import { getGuildProperty } from '../guild/guild.js';

export default async function(client)
{
    var helpCommand = {
        name: "help",
        description: "List all the commands the bot can run."
    }
    await registerApplicationCommand(client, helpCommand);

    client.on('interactionCreate', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (!interaction.isApplicationCommand()) return;

        if (interaction.commandName === "help") 
        {
            await doHelpCommand(interaction);            
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

    var commands = await asyncFilter(Object.entries(allCommandData), async (c) => interaction.guild == undefined || await commandEnabledForGuild(c[0], interaction.guild));

    await interaction.editReply({
        content:"Here are the commands that you can run on me!"+note,
        embeds: [
            {
                title: botName+" Commands",
                thumbnail: await interaction.client.user.displayAvatarURL(),
                fields:commands.map((kvp) => {
                    var key = kvp[0];
                    var data = kvp[1];

                    var optionsText = "";
                    if (data.options && data.options.length > 0)
                    {
                        var options = data.options.map(o => o.required ? o.name : "["+o.name+"]");
                        optionsText = " "+ options.join(" ");
                    }

                    return {
                        name:"`/"+key+optionsText+"`",
                        value:data.description
                    }
                })
            }
        ]
    });
}