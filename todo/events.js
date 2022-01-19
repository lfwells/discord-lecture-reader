import { Permissions } from "discord.js";
import { getGuildProperty, getGuildPropertyConverted } from "../guild/guild.js";

export default async function(client)
{    
    const todoCommand = {
        name: 'Mark TODO',
        type: "MESSAGE"
    }; 
    const todoSlashCommand = {
        name: 'todo',
        description: "Mark a message as a TODO (sent to either TODO channel, or as a DM, depending on config)"
    }; 
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        //await guild.commands.create(todoCommand);
        //await guild.commands.create(todoSlashCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (!interaction.isContextMenu()) return;
    
        // Check if it is the correct command
        if (interaction.commandName === "Mark TODO") 
        {
            doTodoCommand(interaction);            
        }
        if (interaction.commandName === "todo") 
        {
            doTodoCommand(interaction);             
        }
    });

    client.on('messageReactionAdd', async (reaction, user) => {
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
        //console.log("reaction.emoji.name", reaction.emoji.name, todoEmoji, todoEmoji == reaction.emoji.name);
        if (todoEmoji == reaction.emoji.name)
        {
            doTodoCommand(null, reaction.message);   
        }
    });

}

async function doTodoCommand(interaction, reactMessage)
{
    console.log("Todo command");
    //this can take too long to reply, so we immediately reply
    if (interaction) await interaction.deferReply({ ephemeral: true });
    //TODO: allow option to inform user that they have been marked as a todo?

    var originalMessage = reactMessage ?? await interaction.channel.messages.fetch(interaction.targetId);
    //console.log(originalMessage);

    var message = {
        //title:"TODO",
        author:{
            name: (originalMessage.member && originalMessage.member.nickname) ?? originalMessage.user.username
        },
        description:originalMessage.cleanContent
    };

    //only allow if user is admin
    var member = reactMessage ? reactMessage.member : interaction.member;
    var user = reactMessage ? reactMessage.member.user : interaction.user;
    if (member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) == false)
    {
        var post = await user.send({ embeds:[message], content:"New TODO: "+originalMessage.url });
        if (interaction) interaction.editReply("TODO sent as a DM "+post.url);
    }
    else
    {

        var todoChannel = await getGuildPropertyConverted("todoChannelID", interaction ? interaction.guild : reactMessage.guild);
        if (todoChannel)
        {
            var post = await todoChannel.send({ embeds:[message], content:"New TODO:"+originalMessage.url });   
            if (interaction) interaction.editReply("TODO sent to <#"+todoChannel.id+"> "+post.url);
        }
        else
        {
            var post = await interaction.user.send({ embeds:[message], content:"New TODO (note: you can get these messages in a todo channel if you configure it): "+originalMessage.url });
            if (interaction) interaction.editReply("TODO send as a DM "+post.url);
        }
    }
}
