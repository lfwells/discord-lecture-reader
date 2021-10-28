import { Permissions } from "discord.js";
import { getGuildPropertyConverted } from "../guild/guild.js";

export default async function(client)
{    
    const todoCommand = {
        name: 'Mark TODO',
        type: "MESSAGE"
    }; 
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        var commands = await guild.commands.fetch(); 
        for (const command in commands)
        {
            console.log(guild.name+"delete "+await command.delete());
        }
        /*console.log(guild.name+"add "+*/await guild.commands.create(todoCommand);//); 
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
    });

}

async function doTodoCommand(interaction)
{
    console.log("Todo command");
    //this can take too long to reply, so we immediately reply
    //await interaction.deferReply();

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
        interaction.user.send({ embeds:[message], content:"New TODO:" });
        return;
    }

    var todoChannel = await getGuildPropertyConverted("todoChannelID", interaction.guild);
    if (todoChannel)
    {
        todoChannel.send({ embeds:[message], content:"New TODO:" });   
    }
    else
    {
        interaction.user.send({ embeds:[message], content:"New TODO (note: you can get these messages in a todo channel if you configure it):" });
    }
}