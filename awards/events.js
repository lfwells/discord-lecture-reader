import e from 'express';
import * as config from '../core/config.js';
import { send } from "../core/client.js";
import { showText } from "../lecture_text/routes.js";
import { baseName, handleAwardNicknames, isAwardChannelID, getAwardChannel, getAwardByEmoji, getAwardEmoji, getAwardName, getAwardList, giveAward, getAwardListFullData, getLeaderboard } from "./awards.js";
import { pluralize, offTopicCommandOnly } from '../core/utils.js';
import { getClassList } from '../core/classList.js';
import { hasFeature } from '../guild/guild.js';
import { registerCommand } from '../guild/commands.js';

export default async function(client)
{
    client.on('interactionCreate', async (msg) => 
    {
        if (msg.isCommand() || msg.guild == undefined) return;

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
        description: 'Replies with your earned awards (only allowed in off-topic channel).',
        options: [{
            name: 'user',
            type: 'USER',
            description: 'The user to see the awards for (leave blank for YOU).',
            required: false,
        }, {
            name: 'public',
            type: 'BOOLEAN',
            description: 'Should everyone see this post? (default: true)',
            required: false,
        }],
    };
    const awardCommand = {
        name: 'award', 
        description: 'Gives an award to a user (admin only)',
        defaultPermission: true,
        /*permissions: [
            {
                id: ,
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
            name: 'award',
            type: 'STRING',
            description: 'The emoji to represent the award',
            required: true,
        },{
            name: 'title',
            type: 'STRING', 
            description: 'The text to use for the title of the award (use only if creating a new award)',
            required: false,
        },{
            name: 'description',
            type: 'STRING', 
            description: 'The text to use for the description of the award (use only if creating a new award)',
            required: false,
        }],
    }; 
    /*
    const awardNewCommand = {
        name: 'awardnew', 
        description: 'old, and I don\'t know how to delete this lol',
        defaultPermission: false,
    };*/
    const leaderboardCommand = {
        name: 'leaderboard',
        description: 'Replies with the top 10 award earners (only allowed in off-topic channel).',
        options: [{
            name: 'public',
            type: 'BOOLEAN',
            description: 'Should everyone see this post? (default: false)',
            required: false,
        }],
    };
  
    var guilds = client.guilds.cache;

    await guilds.each( async (guild) => { 
        
        var awardCommand2 = JSON.parse(JSON.stringify(awardCommand));
        /* TODO: this still doesnt work!
        var admin = (await getAdminRole(guild));
        if (admin)
        {
            awardCommand2.permissions = [
                {
                    id: admin.id,
                    type: "ROLE",
                    permission: true
                }
            ];
        }*/
            
        await registerCommand(guild, flexCommand);
        await registerCommand(guild, awardCommand2);
        //await registerCommand(guild, awardNewCommand); 
        await registerCommand(guild, leaderboardCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (!interaction.isCommand() || interaction.guild == undefined) return;

        if (["flex", "award", "leaderboard"].indexOf(interaction.commandName) >= 0)
        {
            if (await hasFeature(interaction.guild, "achievements") == false)
            {
                interaction.reply({
                    content: "Achievement System not enabled on this server",
                    ephemeral: true
                });
                return;
            }
        }

            
        // Check if it is the correct command
        if (interaction.commandName === "flex") 
        {
            doFlexCommand(interaction);
        }
        else if (interaction.commandName == "award"/* || interaction.commandName == "awardnew"*/)
        {
            doAwardCommand(interaction);
        }
        else if (interaction.commandName === "leaderboard") 
        {
            doLeaderboardCommand(interaction);
        }

        //TODO a command for who has an achievmeent (even tho u can see this in the #acheivmenets channel)
        //TODO a compare command

    });
}

async function doFlexCommand(interaction)
{
    var publicPost = interaction.options.getBoolean("public") ?? true;

    //only allow in off topic
    if (publicPost && await offTopicCommandOnly(interaction)) return;

    await interaction.deferReply({ ephemeral: !publicPost });

    var member = interaction.options.getMember("user") ?? interaction.member;

    var awardsObj = await getAwardList(interaction.guild, member);
    var awards = [];
    for(var emoji in awardsObj)
    {
        awards.push(emoji+" "+awardsObj[emoji]); 
    }

    var flexEmbed = {
        title: (member.nickname ?? member.username)+" has "+pluralize(awards.length, "award"),
        thumbnail: { 
            url:member.user.displayAvatarURL()
        },
        fields:[]
    };

    if (awards.length == 0)
    {
        flexEmbed.description = ":(";
    }
    var i = 0;
    for(var emoji in awardsObj)
    {
        if (i == 25) break;//discord max
        flexEmbed.fields.push({
            name:emoji,
            value:awardsObj[emoji]
        });
        i++;
    }
    await interaction.editReply({ embeds: [ flexEmbed ] });
    //await interaction.reply(flex);
}
async function doAwardCommand(interaction)
{
    var member = interaction.options.getMember("user");
    member = await interaction.guild.members.fetch(member);

    var emoji = interaction.options.getString("award");//interaction.options[1].value;
    var award_text = interaction.options.getString("title");//interaction.options[2].value;
    var description = interaction.options.getString("description");

    await interaction.deferReply();

    if (interaction.user.id == config.LINDSAY_ID || interaction.user.id == config.IAN_ID)
    {
        
        var awardChannel = await getAwardChannel(interaction.guild);

        var award = await getAwardByEmoji(interaction.guild, emoji);
        //console.log("award", member.id, award, emoji);
        if (award)
        {
            var achievementEmbed = await giveAward(interaction.guild, award, member); 
            await interaction.editReply({ embeds: [ achievementEmbed ] });
            //await interaction.reply("<@"+member.id+"> just earned "+getAwardEmoji(award)+" "+getAwardName(award)+"!\nThey have now have "+awardCount+" achievement"+(awardCount == 1 ? "" : "s")+".");
        }
        else
        {
            //new award
            if (award_text)
            {
                award_text = "***"+award_text+"***";
                if (description)
                {
                    award_text = award_text + " --- " + description;
                }

                await send(awardChannel, emoji+" "+award_text+"\n<@"+member.id+">");

                var awardCount = Object.keys(await getAwardList(interaction.guild, member)).length;
                var awardNameForShow = award_text;
                if (awardNameForShow.lastIndexOf("*") > 0)
                    awardNameForShow = awardNameForShow.substring(0, awardNameForShow.lastIndexOf("*")).replace("*", "").replace("*", "").replace("*", "").replace("*", "").replace("*", "").replace("*", "");
                if (awardNameForShow.length > 32)
                    awardNameForShow = awardNameForShow.substring(0, 32)+"...";
                showText({ guild: interaction.guild }, { text: baseName(member.displayName)+" earned\n"+emoji+" "+awardNameForShow+"!", style:"yikes" });     
                
                var achievementEmbed = {
                    title:  baseName(member.displayName) + " just earned "+emoji+" "+award_text+"!",
                    description: "(Brand new award 🤩!)\n<@"+member.id+"> now has "+pluralize(awardCount, "achievement")+"."
                };
                await interaction.editReply({ embeds: [ achievementEmbed ]});
            }
            else
            {
                interaction.user.send("No award found for "+emoji+" make sure to set an award text to go with it (yes this is also sometimes shown in error)");
                //interaction.editReply("No award found for "+emoji+" make sure to set an award text to go with it (yes this is also sometimes shown in error)", {ephemeral:true});
            }
        }
    
    }
    else
    {
        interaction.user.send("You don't have permission to `/award` achievements. You can suggest an award to your UC though!");
        //interaction.editReply("You don't have permission to /award achievements. You can suggest an award to Lindsay or Ian though!", {ephemeral:true}); 
    }
}

async function doLeaderboardCommand(interaction)
{
    var publicPost = interaction.options.getBoolean("public") ?? false;

    //only allow in off topic
    if (publicPost && await offTopicCommandOnly(interaction)) return;

    await interaction.deferReply({ ephemeral: !publicPost });

    var awardsData = await getLeaderboard(interaction.guild, await getClassList(interaction.guild));

    var statsEmbed = {
        title: "Achievement Leaderboard",
        fields: [],
        thumbnail: { 
            url:interaction.guild.iconURL() //this is null and at this point I don't care lol
        }
    };
    for (var i = 0; i < Math.min(awardsData.length, 10); i++)
    {
        statsEmbed.fields.push({
            name:awardsData[i].discordName,
            value:pluralize(awardsData[i].awards.length, "Achievement")
        });
    }

    await interaction.editReply({embeds: [ statsEmbed ]});
}