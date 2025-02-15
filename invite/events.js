import { init_invites, invites } from "../invite/invite.js";
import * as config from '../core/config.js'; 
import { guildsCollection } from "../core/database.js";

export default async function(client)
{
    client.on("inviteDelete", (invite) => {
        // Delete the Invite from Cache
        if (invites[invite.guild.id] == undefined) invites[invite.guild.id] = [];
        delete invites[invite.guild.id][invite.code];
      });
      
      client.on("inviteCreate", (invite) => {
        // Update cache on new invites
        if (invites[invite.guild.id] == undefined) invites[invite.guild.id] = [];
        invites[invite.guild.id][invite.code] = { code:invite.code, uses:invite.uses, createdTimestamp:invite.createdTimestamp };
      });
      
    client.on('guildMemberAdd', async (member) =>
    {
    //this functionality only available on KIT109 Sem2 onwards. TODO need a nice way of handling this
    //if (member.guild.id == config.KIT109_S2_2021_SERVER || member.guild.id == config.TEST_SERVER_ID)
    //{
        // To compare, we need to load the current invite list.
        //member.guild.fetchInvites().then(async (guildInvites) => {
            /*var guildInvites = await member.guild.invites.fetch();

            // This is the *existing* invites for the guild.
            const existingInvites = invites[member.guild.id];
            // Update the cached invites for the guild.
            invites[member.guild.id] = guildInvites;
            // Look through the invites, find the one for which the uses went up.
            const invite = guildInvites.find(i => {
                console.log(i.code, existingInvites.get(i.code).uses, i.uses);
                return existingInvites.get(i.code).uses < i.uses;
            });*/
        member.guild.invites.fetch().then(async (newInvites) => {
            // This is the *existing* invites for the guild.
            const oldInvites = invites[member.guild.id];
            if (oldInvites == null) {
                console.log("oldInvites is null", member.guild.id);
                return;
            }
            
            // Look through the invites, find the one for which the uses went up.
            const invite = newInvites.find(i => i.uses > oldInvites[i.code]?.uses);
            if (invite)
            {
                console.log(invite); 
                // This is just to simplify the message being sent below (inviter doesn't have a tag property)
                const inviter = client.users.cache.get(invite.inviter.id); //TODO: this line doesnt work!
                // Get the log channel (change to your liking)
                console.log(`${member.user.tag} joined using invite code ${invite.code} from ${inviter.tag}. Invite was used ${invite.uses} times since its creation.`);
                
                //now the cool part, auto assign a role :)
                //this is not perfect as anyone can use any invite, and so would need moderation
                //ALSO NOTE THE BOT ROLE MUST BE HIGHER IN LIST THAN ANY ROLE YOU WANT TO ASSIGN

                var inviteCollection = guildsCollection.doc(member.guild.id).collection("invites");
                if (inviteCollection)
                {
                    var querySnapshot = await inviteCollection.where("code", "==", invite.code).get();
                    
                    querySnapshot.forEach(doc =>
                    {
                        var roleID = doc.data().role;
                        var role = member.guild.roles.cache.find(role => role.id === roleID);
                        member.roles.add(role); 
                        
                    });
                }
    /*
                if (member.guild.id == config.KIT109_S2_2021_SERVER)
                {
                    if (invite.code == "UU6T65YEGB" || invite.code == "JMGu3s3pNg") //this is the one in the unit outline and mylo etc
                    {
                        var role= member.guild.roles.cache.find(role => role.name === "Current Student");
                        member.roles.add(role); //current student, but TODO other roles
                    }
                }*/
            }
            else
            {
                console.log("invite not found");
            }
            init_invites(member.guild);
        
        });
    //}
    });

    client.on('inviteCreate', invite => {
        console.log("inviteCreate");
        init_invites(invite.guild);
    });
    client.on('inviteDelete', invite => {
        console.log("inviteDelete");
        init_invites(invite.guild);
    });
}