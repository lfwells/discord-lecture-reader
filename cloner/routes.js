import { removeQuestionMark } from "../core/utils.js";
import { GUILD_CACHE } from "../guild/guild.js";
import { cloneSettings } from "./cloner.js";

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