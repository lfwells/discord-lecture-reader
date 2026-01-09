import { removeQuestionMark } from "../core/utils.js";
import { GUILD_CACHE } from "../guild/guild.js";
import { cloneChannel, cloneSettings } from "./cloner.js";

export function clone_select(req,res)
{
    res.render('clone_select', {
      guilds: req.guilds,
    });
}
export async function clone(req,res)
{
    var originalGuild = GUILD_CACHE[req.body.originalGuild];
    var guild = req.guild;

    if (req.body.confirm == undefined)
    {
        res.render('clone_confirm', {
            originalGuild: originalGuild
        });
    }
    else
    {
        res.json(await cloneSettings(originalGuild, guild));
    }
}


export function clone_channel_select(req,res)
{
    res.render('clone_channel_select', {
      guilds: req.guilds,
    });
}
export async function clone_channel(req,res)
{
    var sourceGuild = GUILD_CACHE[req.body.sourceGuild];
    var destinationGuild = req.guild;

    if (req.body.confirm == undefined)
    {
        res.render('clone_channel_confirm', {
            sourceGuild: sourceGuild
        });
    }
    else
    {
        res.json(await cloneChannel(req.body.sourceChannelID, req.body.destinationChannelID, sourceGuild, destinationGuild));
    }
}
