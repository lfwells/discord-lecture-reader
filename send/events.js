import { reply } from "../core/client.js";
import { setGuildContextForInteraction } from "../core/errors.js";
import { adminCommandOnly } from "../core/utils.js";
import { registerCommand } from "../guild/commands.js";

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
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, sendCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {    
        setGuildContextForInteraction(interaction);
        
        if (interaction.commandName == "send")
        {
            doSendCommand(interaction);
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
