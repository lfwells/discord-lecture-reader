import e from 'express';
import * as config from '../core/config.js';
import { send } from "../core/client.js";
import { handleAwardNicknames, isAwardChannelID, getAwardChannel, getAwardByEmoji, getAwardEmoji, getAwardName, getAwardList } from "./awards.js";

export default async function(client)
{
    client.on('message', async (msg) => 
    {
        if (await isAwardChannelID(msg.channel))
        {
            //detect update to awards (add)
            console.log("message added in off topics list");
            handleAwardNicknames(client, msg.channel);
        }
    });

    client.on('messageUpdate', async(msg) =>
    {
        if (await isAwardChannelID(msg.channel))
        {
            //detect update to awards (edit)
            console.log("message update in off topics list");
            handleAwardNicknames(client, msg.channel);
        }
    });

    client.on('messageDelete', async(msg) =>
    {
        if (await isAwardChannelID(msg.channel))
        {
            //detect update to awards (delete)
            console.log("message delete in off topics list");
            handleAwardNicknames(client, msg.channel);
        }
    });

    // The data for our command
    const flexCommand = {
        name: 'flex',
        description: 'Replies with your earned awards!',
        options: [{
            name: 'user',
            type: 'USER',
            description: 'The user to see the awards for (leave blank for YOU)',
            required: false,
        }],
    };
    const awardCommand = {
        name: 'award', 
        description: 'Gives an award to a user',
        /*defaultPermission:false,
        permissions: [
            {
                id: "801718054487719936",
                type: 1,
                permission: true
            }
        ],*/
        options: [{
            name: 'user',
            type: 'USER',
            description: 'The user to give the award to',
            required: true,
        },{
            name: 'award_emoji',
            type: 'STRING',
            description: 'The emoji to represent the award',
            required: true,
        }],
    };
    const awardNewCommand = {
        name: 'awardnew', 
        description: 'Gives an award to a user',
        /*defaultPermission:false,
        permissions: [
            {
                id: "801718054487719936",
                type: 1,
                permission: true
            }
        ],*/
        options: [{
            name: 'user',
            type: 'USER',
            description: 'The user to give the award to',
            required: true,
        },{
            name: 'award_emoji',
            type: 'STRING',
            description: 'The emoji to represent the award',
            required: true,
        },{
            name: 'award_text',
            type: 'STRING', 
            description: 'The text to use for the title of the award (use only if creating a new award)',
            required: true,
        }],
    };
  
    // Creating a guild-specific command
    var guilds = client.guilds.cache;
    //store them in the db
    guilds.each( async (guild) => { 
        var commands = await guild.commands.fetch();
        await commands.each(async (c) => {
            await c.delete();
        });
        await guild.commands.create(flexCommand); 
        await guild.commands.create(awardCommand); 
        await guild.commands.create(awardNewCommand); 
    });

    client.on('interaction', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (!interaction.isCommand()) return;
        
        console.log("got interaction", interaction.commandName, interaction.options.length);
    
        // Check if it is the correct command
        if (interaction.commandName === "flex") 
        {
            var member;
            if (interaction.options.length > 0) 
            {
                member = await interaction.guild.members.fetch(interaction.options[0].value.replace("<@", "").replace(">", "").replace("!", ""));
            }
            else
            {
                member = interaction.member;
            }

            var awardsObj = await getAwardList(interaction.guild, member);
            var awards = [];
            for(var emoji in awardsObj)
            {
                awards.push(emoji+" "+awardsObj[emoji]); 
            }

            var flex = "<@"+member.id+"> has "+awards.length+" award" + (awards.length == 1 ? "" : "s") +"\n"+awards.join("\n");
            if (awards.length == 0) 
            {
                flex += ":(";
            }
            await interaction.reply(flex);
        }
        else if (interaction.commandName == "award" || interaction.commandName == "awardnew")
        {
            if (interaction.user.id == config.LINDSAY_ID || interaction.user.id == config.IAN_ID)
            {
                if (interaction.options.length >= 1)
                {
                    var awardChannel = await getAwardChannel(interaction.guild);

                    var member = await interaction.guild.members.fetch(interaction.options[0].value.replace("<@", "").replace(">", "").replace("!", ""));

                    var emoji = interaction.options[1].value;
                    var award = await getAwardByEmoji(interaction.guild, emoji);
                    console.log("award", member.id, award);
                    if (award)
                    {
                        var content = award.content+"\n<@"+member.id+">";
                        //found the award, just append the name
                        console.log(award.author);
                        if (award.author != client.user)
                        {
                            await award.delete();
                            await send(awardChannel, content);
                        }
                        else
                        {
                            await award.edit(content);
                        }
                        var awardCount = Object.keys(await getAwardList(interaction.guild, member)).length;
                        await interaction.reply("<@"+member.id+"> just earned "+getAwardEmoji(award)+" "+getAwardName(award)+"!\nThey have now have "+awardCount+" achievement"+(awardCount == 1 ? "" : "s")+".");
                    }
                    else
                    {
                        //new award
                        if (interaction.commandName == "awardnew" && (interaction.options.length >= 2) )
                        {
                            var award_text = interaction.options[2].value;
                            await send(awardChannel, emoji+" ***"+award_text+"***\n<@"+member.id+">");

                            var awardCount = Object.keys(await getAwardList(interaction.guild, member)).length;
                            await interaction.reply("<@"+member.id+"> just earned "+emoji+" ***"+award_text+"***! (Brand new award 🤩!)\nThey have now have "+awardCount+" achievement"+(awardCount == 1 ? "" : "s")+".");
                        }
                        else
                        {
                            await interaction.reply("No award found for "+emoji+" -- use /awardnew");
                        }
                    }
                }
            }
            else
            {
                interaction.reply("You don't have permission to /award achievements.\nSuggesting award details to <@"+config.LINDSAY_ID+">:"+interaction.options.map(o => o.value).join(" "));
            }
        }

    });
}