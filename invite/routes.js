import { getClient } from "../core/client.js";
import { init_invites, invites } from "./invite.js";
import { roles } from "./roles.js";


//import { getClient } from "../core/client.js";
//var client = getClient();

export async function inviteList(req, res) 
{
    init_invites(getClient());
    
    var appliedRolesList = [];
    var query = await req.guildDocument.collection("invites").get();
    query.forEach(function(doc) {
        var d = doc.data();
        appliedRolesList[d.code] = d.role;
    });

    res.render('inviteList', {
        invites: invites.get(req.guild.id),
        rolesList: roles[req.guild.id].map((role) => { return {
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
    
    await req.guildDocument.collection("invites").doc().set({
        code:code,
        role:role,
    });
    
    res.json({
        success:true
    });
}

export async function generateInvite(req,res,next)
{
    var channel = req.guild.channels.cache.find(x => x.name === "rules"); //TODO select channel
    console.log(channel.name);
    var newInvite = await channel.createInvite({
        unique:true,
        maxAge: 0, //TODO option
        maxUses: 0,
    });
    
    invites.get(req.guild.id).set(newInvite.code, newInvite.uses);

    next();
}
