import { setGuildContextForInteraction } from "../core/errors.js";
import { adminCommandOnly } from "../core/utils.js";
import { registerCommand } from "../guild/commands.js";
import * as Config from "../core/config.js";
import { Modal, MessageActionRow, MessageButton, TextInputComponent } from 'discord.js';

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
    const editContextCommand = {
        name: 'Edit Bot Message (ADMIN ONLY)',
        type: "MESSAGE",
        //description: "Mark a message as a TODO (sent to either TODO channel, or as a DM, depending on config)"
    }; 
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, sendCommand);
        await registerCommand(guild, editCommand);
        await registerCommand(guild, editContextCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {    
        setGuildContextForInteraction(interaction);

        if (interaction.isModalSubmit()) 
        {
            doEditModalSubmit(interaction);
        }
        else if (interaction.isContextMenu())
        {
            if (interaction.commandName === "Edit Bot Message (ADMIN ONLY)") 
            {
                doEditModal(interaction);            
            }
        }
        else
        {
            if (interaction.commandName == "send")
            {
                doSendCommand(interaction);
            }
            else if (interaction.commandName == "edit")
            {
                doEditCommand(interaction);
            }
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

//TODO: this should instead pop up a modal, instead of getting new content from the command (or make that optional)
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

async function doEditModal(interaction)
{

    var messageID = interaction.targetId;
   
    var channel = interaction.channel;
    var msg = await channel.messages.fetch(messageID);
    console.log({msg, c:msg.content});

    if (msg)
    {
        const modal = new Modal()
			.setCustomId('editMessage_'+messageID)
			.setTitle('Edit Bot Message (ADMIN ONLY)');
		// Add components to modal
		// Create the text input components
		const newContentInput = new TextInputComponent()
			.setCustomId('newContent')
		    // The label is the prompt the user sees for this input
			.setLabel("Enter the new content for this bot message")
		    // Short means only a single line of text
			.setStyle('PARAGRAPH')
            .setValue(msg.content ?? "enter");
		// An action row only holds one text input,
		// so you need one action row per text input.
		const firstActionRow = new MessageActionRow().addComponents(newContentInput);
		// Add inputs to the modal
		modal.addComponents(firstActionRow);
		// Show the modal to the user
		await interaction.showModal(modal);


        ///on action:
        //await edit(msg, newContent, interaction);
    }
}
async function doEditModalSubmit(interaction)
{
    await interaction.deferReply({ ephemeral: true });
    if (await adminCommandOnly(interaction)) return;

    var messageID = interaction.customId.replace("editMessage_", "");
    var channel = interaction.channel;
    var msg = await channel.messages.fetch(messageID);

    // Get the data entered by the user
	const newContent = interaction.fields.getTextInputValue('newContent');
	await edit(msg, newContent, interaction);
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