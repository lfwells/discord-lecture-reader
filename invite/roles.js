export const roles = {};

export async function init_roles(client)
{
    console.log("init_roles");

    var guilds = client.guilds.cache;
    //store them in the db
    guilds.each( async (guild) => 
    { 
        roles[guild.id] = await guild.roles.fetch();
    });
}