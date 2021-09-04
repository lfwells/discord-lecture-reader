import { invites } from "./invite.js";


//import { getClient } from "../core/client.js";
//var client = getClient();

export function inviteList(req, res) 
{
    console.log(invites[req.guild.id]);
  res.render('inviteList', {
    invites: invites[req.guild.id]
  }); 
}
