import { getClient } from "../core/client.js";
import { beginStreamingRes } from "../core/server.js";
import { pluralize } from "../core/utils.js";
import { guessConfigurationValue } from "../guild/guild.js";

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
        await rulesChannel.send({
            embeds:[{
                title:req.body.rulesText.split("\n")[0],
                description:req.body.rulesText.substr(req.body.rulesText.indexOf("\n"))
            }]
        });

        res.write(`Rules posted!\n`);
    }

    res.end();
}