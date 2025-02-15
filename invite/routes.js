import { init_invites, invites } from "./invite.js";
import { init_roles, ROLES } from "../roles/roles.js";
import { guessConfigurationValue } from "../guild/guild.js";


//import { getClient } from "../core/client.js";
//var client = getClient();

export async function inviteList(req, res) 
{
    await init_invites(req.guild);
    
    var appliedRolesList = [];
    var query = await req.guildDocument.collection("invites").get();
    query.forEach(function(doc) {
        var d = doc.data();
        appliedRolesList[d.code] = d.role;
    });
    var sortedInvites = Object.entries(invites[req.guild.id]);
    sortedInvites.sort((a,b) => {
        //console.log(a[1].createdTimestamp, b[1].createdTimestamp,a[1],b[1]);
        if (a[1].createdTimestamp && b[1].createdTimestamp)
        {
            return a[1].createdTimestamp - b[1].createdTimestamp;
        }
        return -1;
    });
    console.log(sortedInvites.map(kvp => kvp[1].createdTimestamp));
    
    
    let roles = ROLES[req.guild.id];
    if (roles == undefined) await init_roles(req.guild);
    
    res.render('inviteList', {
        invites: sortedInvites,
        rolesList: roles.map((role) => { return {
            value: role.id,
            text: role.name
        }}),
        appliedRolesList: appliedRolesList
    }); 
}

export async function assignRole(req, res)
{
    var code = req.body.id;
    var role = req.body.role;

    var query = await req.guildDocument.collection("invites").where("code", "==", code).get();
    query.forEach(function(doc) {
        doc.ref.delete();
    });
    
    var result = await req.guildDocument.collection("invites").doc().set({
        code:code,
        role:role,
    });
    console.log(result);
    
    res.json({
        success:true
    });
}

export async function generateInvite(req,res,next)
{
    var channel = await guessConfigurationValue(req.guild, "ruleChannelID", true); //convert = true
    if (!channel)
    {
        console.log("No #rules channel found. Cannot complete operation.");
        res.write(`No #rules channel found. Cannot complete operation.`);
        res.redirect("back");//back to referring page
        return;
    }
    //var channel = req.guild.channels.cache.find(x => x.name === "rules"); //TODO select channel
    console.log(channel.name);
    var newInvite = await channel.createInvite({
        unique:true,
        maxAge: 0, //TODO option
        maxUses: 0,
    });
    
    invites[req.guild.id][newInvite.code] = { code: newInvite.code, uses: newInvite.uses, createdTimestamp: newInvite.createdTimestamp };

    res.redirect("back");//back to referring page
}
