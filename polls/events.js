import { MessageActionRow, MessageButton } from 'discord.js';
import { send } from '../core/client.js';
import { pluralize } from '../core/utils.js';

import { GUILD_CACHE } from "../guild/guild.js";
import * as config from "../core/config.js";
import { registerCommand } from '../guild/commands.js';

export default async function(client)
{
   console.log("init_poll_events");

    //commands (/stats)
    // The data for our command
    const pollCommand = {
        name: config.POLL_COMMAND,
        description: 'Ask everyone a question. Displays a poll graph with buttons for voting. Different voting styles supported.',
        options: [
            { name: 'question', type: 'STRING', description: 'The poll question', required: true, },
            //TODO: options for: vote-once-only, hide-results (with admin reveal later), vertical, etc
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
            
            { name: "poll_emoji", type: "STRING", required: false, description: "What should the bar chart look like? Defaults to █" },
            { name: "multi_vote", type: "BOOLEAN", required: false, description: "Can people vote on more than one option?" },
            { name: "allow_undo", type: "BOOLEAN", required: false, description: "Can people remove their vote and change their mind?" },
        ],
    };
    
    
    var guilds = client.guilds.cache;
    await guilds.each( async (guild) => { 
        await registerCommand(guild, pollCommand);
    });

    client.on('interactionCreate', async function(interaction) 
    {
        // If the interaction isn't a slash command, return
        if (!interaction.isCommand() || interaction.isApplicationCommand()) return;
    
        // Check if it is the correct command
        if (interaction.commandName === config.POLL_COMMAND) 
        {
            doPollCommand(interaction);
        }
    });

}

export async function doPollCommand(interaction, scheduledOptions)
{
    var interaction_id = interaction.id;

    var question = scheduledOptions ? scheduledOptions.question : interaction.options.getString("question", true);
    var poll_emoji = scheduledOptions ? scheduledOptions.poll_emoji : interaction.options.getString("poll_emoji") ?? "█"; //":white_large_square:"
    var multi_vote = scheduledOptions ? scheduledOptions.multi_vote : interaction.options.getBoolean("multi_vote") ?? true;
    var allow_undo = scheduledOptions ? scheduledOptions.allow_undo : interaction.options.getBoolean("allow_undo") ?? true;

    //var pollAuthor = interaction.user.id;

    var latestFollowUp; //this stores a message, that we can update later

    var results = [];    
    var answers = [];
    var options = [];
    var currentRow = [];
    for (let i = 1; i <= 16; i++) 
    {
        if (currentRow.length >= 5)
        {
            options.push(currentRow);
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
    options.push(currentRow);

    function createButtons()
    {
        var id = 0;
        var rows = [];
        for (let i = 0; i < options.length; i++) {
            const row = new MessageActionRow();
            var addedAComponent = false;
            for (let j = 0; j < options[i].length; j++) {
                const option = options[i][j];
                row.addComponents(
                    new MessageButton()
                        .setCustomId("poll_option_"+interaction_id+"_"+id++) //TODO: this may need unique?
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
        if (!latestFollowUp)
        {
            var adminRow = new MessageActionRow();
            var seeVotesButton = new MessageButton()
                .setCustomId("poll_"+interaction_id+"_see_results") //TODO: this may need unique?
                .setLabel("See Votes")// (Poll Poster Only)") <-- bring this back if we enable this option
                .setStyle('SECONDARY')
                //.setEmoji('😄') ///TODO: emoji like ABC?
            
            adminRow.addComponents(seeVotesButton);
            rows.push(adminRow);
        }

        return rows;
    }

    function resultsText()
    {
        var resultsEmbed = {
            title: question,
            fields: [],
            thumbnail: { 
                url:interaction.guild.iconURL() //this is null and at this point I don't care lol
            }
        };

        
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

        GUILD_CACHE[interaction.guild.id].latestRoboLindsPoll = resultsEmbed;
        GUILD_CACHE[interaction.guild.id].latestRoboLindsPollTimestamp = interaction.createdTimestamp;

        return resultsEmbed;
    }
    
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
            if (interaction.followUp)
            {
                try
                {
                    latestFollowUp = await interaction.followUp(postContent);
                }
                catch (DiscordAPIError) //invalid webook error, more than 15 mins have passed
                {
                    latestFollowUp = await send(interaction.channel, postContent);
                }
            }
            else
            {
                latestFollowUp = await send(interaction.channel, postContent);
            }
        }
    }

    const collector = interaction.channel.createMessageComponentCollector({ time: 150000000 });
    collector.on('collect', async i => {
        
        if (i.customId.startsWith("poll_option_"+interaction_id+"_")) {
            //await i.deferUpdate();
            //await wait(4000);

            var answer = parseInt(i.customId.replace("poll_option_"+interaction_id+"_", ""));
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
                        await i.update({ embeds: [ resultsText() ], components: createButtons() });
                        return;
                    }
                }
            }

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
            }
            
            await i.update({ embeds: [ resultsText() ], components: createButtons() });

            if (latestFollowUp)
            {
                await seeResults();
            }
        }
        else
        {
            if (i.customId == "poll_"+interaction_id+"_see_results")
            {
                //if (i.user.id == pollAuthor) //an option for this? or just ok i think
                {
                    await seeResults();
        
                    await i.update({ embeds: [ resultsText() ], components: createButtons() });
                }
            }
        }
    });
    
    collector.on('end', collected => console.log(`Collected ${collected.size} items`));

    await interaction.reply({embeds: [ resultsText() ], components: createButtons()});
}
