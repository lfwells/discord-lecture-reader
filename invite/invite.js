export const invites = {};

export async function init_invites(guild)
{
    //console.log(`init_invites ${guild.name}`);

    invites[guild.id] = {};
    
    var guildInvites = await guild.invites.fetch();
    guildInvites.forEach(invite => {
        invites[guild.id][invite.code] = { code: invite.code, users: invite.uses, createdTimestamp: invite.createdTimestamp };
    });
}