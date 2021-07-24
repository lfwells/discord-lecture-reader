import e from 'express';
import * as config from '../core/config.js';
import { send } from "../core/client.js";
import { showText } from "../lecture_text/routes.js";
import { baseName, handleAwardNicknames, isAwardChannelID, getAwardChannel, getAwardByEmoji, getAwardEmoji, getAwardName, getAwardList } from "./awards.js";
import { pluralize } from '../core/utils.js';

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
  
    var guilds = client.guilds.cache;

    await guilds.each( async (guild) => { 
        var commands = await guild.commands.fetch(); 
            for (const command in commands)
            {
                console.log(guild.name+"delete "+await command.delete());
            }
        /*console.log(guild.name+"add "+*/await guild.commands.create(flexCommand);//); 
        /*console.log(guild.name+"add "+*/await guild.commands.create(awardCommand);//); 
        /*console.log(guild.name+"add "+*/await guild.commands.create(awardNewCommand);//); 
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
                        var awardNameForShow = getAwardName(award);
                        if (awardNameForShow.lastIndexOf("*") > 0)
                            awardNameForShow = awardNameForShow.substring(0, awardNameForShow.lastIndexOf("*")).replace("*", "").replace("*", "").replace("*", "").replace("*", "").replace("*", "").replace("*", "");
                        if (awardNameForShow.length > 32)
                            awardNameForShow = awardNameForShow.substring(0, 32)+"...";
                        showText({ guild: interaction.guild }, { text: baseName(member.displayName)+" earned\n"+getAwardEmoji(award)+" "+awardNameForShow+"!", style:"yikes" });

                        var achievementEmbed = {
                            title: (member.nickname ?? member.username) + " just earned "+getAwardEmoji(award)+" "+getAwardName(award)+"!",
                            description: "They have now have "+pluralize(awardCount, "achievement")+"."
                        };
                        await interaction.reply({ embed: achievementEmbed });
                        //await interaction.reply("<@"+member.id+"> just earned "+getAwardEmoji(award)+" "+getAwardName(award)+"!\nThey have now have "+awardCount+" achievement"+(awardCount == 1 ? "" : "s")+".");
                    }
                    else
                    {
                        //new award
                        if (interaction.commandName == "awardnew" && (interaction.options.length >= 2) )
                        {
                            var award_text = interaction.options[2].value;
                            await send(awardChannel, emoji+" ***"+award_text+"***\n<@"+member.id+">");

                            var awardCount = Object.keys(await getAwardList(interaction.guild, member)).length;
                            var awardNameForShow = award_text;
                            if (awardNameForShow.lastIndexOf("*") > 0)
                                awardNameForShow = awardNameForShow.substring(0, awardNameForShow.lastIndexOf("*")).replace("*", "").replace("*", "").replace("*", "").replace("*", "").replace("*", "").replace("*", "");
                            if (awardNameForShow.length > 32)
                                awardNameForShow = awardNameForShow.substring(0, 32)+"...";
                            showText({ guild: interaction.guild }, { text: baseName(member.displayName)+" earned\n"+emoji+" "+awardNameForShow+"!", style:"yikes" });     
                            
                            var achievementEmbed = {
                                title: (member.nickname ?? member.username) + " just earned "+getAwardEmoji(award)+" "+getAwardName(award)+"!",
                                description: "(Brand new award 🤩!)\nThey have now have "+pluralize(awardCount, "achievement")+"."
                            };
                            await interaction.reply({ embed: achievementEmbed });
                            //await interaction.reply("<@"+member.id+"> just earned "+emoji+" ***"+award_text+"***! (Brand new award 🤩!)\nThey have now have "+awardCount+" achievement"+(awardCount == 1 ? "" : "s")+".");
                        }
                        else
                        {
                            await interaction.reply("No award found for "+emoji+" -- use /awardnew", { ephemeral: true });
                        }
                    }
                }
            }
            else
            {
                interaction.reply("You don't have permission to /award achievements.\nSuggesting award details to <@"+config.LINDSAY_ID+">:"+interaction.options.map(o => {
                    return isNumeric(o.value) ? "<@"+o.value+">" : o.value
                }).join("\n")); 
            }
        }

    });
}

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
  }