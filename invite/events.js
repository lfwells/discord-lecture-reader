import { init_invites, invites } from "../invite/invite.js";
import * as config from '../core/config.js'; 

export default async function(client)
{
    client.on('guildMemberAdd', member => 
    {
        //this functionality only available on KIT109 Sem2 onwards. TODO need a nice way of handling this
        if (member.guild.id == config.KIT109_S2_2021_SERVER || member.guild.id == config.TEST_SERVER_ID)
        {
            // To compare, we need to load the current invite list.
            member.guild.fetchInvites().then(guildInvites => {
                // This is the *existing* invites for the guild.
                const ei = invites[member.guild.id];
                // Update the cached invites for the guild.
                invites[member.guild.id] = guildInvites;
                // Look through the invites, find the one for which the uses went up.
                const invite = guildInvites.find(i => ei.get(i.code).uses < i.uses);
                // This is just to simplify the message being sent below (inviter doesn't have a tag property)
                const inviter = client.users.cache.get(invite.inviter.id);
                // Get the log channel (change to your liking)
                console.log(`${member.user.tag} joined using invite code ${invite.code} from ${inviter.tag}. Invite was used ${invite.uses} times since its creation.`);
                
                //now the cool part, auto assign a role :)
                //this is not perfect as anyone can use any invite, and so would need moderation
                //ALSO NOTE THE ROBO LINDSAY ROLE MUST BE HIGHER IN LIST THAN ANY ROLE YOU WANT TO ASSIGN
                //TODO: web interface for this, but nowhere near enough time
                if (member.guild.id == config.TEST_SERVER_ID)
                {
                    if (invite.code == "SzY3fyQS")
                    {
                        var role= member.guild.roles.cache.find(role => role.name === "Hobart");
                        member.roles.add(role); //Hobart
                    }
                }
                else if (member.guild.id == config.KIT109_S2_2021_SERVER)
                {
                    if (invite.code == "UU6T65YEGB" || invite.code == "JMGu3s3pNg") //this is the one in the unit outline and mylo etc
                    {
                        var role= member.guild.roles.cache.find(role => role.name === "Current Student");
                        member.roles.add(role); //current student, but TODO other roles
                    }
                }

                init_invites(member.client);
            });
        }
    });

    client.on('inviteCreate', invite => {
        console.log("inviteCreate");
        init_invites(invite.client);
    });
    client.on('inviteDelete', invite => {
        console.log("inviteDelete");
        init_invites(invite.client);
    });
}
  