import { loadProfile } from "./profile.js";
import { getClient } from '../core/client.js';
import { getPostsFilterPredicate } from "../classList/classList.js";
import { getPostsData } from "../analytics/analytics.js";

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

    //read in the stats for each server
    req.profile.total = 0;
    for (let guild of req.profile.guilds)
    {
        req.profile.total += (await getPostsData(guild, null, (post) => post.author == req.profile.id)).length;
    }

    res.locals.profile = req.profile;
    
    next();
}
export async function profile_home(req,res,next)
{
    res.render("profile/index");
}