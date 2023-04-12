import { loadProfile } from "./profile.js";
import { getClient } from '../core/client.js';

export async function load(req, res, next)
{
    req.profile = getClient().users.cache.get(req.params.discordID);
    
    req.profile = Object.assign(req.profile, (await loadProfile(req.params.discordID)).data());
    res.locals.profile = req.profile;
    
    next();
}
export async function profile_home(req,res,next)
{
    var discordID = req.params.discordID;
    res.render("profile/index");
}