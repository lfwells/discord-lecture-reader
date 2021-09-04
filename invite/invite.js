export const invites = {};

export async function init_invites(client)
{
    console.log("init_invites");

    var guilds = client.guilds.cache;
    //store them in the db
    guilds.each( async (guild) => 
    { 
        guild.fetchInvites().then(guildInvites => 
        {
            invites[guild.id] = guildInvites;
        });
    });
}