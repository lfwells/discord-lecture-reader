export const invites = new Map();

export async function init_invites(client)
{
    console.log("init_invites");

    var guilds = client.guilds.cache;
    //store them in the db
    guilds.each( async (guild) => 
    { 
        var guildInvites = await guild.invites.fetch();
        //guild.fetchInvites().then(guildInvites => 
        //{
            //invites[guild.id] = guildInvites;
            invites.set(guild.id, new Map(guildInvites.map((invite) => [invite.code, invite.uses])));
        //});

      
    });
}