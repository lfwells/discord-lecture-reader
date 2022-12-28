import { setGuildContextForInteraction } from "../core/errors.js";
import { adminCommandOnly } from "../core/utils.js";
import { registerCommand } from "../guild/commands.js";
import * as Config from "../core/config.js";

export default async function(client)
{    
    const sendCommand = {
        name: 'send',
        description: "(ADMIN ONLY) Make the Bot Post a Message.",
        options: 
        [
            { 
                name: "content", type: "STRING", description: "What should the message be",
            },
            {
                name: "embed", type: "BOOLEAN", required: false, description: "Should the message appear as an embed? Default = false"
            },
            {
                name: "reply_to", type: "STRING", required: false, description: "Optional Message ID to reply to"
            },
            { 
                name: "secondary_content", type: "STRING", description: "(For embeds only) The sub-title to show in the embed.",
            },
        ]

    }; 
    const editCommand = {
        name: 'edit',
        description: "(ADMIN ONLY) Edit a message the Bot has posted.",
        options: 
        [
            { 
                name: "message_id", type: "STRING", description: "The Discord message ID of the message to be edited", required:true
            },
            { 
                name: "content", type: "STRING", description: "What should the message content be", required:true,
            },
        ]

    }; 
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, sendCommand);
        await registerCommand(guild, editCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {    
        setGuildContextForInteraction(interaction);
        
        if (interaction.commandName == "send")
        {
            doSendCommand(interaction);
        }
        else if (interaction.commandName == "edit")
        {
            doEditCommand(interaction);
        }
    
    });
}

async function doSendCommand(interaction)
{
    await interaction.deferReply({ ephemeral: true });
    if (await adminCommandOnly(interaction)) return;

    var content = interaction.options.getString("content");
    if (content)
    {
        var channel = interaction.channel;

        var embed = interaction.options.getBoolean("embed") ?? false;
        if (embed)
        {
            var e = { title: content };
            var secondaryContent = interaction.options.getString("secondary_content");
            e.description = secondaryContent;
            content = {
                embeds: [
                    e
                ]
            };
        }
        else
        {
            content = { content };
        }

        var replyTo = interaction.options.getString("reply_to");
        if (replyTo)
        {
            var msg = await channel.messages.fetch(replyTo);
            await msg.reply(content);
        }
        else
        {
            await channel.send(content);
        }
        await interaction.editReply({ content: "Posted" });
    }
    else
    {
        await interaction.editReply({ content: "You need to enter some content to post!" });
    }
}


async function doEditCommand(interaction)
{
    await interaction.deferReply({ ephemeral: true });
    if (await adminCommandOnly(interaction)) return;

    var messageID = interaction.options.getString("message_id");
    var newContent = interaction.options.getString("content");
   
    var channel = interaction.channel;
    var msg = await channel.messages.fetch(messageID);

    if (msg)
    {
        await edit(msg, newContent, interaction);
    }
    else
    {
        await interaction.editReply({ content: "Message not found." });
    }

}


async function edit(messageObject, newContent, interaction)
{
    if (messageObject.author.id == Config.ROBO_LINDSAY_ID)
    {
        await messageObject.edit({content:newContent});
        await interaction.editReply({ content: "Message edited." });
    }
    else
    {
        await interaction.editReply({ content: "Message was not posted by the bot." });
    }
}