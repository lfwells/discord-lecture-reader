export const roles = new Map();

export async function init_roles(guild)
{
    console.log(`init_roles ${guild.name}`);

    roles[guild.id] = await guild.roles.fetch();
}