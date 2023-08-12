import { getClient, send } from "../core/client.js";
import { showText } from "../lecture_text/routes.js";
import { baseName, handleAwardNicknames, isAwardChannelID, getAwardChannel, getAwardByEmoji, getAwardList, giveAward, getLeaderboard, getAwardEmoji, getAwardName, getAwardNominationsCount, getAwardDocument, getAwardDisplayName, nominateForAward, getAwardCanNominate, getAwardRequiredNominations, useLegacyAwardsSystem, getAwardAsField, getAwardsDatabase, getAwardsCollection, awardExists, hasAward, getAwardsDocuments } from "./awards.js";
import { pluralize, offTopicCommandOnly, adminCommandOnly } from '../core/utils.js';
import { getClassList } from '../classList/classList.js';
import { getGuildProperty, getGuildPropertyConverted, hasFeature } from '../guild/guild.js';
import { getCachedInteraction, registerCommand, storeCachedInteractionData } from '../guild/commands.js';
import { setGuildContextForInteraction } from "../core/errors.js";
import { ROBO_LINDSAY_ID } from "../core/config.js";
import { appendAuthorProfileLink } from "../profile/profile.js";
import { MessageActionRow, MessageButton, MessageSelectMenu } from "discord.js";

export default async function(client)
{
    client.on('messageCreate', async(msg) =>
    {
        if (msg.type === 'GUILD_MEMBER_JOIN') return;
        
        if (await isAwardChannelID(msg.channel))
        {
            if (!(await useLegacyAwardsSystem(msg.guild))) return;

            //detect update to awards (add)
            console.log("message added in achievements channel");
            handleAwardNicknames(client, msg.channel);
        }

        if (msg.author.id != ROBO_LINDSAY_ID)
        {
            //also, we can check for posts in an auto-pop channel
            var awards = await getAwardsDatabase(msg.guild);
            var awardsForThisChannel = awards.docs.filter(award => award.data().autoPopChannel == msg.channel.id);
            
            //TODO alow for just nominations instead of autopop, for now just autopop
            for (var award of awardsForThisChannel)
            {
                if (await hasAward(award, msg.member) == false)
                {
                    if (award.data().onlyNominateWhenPostInChannel ?? false)
                    {
                        var nominationResult = await nominateForAward(msg, award, msg.member, msg.member);
                        console.log({nominationResult});
                    }
                    else
                    {
                        var achievementEmbed = await giveAward(msg.guild, award, msg.member);
                        var channel = award.data().popInPostedChannel ? msg.channel : (await getGuildPropertyConverted("awardPopChannelID", msg.guild) ?? (await getGuildPropertyConverted("offTopicChannelID", msg.guild) ?? (await getGuildPropertyConverted("generalChannelID", msg.guild) ?? msg.channel)));   
                        channel.send({embeds:[achievementEmbed]});
                    }
                }
            }
        }
    });

    client.on('messageUpdate', async(msg) =>
    {
        if (await isAwardChannelID(msg.channel))
        {
            if (!(await useLegacyAwardsSystem(msg.guild))) return;

            //detect update to awards (edit)
            console.log("message update in achievements channel");
            handleAwardNicknames(client, msg.channel);
        }
    });

    client.on('messageDelete', async(msg) =>
    {
        if (await isAwardChannelID(msg.channel))
        {
            //if (!(await useLegacyAwardsSystem(msg.guild))) return;

            //detect update to awards (delete)
            console.log("message delete in achievements channel");
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
        //defaultPermission: true,
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
            required: false,
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
    const awardContextMenuCommand = {
        name: 'Give Award (ADMIN ONLY)',
        type: 'MESSAGE',
    }
    const nomCommand = {
        name: 'nom', 
        description: 'Nominate a user to get an award. If enough nominations are given, the award may be awarded.',
        //defaultPermission: true,
        /*permissions: [
            {
                id: ,
                type: 1,
                permission: true
            }
        ],*/
        options: [{
            name: 'award',
            type: 'STRING',
            description: 'The emoji of the award',
            required: true,
        },{
            name: 'user',
            type: 'USER',
            description: 'The user to nominate for the award (defaults to YOU)',
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
        await registerCommand(guild, flexCommand);
        await registerCommand(guild, awardCommand);
        await registerCommand(guild, nomCommand);
        //await registerCommand(guild, awardNewCommand); 
        await registerCommand(guild, leaderboardCommand);
        await registerCommand(guild, awardContextMenuCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {
        setGuildContextForInteraction(interaction);
        
        if (interaction.isContextMenu())
        {
            if (interaction.commandName === awardContextMenuCommand.name) 
            {
                doAwardContextMenuCommand(interaction);          
            }
            return;
        } 

        if (interaction.isMessageComponent())// && interaction.message.interaction) 
        {        
            console.log({interaction});
            if (interaction.customId.startsWith("award_select")) 
            {
                await doAwardCommandSelectBoxInteraction(interaction, (interaction.message.interaction ?? interaction.message));
            }
            else if (interaction.customId.startsWith("award_"))
            {
                await doAwardCommandSelectBoxInteraction(interaction, (interaction.message.interaction ?? interaction.message), interaction.customId.replace("award_", ""));
            }
        }
        
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
        else if (interaction.commandName === "nom") 
        {
            doNomCommand(interaction);
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
    if (typeof(member) == "string")
    {
        member = await interaction.guild.members.fetch(member);
    }

    var awardsObj = await getAwardList(interaction.guild, member);
    console.log({awardsObj});
    var awards = [];
    var useLegacyAwards = await useLegacyAwardsSystem(interaction.guild);
    if (useLegacyAwards)
    {
        for(var emoji in awardsObj)
        {
            awards.push(emoji+" "+awardsObj[emoji]); 
        }        
    }
    else
    {
        for(var doc of awardsObj)
        {
            var d = doc.data();
            d.id = d.emoji = doc.id;
            awards.push(d);
        }
    }
    async function baseFlexEmbed(first) 
    {
        var flexEmbed = {
            title: first ? (member.displayName)+" has "+pluralize(awards.length, "award") : "Continued...",
            fields:[]
        };
        if (member.user)
        {
            flexEmbed.thumbnail = { 
                url:member.user.displayAvatarURL()
            };
        }
        flexEmbed = await appendAuthorProfileLink(flexEmbed, member);
        return flexEmbed;
    }

    var flexEmbeds = [];
    var flexEmbed;

    if (useLegacyAwards ? awardsObj.length == 0 : awards.length == 0)
    {
        flexEmbed = await baseFlexEmbed(true);
        flexEmbed.description = ":(";
        flexEmbeds.push(flexEmbed);
    }

    var i = 0;
    for(var item in useLegacyAwards ? awardsObj : awards)
    {
        if (i % 25 == 0) 
        {
            flexEmbed = await baseFlexEmbed(i == 0);
            flexEmbeds.push(flexEmbed);
        }

        if (useLegacyAwards)
        {
            flexEmbed.fields.push({
                name:item,
                value:awardsObj[item]
            });
        }
        else
        {
            var award = awards[item];
            flexEmbed.fields.push(getAwardAsField(award.emoji, award));
        }
        i++;
    }

    await interaction.editReply({ embeds: flexEmbeds });
    //await interaction.reply(flex);
}
async function doAwardContextMenuCommand(interaction)
{
    if (await adminCommandOnly(interaction)) return;

    await interaction.deferReply({ ephemeral: true });

    let message = await interaction.channel.messages.fetch(interaction.targetId);
    let member = message.member;

    await doAwardDropdownInteraction(interaction, member);
}
async function doAwardDropdownInteraction(interaction, member)
{
    await storeCachedInteractionData(interaction.guild, interaction.id, { member: member.id });

    var awards = await getAwardsDocuments(interaction.guild);

    //look at all awards and find the first one (if any) that has a channel associated with it that matches this interaction's channel
    var awardsForThisChannel = awards.filter(award => award.autoPopChannel == interaction.channel.id);

    //display the awards in groups of 25
    var awardsGroups = [];
    var i = 0;
    for (var award of awards)
    {
        if (i == 25)
        {
            i = 0;
        }
        if (i == 0)
        {
            awardsGroups.push([]);
        }
        awardsGroups[awardsGroups.length-1].push(award);
        i++;
    }

    i = 0;
    const rows = awardsGroups.map(awards => new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId(`award_select_${i++}`)
                .setPlaceholder('Nothing selected')
                .addOptions(awards.map(
                    function (award) { return {
                        label: `${award.emoji} ${award.title}`,
                        value: `award_${award.emoji}`
                    };
                })
            )
        )
    );
    await interaction.editReply({
        content: `Select the Award to give to <@${member.id}>`,
        components: [...rows, ...awardsForThisChannel.map(
            function (award) { return new MessageActionRow().addComponents(
                    new MessageButton()
                            .setCustomId(`award_${award.emoji}`)
                            .setLabel(`${award.title} (intelligently guessed)`)
                            .setStyle('PRIMARY')
                            .setEmoji(award.emoji)
                );
            })
        ]
    });
}
async function doAwardCommandSelectBoxInteraction(i, originalInteraction, emoji) 
{  
    if (await adminCommandOnly(i)) return;

    await i.deferReply();

    let cache = await getCachedInteraction(i.guild, originalInteraction.id);
    let member = cache.member;
    member = await i.guild.members.fetch(member);

    await _doAwardCommand(i, emoji ?? i.values[0].replace("award_", ""), member);
}

async function doAwardCommand(interaction)
{
    if (await adminCommandOnly(interaction)) return;

    var member = interaction.options.getMember("user");
    member = await interaction.guild.members.fetch(member);

    var emoji = interaction.options.getString("award");//interaction.options[1].value;
    if (emoji == undefined)
    {
        await interaction.deferReply({ephemeral: true});
        return await doAwardDropdownInteraction(interaction, member);
    }
    var award_text = interaction.options.getString("title");//interaction.options[2].value;
    var description = interaction.options.getString("description");

    await interaction.deferReply();
    await _doAwardCommand(interaction, emoji, member, award_text, description);
}
async function _doAwardCommand(interaction, emoji, member, award_text, description)
{
    //if (interaction.user.id == config.LINDSAY_ID || interaction.user.id == config.IAN_ID)
    {
        var useLegacyAwards = await useLegacyAwardsSystem(interaction.guild);
        var awardChannel = await getAwardChannel(interaction.guild);

        var award = await getAwardByEmoji(interaction.guild, emoji);
        //console.log("award", member.id, award, emoji);
        if (useLegacyAwards ? award : (await awardExists(award)))
        {
            var achievementEmbed = await giveAward(interaction.guild, award, member); 

            achievementEmbed = await appendAuthorProfileLink(achievementEmbed, member);
            await interaction.editReply({ embeds: [ achievementEmbed ] });
            //await interaction.reply("<@"+member.id+"> just earned "+getAwardEmoji(award)+" "+getAwardName(award)+"!\nThey have now have "+awardCount+" achievement"+(awardCount == 1 ? "" : "s")+".");
        }
        else
        {
            //new award
            if (award_text)
            {
                var achievementEmbed;
                if (useLegacyAwards)
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
                    
                    achievementEmbed = {
                        title:  baseName(member.displayName) + " just earned "+emoji+" "+award_text+"!",
                        description: "<@"+member.id+"> now has "+pluralize(awardCount, "achievement")+"."
                    };
                }
                else
                {
                    var collection = await getAwardsCollection(interaction.guild);
                    var awardDoc = collection.doc(emoji);
                    await awardDoc.set({
                        title: award_text,
                        description
                    });
                    achievementEmbed = await giveAward(interaction.guild, awardDoc, member);
                }
                achievementEmbed.description = achievementEmbed.description + "\n(Brand new award 🤩!)";
                
                achievementEmbed = await appendAuthorProfileLink(achievementEmbed, member);
                await interaction.editReply({ embeds: [ achievementEmbed ]});
            }
            else
            {
                interaction.user.send("No award found for "+emoji+" make sure to set an award text to go with it (yes this is also sometimes shown in error)");
                //interaction.editReply("No award found for "+emoji+" make sure to set an award text to go with it (yes this is also sometimes shown in error)", {ephemeral:true});

                await interaction.deleteReply();
            }
        }
    
    }
    /*else
    {
        interaction.user.send("You don't have permission to `/award` achievements. You can suggest an award to your UC though!");
        //interaction.editReply("You don't have permission to /award achievements. You can suggest an award to Lindsay or Ian though!", {ephemeral:true}); 
        
        await interaction.deleteReply();
    }*/
}
async function doNomCommand(interaction)
{
    var member = interaction.options.getMember("user") ?? interaction.member.id;
    var nominatedSelf = member == interaction.member.id;
    member = await interaction.guild.members.fetch(member);

    var emoji = interaction.options.getString("award");//interaction.options[1].value;

    await interaction.deferReply({ephemeral: true});

    //if (interaction.user.id == config.LINDSAY_ID || interaction.user.id == config.IAN_ID)
    {
        var award = await getAwardDocument(interaction.guild, emoji);
        if (await awardExists(award))
        {
            var result = await nominateForAward(interaction, award, member, interaction.member);

            await interaction.editReply({content: result.message});

            if (result.success)
            {
                await interaction.channel.send({
                    embeds:[{
                        title: (nominatedSelf ? `${member.displayName} nominated themselves for ` : `${interaction.member.displayName} nominated ${member.displayName} for `)+(await getAwardDisplayName(award)),
                        description: `${pluralize(await getAwardNominationsCount(award, member), "Nomination")} made for this user. ${pluralize(await getAwardRequiredNominations(award, interaction.guild), "Nomination")} required.`
                    }]
                })
            }

            if (result.pop)
            {
                var achievementEmbed = await giveAward(interaction.guild, award, member); 
                achievementEmbed = await appendAuthorProfileLink(achievementEmbed, member);
                await interaction.channel.send({ embeds: [ achievementEmbed ] });
                //await interaction.reply("<@"+member.id+"> just earned "+getAwardEmoji(award)+" "+getAwardName(award)+"!\nThey have now have "+awardCount+" achievement"+(awardCount == 1 ? "" : "s")+".");
            }
        }
        else
        {
            await interaction.editReply({content: "That award doesn't exist. Check the emoji correctly. Note that some emojis just don't work for this, if you think this is in error, please contact admin."});
        }
    
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

    statsEmbed = await appendAuthorProfileLink(statsEmbed, interaction.member);
    await interaction.editReply({embeds: [ statsEmbed ]});
}