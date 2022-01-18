export const invites = new Map();

export async function init_invites(guild)
{
    console.log(`init_invites ${guild.name}`);

    var guildInvites = await guild.invites.fetch();
    invites.set(guild.id, new Map(guildInvites.map((invite) => [invite.code, invite.uses])));
}