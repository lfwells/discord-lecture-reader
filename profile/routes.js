import { loadProfile } from "./profile.js";
import { getClient } from '../core/client.js';

export async function load(req, res, next)
{
    req.profile = getClient().users.cache.get(req.params.discordID);
    
    req.profile = Object.assign(req.profile, (await loadProfile(req.params.discordID)).data());

    //read in what guilds the user is in
    req.profile.guilds = [];
    for (let guild of getClient().guilds.cache.values())
    {
        if (guild.members.cache.has(req.profile.id))
        {
            req.profile.guilds.push(guild);
        }
    }

    res.locals.profile = req.profile;
    
    next();
}
export async function profile_home(req,res,next)
{
    res.render("profile/index");
}