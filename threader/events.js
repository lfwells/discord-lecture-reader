import { adminCommandOnly, asyncForEach, dateToHuman, pluralize } from "../core/utils.js";
import { registerCommand } from "../guild/commands.js";
import { addFlaggedMessage, clearFlaggedMessages, getFlaggedMessageIDs, getFlaggedMessages, removeFlaggedMessage } from "./threader.js";

export default async function(client)
{    
    /*TODO:

    make the progress ephemeral work properly

    handle images etc
    */
    const flagCommand = {
        name: 'Flag Message',
        type: "MESSAGE",
        //description: "Mark a message as a TODO (sent to either TODO channel, or as a DM, depending on config)"
    }; 
    const unflagCommand = {
        name: 'Un-flag Message',
        type: "MESSAGE",
        //description: "Mark a message as a TODO (sent to either TODO channel, or as a DM, depending on config)"
    }; 
    const flaggedMessagesCommand = {
        name: 'flagged',
        description: "(ADMIN ONLY) Handles messages you have flagged with right-click.",
        options: [
            {
                name: "copy", type:"SUB_COMMAND", description: "Copy the flagged messages here.",
                options: 
                [
                    { 
                        name: "type", type: "STRING", description: "How should the messages be copied? (default is Thread)",
                        choices: [
                            { name: "Thread", value:"thread", description: "Post indvidual messages in a seperate thread." },
                            { name: "Combined", value:"combined", description: "Post as a big Discord embed" },
                            { name: "Messages", value:"messages", description: "Post as individual messages here." }
                        ]
                    },
                    {
                        name: "thread_name", type: "STRING", description: "If using thread mode (default), then this is what name the thread should have."
                    }
                ]
            },
            {
                name: "move", type:"SUB_COMMAND", description: "Move the flagged messages here.",
                options: 
                [
                    { 
                        name: "type", type: "STRING", description: "How should the messages be moved? (default is Thread)",
                        choices: [
                            { name: "Thread", value:"thread", description: "Post indvidual messages in a seperate thread." },
                            { name: "Combined", value:"combined", description: "Post as a big Discord embed" },
                            { name: "Messages", value:"messages", description: "Post as individual messages here." }
                        ]
                    },
                    {
                        name: "thread_name", type: "STRING", description: "If using thread mode (default), then this is what name the thread should have."
                    }
                ]
            },
            {
                name: "clear", type:"SUB_COMMAND", description: "Clear the messages you have flagged (doesn't delete them).",
            },
            {
                name: "preview", type:"SUB_COMMAND", description: "See which messages you have flagged (doesn't post publically).",
            }
        ]
    }; 
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, flagCommand);
        await registerCommand(guild, unflagCommand);
        await registerCommand(guild, flaggedMessagesCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {    
        if (interaction.isContextMenu())
        {
            if (interaction.commandName === "Flag Message") 
            {
                doFlagCommand(interaction);            
            }
            else if (interaction.commandName === "Un-flag Message") 
            {
                doUnflagCommand(interaction);            
            }
        }
        else
        {
            if (interaction.commandName == "flagged")
            {
                var subCommand = interaction.options.getSubcommand();
                if (subCommand === "copy")
                {
                    doFlagCopyCommand(interaction, false);
                }
                else if (subCommand === "move")
                {
                    doFlagCopyCommand(interaction, true);
                }
                else if (subCommand === "clear")
                {
                    doFlagClearCommand(interaction);
                }
                else if (subCommand === "preview")
                {
                    doFlagPreviewCommand(interaction);
                }
            }
        }
    });
}

async function doFlagCommand(interaction)
{
    console.log("Flag command");
    
    await interaction.deferReply({ ephemeral: true });
    if (await adminCommandOnly(interaction)) return;

    await addFlaggedMessage(interaction.guild, interaction.user, interaction.targetId, interaction.channel.id);
    var flagged = await getFlaggedMessageIDs(interaction.guild, interaction.user);
    await interaction.editReply({ content: `Message flagged. You now have ${pluralize(flagged.length, "message")}.`});
}
async function doUnflagCommand(interaction)
{
    console.log("Unflag command");
    
    await interaction.deferReply({ ephemeral: true });
    if (await adminCommandOnly(interaction)) return;

    var found = await removeFlaggedMessage(interaction.guild, interaction.user, interaction.targetId, interaction.channel.id);
    var flagged = await getFlaggedMessageIDs(interaction.guild, interaction.user);
    if (found)
        await interaction.editReply({ content: `Message un-flagged. You now have ${pluralize(flagged.length, "message")}.`});
    else
        await interaction.editReply({ content: `Message was not previously flagged, no action taken. You have ${pluralize(flagged.length, "message")}.`});
}


async function doFlagCopyCommand(interaction, move)
{
    await interaction.deferReply({ ephemeral: false });
    if (await adminCommandOnly(interaction)) return;

    var flagged = await getFlaggedMessages(interaction.guild, interaction.user);

    var type = (interaction.options.getString("type") ?? "thread");
    if (type == "thread")
    {
        var postedMessage = await interaction.editReply({ content: `${move ? "Moved" : "Copied"} ${pluralize(flagged.length, "message")}.` });
        
        //headMessage = await interaction.channel.post({ content: "" });
        const thread = await postedMessage.startThread({//await interaction.channel.threads.create({
            name: interaction.options.getString("thread_name") ?? "New Thread",
            reason: 'Needed a separate thread for flagged messages.',
        });
        await postIndividualMessages(thread, flagged);
    }
    else if (type == "combined")
    {
        var combinedEmbed = {
            title: `${move ? "Moved" : "Copied"} ${pluralize(flagged.length, "message")}.`,
            fields: []
        };
        await asyncForEach(flagged, async (message)  => {
            combinedEmbed.fields.push({
                name: `**<@${message.author.id}>** - *${dateToHuman(message.createdAt)}*`,
                value: message.content
            });
        });
        await interaction.editReply({ embeds: [combinedEmbed] });
    }
    else
    {
        var postedMessage = await interaction.editReply({ content: `${move ? "Moved" : "Copied"} ${pluralize(flagged.length, "message")}.` });
        await postIndividualMessages(interaction, flagged);
    }

    if (move)
    {
        await asyncForEach(flagged, async (message) => await message.delete());
    }
    await clearFlaggedMessages(interaction.guild, interaction.user);
    
}
async function postIndividualMessages(postIn, messages, ephemeral)
{
    await asyncForEach(messages, async (message) => 
    {
        var msg = {
            content: `**<@${message.author.id}>** - *${dateToHuman(message.createdAt)}*\n> ${message.content}`,
        };
        if (ephemeral)
        {
            msg.ephemeral = ephemeral ?? false;
        }

        if (postIn.followUp)
            await postIn.followUp(msg);
        else
            await postIn.send(msg)
    });
}



async function doFlagClearCommand(interaction)
{
    await interaction.deferReply({ ephemeral: true });
    if (await adminCommandOnly(interaction)) return;

    var deleteCount = await clearFlaggedMessages(interaction.guild, interaction.user);

    await interaction.editReply({ content: `Cleared ${pluralize(deleteCount, "flagged message")}.`});
}
async function doFlagPreviewCommand(interaction)
{
    await interaction.deferReply({ ephemeral: true });
    if (await adminCommandOnly(interaction)) return;
    
    var flagged = await getFlaggedMessages(interaction.guild, interaction.user);
    await interaction.editReply({ content: `${pluralize(flagged.length, "flagged message")}.`});

    await postIndividualMessages(interaction, flagged, true); //ephemeral = true
}