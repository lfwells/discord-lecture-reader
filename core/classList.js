import { getClient } from "./client.js";
import * as config from "./config.js";

export async function loadClassList(req,res,next)  
{
    //TODO: await ready?

    var members = await req.guild.members.cache;//fetch();
    var classList = members.map(m => (
    { 
        member: m,
        discordID: m.id, 
        discordName: m.displayName,
        username: 
            m.displayName.startsWith("Lindsay Wells") ? "lfwells" : 
            m.displayName.startsWith("Ian Lewis") ? "ij_lewis" :
            (m.displayName.match(/\(([^)]+)\)/) ?? []).length > 0 ? m.displayName.match(/\(([^)]+)\)/)[1] : ""
    }));

    //filter out admin
    //TODO: filter using roles
    classList = classList.filter(m => m.discordID != config.SIMPLE_POLL_BOT_ID && m.discordID != config.IAN_ID && m.discordID != config.ROBO_LINDSAY_ID);

    //just some specific ian crap here lol, remove lindsay 
    if (req.guild.id != config.KIT109_S2_2021_SERVER)
    {
        classList = classList.filter(m => m.discordID != config.LINDSAY_ID);
    }

    req.classList = classList.sort((a,b) => a.discordName.localeCompare(b.discordName));
    res.locals.classList = req.classList;
    next(); 

}

//non express version
export async function getClassList(guild)
{
    var req = { guild:guild };
    var res = { locals: { } };
    var next = ()=> {};
    await loadClassList(req, res, next);
    return res.locals.classList;
}