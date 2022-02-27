import { getClient } from "../core/client.js";
import { adminCommandOnly, asyncForEach, dateToHuman, pluralize } from "../core/utils.js";
import { registerCommand } from "../guild/commands.js";
import { getGuildDocument, getGuildProperty, loadGuildProperty, setGuildProperty } from "../guild/guild.js";
import { addFlaggedMessage, clearFlaggedMessages, deleteFlaggedDocument, getFlaggedMessageIDs, getFlaggedMessages, getForums, postFlaggedMessagesEphemeral, removeFlaggedMessage } from "./threader.js";

export default async function(client)
{    
    /*TODO:

    make the progress ephemeral work properly (needs to be DM qq)
    admin permissions bs
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
                name: "copy", type:"SUB_COMMAND", description: "(ADMIN ONLY) Copy the flagged messages here.",
                options: 
                [
                    { 
                        name: "type", type: "STRING", description: "(ADMIN ONLY) How should the messages be copied? (default is Auto)",
                        choices: [
                            { name: "Auto (Default)", value:"auto", description: "Only posts a thread if multiple messages are flagged, else just posts the message." },
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
                name: "move", type:"SUB_COMMAND", description: "(ADMIN ONLY) Move the flagged messages here.",
                options: 
                [
                    { 
                        name: "type", type: "STRING", description: "How should the messages be moved? (default is Auto)",
                        choices: [
                            { name: "Auto (Default)", value:"auto", description: "Only posts a thread if multiple messages are flagged, else just posts the message." },
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
                name: "clear", type:"SUB_COMMAND", description: "(ADMIN ONLY) Clear the messages you have flagged (doesn't delete them).",
            },
            {
                name: "preview", type:"SUB_COMMAND", description: "(ADMIN ONLY) See which messages you have flagged (doesn't post publically).",
            }
        ]
    }; 
    const forumChannel = {
        name: 'forum_channel',
        description: "(ADMIN ONLY) convert the current channel into a threads-only channel (like a forum)."
    }; 
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, flagCommand);
        await registerCommand(guild, unflagCommand);
        await registerCommand(guild, flaggedMessagesCommand);
        await registerCommand(guild, forumChannel);
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
            else if (interaction.commandName == "forum_channel")
            {
                doForumChannelCommand(interaction);
            }
        }
    });

    client.on("threadCreate", doForumListen);
}

async function doFlagCommand(interaction)
{
    console.log("Flag command");
    
    await interaction.deferReply({ ephemeral: true });
    //await interaction.deleteReply();

    if (await adminCommandOnly(interaction)) return;

    var flaggedMessage = await interaction.channel.messages.fetch(interaction.targetId);
    var added = await addFlaggedMessage(interaction.guild, interaction.user, interaction.targetId, interaction.channel.id);
    var flagged = await getFlaggedMessageIDs(interaction.guild, interaction.user);
    if (added)
    {
        var msg = { content: `Message flagged. You now have ${pluralize(flagged.length, "flagged message")}. ${flaggedMessage.url}`};
        //await postFlaggedMessagesEphemeral(interaction, msg);
        //await interaction.user.send(msg);
        await interaction.editReply(msg);
    }
    else
    {
        var msg = { content: `Message was already flagged, no action taken. You have ${pluralize(flagged.length, "flagged message")}. ${flaggedMessage.url}`};
        //await postFlaggedMessagesEphemeral(interaction, msg);
        //await interaction.user.send(msg);
        await interaction.editReply(msg);
    }
}
async function doUnflagCommand(interaction)
{
    console.log("Unflag command");
    
    await interaction.deferReply({ ephemeral: true });
    //await interaction.deleteReply();

    if (await adminCommandOnly(interaction)) return;

    var flaggedMessage = await interaction.channel.messages.fetch(interaction.targetId);
    var found = await removeFlaggedMessage(interaction.guild, interaction.user, interaction.targetId, interaction.channel.id);
    var flagged = await getFlaggedMessageIDs(interaction.guild, interaction.user);
    if (found)
    {
        var msg = { content: `Message un-flagged. You now have ${pluralize(flagged.length, "flagged message")}. ${flaggedMessage.url}`};
        //await postFlaggedMessagesEphemeral(interaction, msg);
        //await interaction.user.send(msg);
        await interaction.editReply(msg);
    }
    else
    {
        var msg = { content: `Message was not previously flagged, no action taken. You have ${pluralize(flagged.length, "flagged message")}. ${flaggedMessage.url}`};
        //await postFlaggedMessagesEphemeral(interaction, msg);
        //await interaction.user.send(msg);
        await interaction.editReply(msg);
    }
}


async function doFlagCopyCommand(interaction, move)
{
    var messages = await getFlaggedMessageIDs(interaction.guild, interaction.user);

    var type = (interaction.options.getString("type") ?? "auto");
    if (type == "auto")
    {
        if (messages.length == 1) type = "message";
        else type = "thread";
    }
    if (type == "combined" && messages.length > 25)
    {
        type = "thread";
    }

    await interaction.deferReply({ ephemeral: type != "thread" });
    if (await adminCommandOnly(interaction)) return;

    var flagged = await getFlaggedMessages(interaction.guild, interaction.user);

    
    if (type == "thread")
    {
        var postedMessage = await interaction.editReply({ content: `${move ? "Moving" : "Copying"} ${pluralize(flagged.length, "message")}.` });
        
        //headMessage = await interaction.channel.post({ content: "" });
        const thread = await postedMessage.startThread({//await interaction.channel.threads.create({
            name: interaction.options.getString("thread_name") ?? "New Thread",
            reason: 'Needed a separate thread for flagged messages.',
        });
        await postIndividualMessages(thread, flagged);
        
        await interaction.editReply({ content: `${move ? "Moved" : "Copied"} ${pluralize(flagged.length, "message")}.` });
    }
    else if (type == "combined")
    {
        var combinedEmbed = {
            title: `${move ? "Moved" : "Copied"} ${pluralize(flagged.length, "message")}.`,
            fields: []
        };
        await asyncForEach(flagged, async (message)  => {
            combinedEmbed.fields.push({
                //name: `**<@${message.author.id}>** - *${dateToHuman(message.createdAt)}*`,
                name: `${message.member.displayName} - ${dateToHuman(message.createdAt)}`,
                value: message.content
            });
        });
        await interaction.followUp({ embeds: [combinedEmbed] });
    }
    else
    {
        var postedMessage = await interaction.editReply({ content: `${move ? "Moving" : "Copying"} ${pluralize(flagged.length, "message")}.` });
        await postIndividualMessages(interaction, flagged);
        var postedMessage = await interaction.editReply({ content: `${move ? "Moved" : "Copied"} ${pluralize(flagged.length, "message")}.` });
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
        console.log(message.attachments);
        msg.files = [...message.attachments.values()];
/*
        if (postIn.followUp)
            await postIn.followUp(msg);
        else*/
        if (postIn.send)
            await postIn.send(msg)
        else 
            await postIn.channel.send(msg);
    });innerWidth
}



async function doFlagClearCommand(interaction)
{
    await interaction.deferReply({ ephemeral: true });
    if (await adminCommandOnly(interaction)) return;

    var deleteCount = await deleteFlaggedDocument(interaction.guild, interaction.user);

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

async function doForumChannelCommand(interaction)
{
    await interaction.deferReply({ ephemeral: true });

    if (await adminCommandOnly(interaction)) return;

    var channel = interaction.channel;

    var forums = await getForums(interaction.guild);
    if (forums[channel.id])
    {
        return await interaction.editReply({ content: "Channel is already a forum." });
    }
    
    var post = await interaction.channel.send({
        content: "This channel is a forum-style channel. To make a post, press the `+` button to create a new thread.",
        //TODO: image
    });

    
    await channel.permissionOverwrites.edit(interaction.guild.id, { 
        SEND_MESSAGES: false,
        CREATE_PUBLIC_THREADS: true,
     });

    await channel.permissionOverwrites.edit(getClient().user.id, { 
        SEND_MESSAGES: true 
    });

    forums[channel.id] = { post: post.id };
    await setGuildProperty(interaction.guild, "forums", forums);

    await interaction.editReply({ content: `This channel is now a forum channel. To undo this, modify the channel permissions.`});
}

//this reposts the forum instructions
async function doForumListen(thread)
{
    var forums = await getForums(thread.guild);
    var forumInfo = forums[thread.parentId];
    if (forumInfo)
    {
        console.log(thread.parentId, forumInfo);
        var instructionsPost = await thread.parent.messages.fetch(forumInfo.post);
        var post = await thread.parent.send({
            content: instructionsPost.content
        });
        await instructionsPost.delete();

        forums[thread.parentId].post = post.id;

        //TODO: store the thread ids? meh

        await setGuildProperty(thread.guild, "forums", forums);
    }
}