import { MessageActionRow, MessageButton } from 'discord.js';
import { getClient, send } from '../core/client.js';
import { adminCommandOnly, pluralize } from '../core/utils.js';

import { getGuildDocument, GUILD_CACHE, saveGuildProperty, setGuildProperty } from "../guild/guild.js";
import * as config from "../core/config.js";
import { getCachedInteraction, registerCommand, storeCachedInteractionData } from '../guild/commands.js';
import { isAdmin } from '../roles/roles.js';

export default async function(client)
{
   console.log("init_poll_events");

    //commands (/stats)
    // The data for our command
    const pollCommand = {
        name: config.POLL_COMMAND,
        description: 'Displays a poll with buttons for voting and a graph. Different voting styles supported.',
        options: [
            { name: 'question', type: 'STRING', description: 'The poll question.', required: true, },
            //TODO: option for vertical??
            //TODO: option for "Correct answer"
            { name: "option_1", type: "STRING", required: false, description: "Option 1" },
            { name: "option_2", type: "STRING", required: false, description: "Option 2" },
            { name: "option_3", type: "STRING", required: false, description: "Option 3" },
            { name: "option_4", type: "STRING", required: false, description: "Option 4" },
            { name: "option_5", type: "STRING", required: false, description: "Option 5" },
            { name: "option_6", type: "STRING", required: false, description: "Option 6" },
            { name: "option_7", type: "STRING", required: false, description: "Option 7" },
            { name: "option_8", type: "STRING", required: false, description: "Option 8" },
            { name: "option_9", type: "STRING", required: false, description: "Option 9" },
            { name: "option_10", type: "STRING", required: false, description: "Option 10" },
            { name: "option_11", type: "STRING", required: false, description: "Option 11" },
            { name: "option_12", type: "STRING", required: false, description: "Option 12" },
            { name: "option_13", type: "STRING", required: false, description: "Option 13" },
            { name: "option_14", type: "STRING", required: false, description: "Option 14" },
            { name: "option_15", type: "STRING", required: false, description: "Option 15" },
            { name: "option_16", type: "STRING", required: false, description: "Option 16" },
            
            { name: "poll_emoji", type: "STRING", required: false, description: "What should the bar chart look like? (defaults to █)." },
            { name: "multi_vote", type: "BOOLEAN", required: false, description: "Can people vote on more than one option? (default true)" },
            { name: "allow_undo", type: "BOOLEAN", required: false, description: "Can people remove their vote and change their mind? (default true)" },
            { name: "restrict_see_results_button", type: "BOOLEAN", required: false, description: "Only the poll creator can show who voted for what? (default true)" },
            { name: "anonymous", type: "BOOLEAN", required: false, description: "Hide the Show Results button (default false)" },
            
        ],
    };
    
    const checklistCommand = {
        name: "checklist",
        description: '(ADMIN) Displays a button for checking off a task.',
        options: [
            { name: 'question', type: 'STRING', description: 'The checklist item.', required: true, },            
        ],
    };

    
    const checklistProgressCommand = {
        name: "checklist_progress",
        description: 'See your own progress for the checklist items. Not shown publicly.',
        options: [
            { name: 'user', type: 'USER', description: '(ADMIN ONLY) The user to see progress for. If left blank, shows the user\s progress.', required: false, },            
        ],
    };
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, pollCommand);
        await registerCommand(guild, checklistCommand);
        await registerCommand(guild, checklistProgressCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {
        if (interaction.isCommand() && interaction.guild)
        {
            if (interaction.commandName === config.POLL_COMMAND) 
            {
                await doPollCommand(interaction);
            }
            if (interaction.commandName === "checklist") 
            {
                await doPollCommand(interaction, {
                    question: interaction.options.getString("question"),
                    options: ["DONE"],
                    hide_results_button: true,
                    poll_emoji: "✅"
                }, true);
            }
            if (interaction.commandName === "checklist_progress") 
            {
                await doChecklistProgressCommand(interaction);
            }
        }
        else if (interaction.isMessageComponent())// && interaction.message.interaction) 
        {        
            if (interaction.customId.startsWith("poll_") || interaction.message.interaction.commandName === config.POLL_COMMAND) 
            {
                console.log((interaction.message.interaction ?? interaction.message).id);
                await doPollCommandButton(interaction, (interaction.message.interaction ?? interaction.message));
            }
        }
    });

}
export async function doPollCommand(interaction, scheduledOptions, checklist)
{
    var pollAuthor = interaction.user?.id ?? scheduledOptions.authorID;
    
    var question = scheduledOptions ? scheduledOptions.question : interaction.options.getString("question", true);
    var results = [];    
    var answers = [];
    var pollOptions = [];
    var currentRow = [];
    for (let i = 1; i <= 16; i++) 
    {
        if (currentRow.length >= 5)
        {
            pollOptions.push(currentRow);
            currentRow = [];
        }
        var option = (scheduledOptions && (i-1) < scheduledOptions.options.length) ? scheduledOptions.options[i-1] : interaction.options != undefined ? interaction.options.getString("option_"+i, false) : null;
        if (option) 
        {
            currentRow.push(option);
            answers.push(option);
            results.push([]);
        }
        else
        {
            if (i == 1) //no options
            {
                answers = ["Yes", "No"];
                currentRow = answers;
                results = [[],[]];
                break;
            }
        }

    }
    pollOptions.push(currentRow);

    await storeCachedInteractionData(interaction.guild, interaction.id, scheduledOptions ? {
        scheduledOptions: JSON.stringify(scheduledOptions),
        results: JSON.stringify(results),
        question,
        answers, 
        pollOptions: JSON.stringify(pollOptions),
        pollAuthor,
        checklist: checklist ?? false
    } : {
        results: JSON.stringify(results),
        question,
        answers, 
        pollOptions: JSON.stringify(pollOptions),
        pollAuthor,
        checklist: checklist ?? false
    });

    var resultsEmbed = await resultsText(interaction.guild, interaction);
    await setGuildProperty(interaction.guild, "latestRoboLindsPoll", JSON.stringify(resultsEmbed));
    await setGuildProperty(interaction.guild, "latestRoboLindsPollTimestamp", interaction.createdTimestamp);
    //GUILD_CACHE[interaction.guild.id].latestRoboLindsPoll = resultsEmbed;
    //GUILD_CACHE[interaction.guild.id].latestRoboLindsPollTimestamp = interaction.createdTimestamp;

    if (scheduledOptions && !checklist)
    {
        return interaction.edit({embeds: [ resultsEmbed ], components: await createButtons(interaction, interaction.channel), content:undefined});
    }
    else
    {
        await interaction.reply({embeds: [ resultsEmbed ], components: await createButtons(interaction, interaction.channel)});
    }
}
async function doPollCommandButton(i, originalInteraction) 
{  
    var cache = await getCachedInteraction(i.guild, originalInteraction.id);
    var scheduledOptions = cache.scheduledOptions ? JSON.parse(cache.scheduledOptions) :undefined;
    var results = JSON.parse(cache.results);
    var question = cache.question;
    var answers = cache.answers;
    var options = JSON.parse(cache.pollOptions);
    var pollAuthor = cache.pollAuthor;
    var checklist = cache.checklist;
    
    var latestFollowUpID = cache.latestFollowUpID;
    var client = await getClient();
    var latestFollowUp = latestFollowUpID ? await i.channel.messages.fetch(latestFollowUpID) : undefined;
    
    var multi_vote = scheduledOptions ? scheduledOptions.multi_vote : cache.options.getBoolean("multi_vote") ?? true;
    var allow_undo = scheduledOptions ? scheduledOptions.allow_undo : cache.options.getBoolean("allow_undo") ?? true;
    var restrict_see_results_button = scheduledOptions ? scheduledOptions.restrict_see_results_button : cache.options.getBoolean("restrict_see_results_button") ?? true;
    var hide_results_button = scheduledOptions ? scheduledOptions.hide_results_button : cache.options.getBoolean("hide_results_button") ?? true;

    async function seeResults()
    {
        var mostVotes = 0;
        var winners = [];
        var content = "***"+question+"***\n\n";
        for (let j = 0; j < results.length; j++) {
            const result = results[j];
            const answer = answers[j];
            content += "***"+answer+"*** -- "+pluralize(result.length, "vote");
            if (result.length > 0) content += "\n"+result.map(u => "<@"+u+">").join(", ")
            content +="\n\n";

            if (result.length == mostVotes)
            {
                mostVotes = result.length;
                winners.push(answer);
            }   
            else if (result.length > mostVotes)
            {
                mostVotes = result.length;
                winners = [answer];
            }
        }

        if (mostVotes > 0)
        {
            content += "***"+winners.join(", ")+"*** had the most votes ("+mostVotes+")"; //TODO: a tie
        }
        
        var postContent ={
            content: content, //ephemeral:true
        };

        if (latestFollowUp)
        {
            await latestFollowUp.edit(postContent);
        }
        else
        {
            if (i.followUp)
            {
                try
                {
                    latestFollowUp = await i.followUp(postContent);
                }
                catch (DiscordAPIError) //invalid webook error, more than 15 mins have passed
                {
                    latestFollowUp = await send(i.channel, postContent);
                }
            }
            else
            {
                latestFollowUp = await send(i.channel, postContent);
            }
            await storeCachedInteractionData(i.guild, originalInteraction.id, {
                latestFollowUpID : latestFollowUp.id
            });
        }
    }

    if (i.customId.startsWith("poll_option_")) 
    {
        
        var answer = parseInt(i.customId.replace("poll_option_", ""));
        var user = i.user.id;
        
        if (multi_vote == false)
        {
            //check all others
            for (let j = 0; j < results.length; j++) {
                if (j == answer) continue;

                const result = results[j];
                if (result.indexOf(user) != -1) 
                {
                    //console.log("voted before, cancel out");
                    //await i.update({ embeds: [ await resultsText(originalInteraction) ]});//, components: await createButtons(originalInteraction) });
                    await i.reply({content: "You've already voted for something else, and the poll creator made it so you can only vote for one thing.", ephemeral:true });
                    return;
                }
            }
        }

        var alreadyReplied = false;
        if (results[answer].indexOf(user) == -1)
        {
            results[answer].push(user); 
            //TODO: you've already voted logic if option turned on
        }
        else
        {
            if (allow_undo)
            {
                results[answer] = results[answer].filter(u => u != user);
            }
            else
            {
                alreadyReplied = true;
                await i.reply({content: "You've already voted for this option, and the poll creator made it so you cannot undo your vote.", ephemeral:true });
                
            }
        }
        
        await storeCachedInteractionData(i.guild, originalInteraction.id, { results: JSON.stringify(results) });

        var resultsEmbed = await resultsText(i.guild, originalInteraction);
        await setGuildProperty(i.guild, "latestRoboLindsPoll", JSON.stringify(resultsEmbed));
        await setGuildProperty(i.guild, "latestRoboLindsPollTimestamp", i.createdTimestamp);

        if (alreadyReplied == false)
        {
            await i.update({ embeds: [ resultsEmbed ]});//, components: await createButtons(originalInteraction) });
        }

        if (latestFollowUp)
        {
            await seeResults(originalInteraction);
        }
    }
    else if (i.customId == "poll_see_results")
    {
        if (restrict_see_results_button == false || i.user.id == pollAuthor) 
        {
            await seeResults();

            await i.update({ embeds: [ await resultsText(i.guild, originalInteraction) ], components: await createButtons(i,i.channel) });
        }
        else
        {
            await i.reply({content: "This option has been disabled for everyone other than the poll author.", ephemeral:true });
        }
    }

}


async function createButtons(interaction, channel)
{
    var cache = await getCachedInteraction(interaction.guild, interaction.id);
    var scheduledOptions = cache.scheduledOptions ? JSON.parse(cache.scheduledOptions) :undefined;
    var options = JSON.parse(cache.pollOptions);
    var latestFollowUpID = cache.latestFollowUpID;
    var client = await getClient();
    var latestFollowUp = latestFollowUpID ? await channel.messages.fetch(latestFollowUpID) : undefined;
    var restrict_see_results_button = scheduledOptions ? scheduledOptions.restrict_see_results_button : interaction.options.getBoolean("restrict_see_results_button") ?? true;
    var hide_results_button = scheduledOptions ? scheduledOptions.hide_results_button : cache.options.getBoolean("hide_results_button") ?? false;


    var id = 0;
    var rows = [];
    for (let i = 0; i < options.length; i++) {
        const row = new MessageActionRow();
        var addedAComponent = false;
        for (let j = 0; j < options[i].length; j++) {
            const option = options[i][j];
            row.addComponents(
                new MessageButton()
                    .setCustomId("poll_option_"+id++) //TODO: this may need unique?
                    .setLabel(option)
                    .setStyle('PRIMARY')
                    //.setEmoji('😄') ///TODO: emoji like ABC?
            );
            addedAComponent = true;
        }
        if (addedAComponent)
            rows.push(row);
    }

    //admin only rows
    if (latestFollowUp == undefined && !hide_results_button)
    {
        var authorOnlyText = "";
        if (restrict_see_results_button) authorOnlyText = " (Poll Author Only)";
        var adminRow = new MessageActionRow();
        var seeVotesButton = new MessageButton()
            .setCustomId("poll_see_results") //TODO: this may need unique?
            .setLabel("See Full Results"+authorOnlyText)// (Poll Poster Only)") <-- bring this back if we enable this option
            .setStyle('SECONDARY')
            //.setEmoji('😄') ///TODO: emoji like ABC?
        
        adminRow.addComponents(seeVotesButton);
        rows.push(adminRow);
    }
    return rows;
}
async function resultsText(guild, interaction)
{
    var cache = await getCachedInteraction(guild, interaction.id);

    var scheduledOptions = cache.scheduledOptions ? JSON.parse(cache.scheduledOptions) : undefined;
    var options = cache.pollOptions ? JSON.parse(cache.pollOptions) : undefined;
    var question = cache.question;
    var answers = cache.answers;
    var results = cache.results ? JSON.parse(cache.results) : undefined;
    var checklist = cache.checklist ?? false;
    
    var poll_emoji = scheduledOptions ? scheduledOptions.poll_emoji : cache.options.getString("poll_emoji") ?? "█"; //":white_large_square:"

    var resultsEmbed = {
        title: question,
        fields: [],
        thumbnail: checklist ? null : { 
            url:guild.iconURL() //this is null and at this point I don't care lol
        }
    };

    if (checklist)
    {
        var result = results[0].length ?? 0;
        resultsEmbed.description = poll_emoji.repeat(result)+ " "+result+(result == 1 ? " person completed." : " people completed.");
    }
    else
    {
        var text = "";
        for (let i = 0; i < answers.length; i++) {
            const answer = answers[i];
            const result = results[i].length;
            
            resultsEmbed.fields.push({
                name: answer,
                //two liner
                //value: pluralize(result, "vote")+"\n"+(result == 0 ? "‎" : poll_emoji.repeat(result) )
                value: poll_emoji.repeat(result)+ " "+pluralize(result, "vote")
            });
        }
    }

    return resultsEmbed;
}


//TODO: deleted checklist items
//TODO: see all who have completed an item (ADMIN ONLY)
async function doChecklistProgressCommand(interaction)
{
    var user = interaction.options.getMember("user");
    if (user && await adminCommandOnly(interaction)) return;

    await interaction.deferReply({ ephemeral: true });

    if (!user)
    {
        user = interaction.member;
    }

    var items = [];
    
    //go through all interactions in the guild document
    var guildDocument = await getGuildDocument(interaction.guild.id);
    var interactionsCollection = guildDocument.collection("interactions");
    //flter by commandName == "checklist"
    var checklistDocuments = await interactionsCollection.where("commandName", "==", "checklist").get();
    checklistDocuments.forEach(doc => {
        //read .results as a JSON.parse()
        //data appears to be results[0][...]
        var data = doc.data();
        if (!data.deleted)
        {
            var results = data.results ? JSON.parse(data.results) : [[]];
            items[data.question] = results[0].findIndex(r => r == user.id) >= 0;
        }
      });

    await interaction.editReply({ content: Object.entries(items).map(e => {
        if (e[1])
            return "✅ "+e[0];
        else
            return "🔲 "+e[0];
    }).join("\n") });
}