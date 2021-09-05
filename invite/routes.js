import { invites } from "./invite.js";
import { roles } from "./roles.js";


//import { getClient } from "../core/client.js";
//var client = getClient();

export async function inviteList(req, res) 
{
    var appliedRolesList = [];
    var query = await req.guildDocument.collection("invites").get();
    query.forEach(function(doc) {
        var d = doc.data();
        appliedRolesList[d.code] = d.role;
    });

    res.render('inviteList', {
        invites: invites[req.guild.id],
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
