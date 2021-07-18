import { getClient } from "./client.js";

export async function loadClassList(req,res,next)  
{
    //TODO: await ready?
    
    var members = await req.guild.members.fetch();
    var classList = members.map(m => (
    { 
        discordID: m.id, 
        discordName: m.displayName,
        username: 
            m.displayName.startsWith("Lindsay Wells") ? "lfwells" : 
            m.displayName.startsWith("Ian Lewis") ? "ij_lewis" :
            (m.displayName.match(/\(([^)]+)\)/) ?? []).length > 0 ? m.displayName.match(/\(([^)]+)\)/)[1] : ""
    }));
    req.classList = classList.sort((a,b) => a.discordName.localeCompare(b.discordName));
    res.locals.classList = req.classList;
    next(); 

}
