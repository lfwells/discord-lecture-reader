import { getClient } from "../core/client.js";
import { beginStreamingRes } from "../core/server.js";
import { asyncForEach, pluralize } from "../core/utils.js";
import { guessConfigurationValue } from "../guild/guild.js";

export async function guide(req,res,next)
{
    res.render("guide", {
        guilds: req.guilds
    });
}
export async function downloadMyLOGuideFile(req,res,next)
{
    res.download(`www/guide/discord_for_students.html`);
}

export async function postRules(req,res,next)
{
    var client = getClient();

    beginStreamingRes(res);

    var rulesChannel = await guessConfigurationValue(req.guild, "rulesChannelID", true); //convert = true
    if (!rulesChannel)
    {
        res.write(`No #rules channel found. Cannot complete operation.`);
    }
    else
    {
        res.write(`Found #rules channel.\n`);

        var messages = await rulesChannel.messages.fetch({ limit: 10 });

        //delete past messages from bot
        var botMessages = messages.filter(m => m.author == null || m.author.id == client.user.id);
        await Promise.all(botMessages.map( async (m) => 
        { 
            await m.delete();
            res.write("Deleted a rules message previously posted by the bot.\n")
        })
        );;


        messages = messages.filter(m => m.author != null && m.author.id != client.user.id);
        if (messages.size > 0)
        {
            res.write(`\nFound existing ${pluralize(messages.size, "messsage")} not posted by the bot in the rules channel. \n--You should probably delete them!\n\n`);
        }

        res.write(`Posting rules...\n`);
        try
        {
            await rulesChannel.send({
                embeds:[{
                    title:req.body.rulesText.split("\n")[0],
                    description:req.body.rulesText.substr(req.body.rulesText.indexOf("\n"))
                }]
            });
        }
        catch (e)
        {
            res.write("\n\n"+e.message);
            return res.end();
        }

        res.write(`Rules posted!\n`);
    }

    res.end();
}

export async function configureWelcomeScreen(req,res,next)
{
    beginStreamingRes(res);

    var description = req.body.description;

    var welcomeChannels = [];

    //introduce yourself
    var channel = req.guild.channels.cache.find(c => c.type == "GUILD_TEXT" && (c.name === "introduce-yourself"));
    res.write(`Found channel ${channel.name}.\n`);
    if (channel)
    {
        var c = {
            description: 'Get to know everyone!',
            emoji: "👋",
            channel: channel.id,
        };
        welcomeChannels.push(c);
    }
    else
    {
        res.write("Couldn't find #introduce-yourself channel, skipping...\n");
    }

    //assignment-questions
    channel = req.guild.channels.cache.find(c => c.type == "GUILD_TEXT" && (c.name === "assignment-questions" || c.name.startsWith("assignment")));
    res.write(`Found channel ${channel.name}.\n`);
    if (channel)
    {
        var c = {
            description: 'Ask the class/staff for help',
            emoji: "🙋",
            channel: channel.id,
        };
        welcomeChannels.push(c);
    }
    else
    {
        res.write("Couldn't find #assignment-questions channel, skipping...\n");
    }

    //lecture-chat
    channel = await guessConfigurationValue(req.guild, "lectureChannelID", true); //convert = true
    res.write(`Found channel ${channel.name}.\n`);
    if (channel)
    {
        var c = {
            description: 'Chat during the live lectures',
            emoji: "🧑‍🏫",
            channel: channel.id,
        };
        welcomeChannels.push(c);
    }
    else
    {
        res.write("Couldn't find #lecture-chat channel, skipping...\n");
    }

    //consultation-chat
    channel = req.guild.channels.cache.find(c => c.type == "GUILD_TEXT" && (c.name === "consultation-chat"));
    res.write(`Found channel ${channel.name}.\n`);
    if (channel)
    {
        var c = {
            description: 'Attend consultation time',
            emoji: "🧠",
            channel: channel.id,
        };
        welcomeChannels.push(c);
    }
    else
    {
        res.write("Couldn't find #consultation-chat channel, skipping...\n");
    }

    try
    {
        var result = await req.guild.editWelcomeScreen({
            description: description,
            enabled: true,
            welcomeChannels: welcomeChannels
        });
    }
    catch (e)
    {
        res.write("\n\n"+e.message);
        return res.end();
    }
    console.log(result);

    res.write("\nWelcome Screen Configured.");

    res.end();
}

//TODO: this should use bold etc, but when i replace with db it will all be different anyhows
export async function postAwards(req,res,next)
{
    var client = getClient();

    beginStreamingRes(res);

    var awardsChannel = await guessConfigurationValue(req.guild, "awardChannelID", true); //convert = true
    if (!awardsChannel)
    {
        res.write(`No #achievements channel found. Cannot complete operation.`);
    }
    else
    {
        res.write(`Found ${awardsChannel.name} channel.\n`);

        res.write(`Posting Achievements...\n`);
        var awards = req.body.awards.split("\n");
        for (let i = 0; i < awards.length; i++) {
            awards[i] = awards[i].replace("<li>", "");
            awards[i] = awards[i].replace("</li>", "");
            awards[i] = awards[i].trim();
        }
        
        try
        {
            await asyncForEach(awards, async (a) => {
                if (a == "") return;
                res.write(`Posting ${a}\n`);
                await awardsChannel.send({ content:a });
            });
        }
        catch (e)
        {
            res.write("\n\n"+e.message);
            return res.end();
        }

        res.write(`\nAchievements Posted!\n`);
    }

    res.end();
}