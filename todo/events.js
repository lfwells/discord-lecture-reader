import { Permissions } from "discord.js";
import { getGuildPropertyConverted } from "../guild/guild.js";

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
        var commands = await guild.commands.fetch(); 
        for (const command in commands)
        {
            console.log(guild.name+"delete "+await command.delete());
        }
        /*console.log(guild.name+"add "+*/await guild.commands.create(todoCommand);//); 
        /*console.log(guild.name+"add "+*/await guild.commands.create(todoSlashCommand);//); 
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

}

async function doTodoCommand(interaction)
{
    console.log("Todo command");
    //this can take too long to reply, so we immediately reply
    await interaction.deferReply({ ephemeral: true });
    //TODO: allow option to inform user that they have been marked as a todo?

    var originalMessage = await interaction.channel.messages.fetch(interaction.targetId);
    console.log(originalMessage);

    var message = {
        //title:"TODO",
        author:{
            name: (originalMessage.member && originalMessage.member.nickname) ?? originalMessage.user.username
        },
        description:originalMessage.cleanContent
    };

    //only allow if user is admin
    if (interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) == false)
    {
        var post = await interaction.user.send({ embeds:[message], content:"New TODO: "+originalMessage.url });
        interaction.editReply("TODO sent as a DM "+post.url);
    }
    else
    {

        var todoChannel = await getGuildPropertyConverted("todoChannelID", interaction.guild);
        if (todoChannel)
        {
            var post = await todoChannel.send({ embeds:[message], content:"New TODO:"+originalMessage.url });   
            interaction.editReply("TODO sent to <#"+todoChannel.id+"> "+post.url);
        }
        else
        {
            var post = await interaction.user.send({ embeds:[message], content:"New TODO (note: you can get these messages in a todo channel if you configure it): "+originalMessage.url });
            interaction.editReply("TODO send as a DM "+post.url);
        }
    }
}
