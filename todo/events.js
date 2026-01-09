import { getCachedInteraction, registerCommand } from "../guild/commands.js";
import { getGuildProperty, getGuildPropertyConverted, hasFeature } from "../guild/guild.js";
import { isAdmin } from "../roles/roles.js";
import { MessageActionRow, MessageButton } from 'discord.js';
import { setGuildContextForInteraction } from "../core/errors.js";

export default async function(client)
{    
    const todoCommand = {
        name: 'Mark TODO',
        type: "MESSAGE",
        //description: "Mark a message as a TODO (sent to either TODO channel, or as a DM, depending on config)"
    }; 
    const todoSlashCommand = {
        name: 'todo',
        description: "Mark a message as a TODO (sent to either TODO channel, or as a DM, depending on config)"
    }; 
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, todoCommand);
        await registerCommand(guild, todoSlashCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {    
        setGuildContextForInteraction(interaction);
        
        if (interaction.isContextMenu())
        {
            if (interaction.commandName === "Mark TODO") 
            {
                doTodoCommand(interaction);            
            }
        } 
        else if (!interaction.isMessageComponent())
        {
            if (interaction.commandName === "todo") 
            {
                doTodoCommand(interaction);             
            }
        }
        else if (interaction.isMessageComponent() && interaction.message.interaction)
        {
            if (interaction.message.interaction.commandName === "Mark TODO") 
            {
                await doTodoCommandButton(interaction, await getCachedInteraction(interaction.guild, interaction.message.interaction.id));
            }
        }
    });

    client.on('messageReactionAdd', async (reaction, user) => {
        console.log("messageReactionAdd", reaction);
        // When a reaction is received, check if the structure is partial
        if (reaction.partial) {
            // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message:', error);
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }
    
        var todoEmoji = await getGuildProperty("todoEmoji", reaction.message.guild, "");
        console.log("reaction.emoji.name", reaction.emoji.name, todoEmoji, todoEmoji == reaction.emoji.name);
        if (todoEmoji == reaction.emoji.name)
        {
            doTodoCommand(null, reaction.message, user);   
        }
    });

}

async function doTodoCommand(interaction, reactMessage, reactedBy)
{
    console.log("Todo command");
    //this can take too long to reply, so we immediately reply
    if (interaction) await interaction.deferReply({ ephemeral: true });

    if (interaction)
    {
        if (await hasFeature(interaction.guild, "todos") == false) 
        {
            return await interaction.editReply("The TODO feature hasn't been enabled on this server.");
        }
    }

    //TODO: allow option to inform user that they have been marked as a todo?

    var originalMessage = reactMessage ?? await interaction.channel.messages.fetch(interaction.targetId);
    //console.log(originalMessage);

    var message = {
        //title:"TODO",
        author:{
            name: (originalMessage.member ? originalMessage.member.displayName : "Unknown Author")
        },
        description:originalMessage.cleanContent
    };

    
    var ephemeralComponents = [];
    if (originalMessage.member)
    {
        const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId("letThemKnow")
                .setLabel(`Let ${originalMessage.member.displayName} know you've marked this as a TODO`)
                .setStyle('PRIMARY')
        );
        ephemeralComponents = [ row ];
    }

    var files = [...originalMessage.attachments.values()];

    //only allow if user is admin
    var member = reactMessage ? reactMessage.member : interaction.member;
    var user = reactMessage ? reactMessage.member.user : interaction.user;
    if (await isAdmin(member) == false)
    {
        if (reactMessage) return; //don't let non-admins do the emoji-react version, they will stumble on it

        var post = await user.send({ embeds:[message], content:"New TODO: "+originalMessage.url, files });
        if (interaction) interaction.editReply({ content:"TODO sent as a DM "+post.url, components: ephemeralComponents});
    }
    else
    {
        var todoChannel = await getGuildPropertyConverted("todoChannelID", interaction ? interaction.guild : reactMessage.guild);
        if (todoChannel)
        {
            var post = await todoChannel.send({ embeds:[message], content:"New TODO:"+originalMessage.url, files });   
            if (interaction) interaction.editReply({ content:"TODO sent to <#"+todoChannel.id+"> "+post.url, components: ephemeralComponents});
        }
        else
        {
            if (await isAdmin(interaction.member))
            {
                var post = await interaction.user.send({ embeds:[message], content:"New TODO (note: you can get these messages in a todo channel if you configure it): "+originalMessage.url, files });
                if (interaction) interaction.editReply({ content:"TODO sent as a DM "+post.url, components: ephemeralComponents});
            }
            else
            {
                var post = await interaction.user.send({ embeds:[message], files });
                if (interaction) interaction.editReply({ content:"TODO sent as a DM "+post.url, components: ephemeralComponents});
            }
        }
        if (reactMessage)
            reactMessage.reply({content: `Your message has been marked as a TODO by <@${reactedBy.id}>`});
    }
}
async function doTodoCommandButton(i, originalInteraction)
{
    if (i.customId === 'letThemKnow') {
        var originalMessageID = originalInteraction.options.getMessage();
        var originalMessage = await i.channel.messages.fetch(originalMessageID);
        originalMessage.reply({
            content: `Your message has been marked as a TODO by <@${i.member.id}>.`
        });
        
        await i.update({ content: i.content, components:[] });
    }
}

