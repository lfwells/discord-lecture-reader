import { adminCommandOnly, pluralize } from "../core/utils.js";
import { registerCommand } from "../guild/commands.js";

export default async function(client)
{    
    const flagCommand = {
        name: 'Flag Message',
        type: "MESSAGE",
        //description: "Mark a message as a TODO (sent to either TODO channel, or as a DM, depending on config)"
    }; 
    const flagCopyCommand = {
        name: 'copy_flagged',
        description: "(ADMIN ONLY) Takes all flagged messages, and posts them here.",
        options: [
            { 
                name: "type", type: "STRING", description: "How should the messages be copied? (default is Thread)",
                choices: [
                    { name: "Thread", value:"thread" }
                ]
            }
        ]
    }; 
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, flagCommand);
        await registerCommand(guild, flagCopyCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {    
        if (interaction.isContextMenu())
        {
            if (interaction.commandName === "Flag Message") 
            {
                doFlagCommand(interaction);            
            }
        }
        else
        {
            if (interaction.commandName == "copy_flagged")
            {
                doFlagCopyCommand(interaction, false);
            }
            else if (interaction.commandName == "move_flagged")
            {
                doFlagCopyCommand(interaction, false);
            }
        }
    });
}

async function doFlagCommand(interaction, reactMessage, reactedBy)
{
    console.log("Todo command");
    
    await interaction.deferReply({ ephemeral: true });
    if (await adminCommandOnly(interaction)) return;

    var flagged = [];
    await interaction.editReply({ content: `Message flagged. You now have ${pluralize(flagged.length, "message")}.`});
}
async function doFlagCopyCommand(interaction, move)
{
    await interaction.deferReply({ ephemeral: true });
    if (await adminCommandOnly(interaction)) return;

    var flagged = [];
    await interaction.editReply({ content: `Posting ${pluralize(flagged.length, "message")}.` });
}

