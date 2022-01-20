import { getClient } from "../core/client.js";

export const ROLES = new Map();

export async function init_roles(guild)
{
    console.log(`init_roles ${guild.name}`);

    ROLES[guild.id] = await guild.roles.fetch();
}

export function getRoleByName(guild, name)
{
    return ROLES[guild.id].find(r => r.name.toLowerCase() == name.toLowerCase());
}
export async function getRoleByNameOrCreate(guild, name)
{
    var existingRole = getRoleByName(guild, name);
    if (existingRole) return existingRole;

    //else create it
    var result = await guild.roles.create({
         name
    });
    await init_roles(guild);
    return result;
}

export async function assignRole(guild, member, role)
{
    if (await botRoleHigherThanMemberRole(member))
        await member.roles.add(role);
    else   
        console.log("cannot add role, the member has a higher role than the bot");
}

export async function unAssignRole(guild, member, role)
{
    if (await botRoleHigherThanMemberRole(member))
        await member.roles.remove(role);
    else   
        console.log("cannot remove role, the member has a higher role than the bot");
}

export async function hasRole(guild, member, role)
{
    //return await member.roles.has(role);
    return member.roles.cache.find(r => r.id == role.id);
}

export async function botRoleHigherThanMemberRole(member)
{
    if (member.id == member.guild.ownerId) return false;

    var client = getClient();
    var us = await member.guild.members.cache.get(client.user.id);
    var ourHighestRole = us.roles.highest;
    var theirHighestRole = member.roles.highest;
    return ourHighestRole.position >= theirHighestRole.position;
}