import { db } from "./database.js";

export async function getPermissions(discordID)
{
    // Get permissions from database
    return await db.collection("permissions").doc(discordID).get();
}

export async function hasPermission(discordID, permission)
{
    if (await isUTASBotAdmin(discordID)) return true;

    let permissions = await getPermissions(discordID);

    if (permissions.exists == false) return false;

    return hasPermissionCached(permission, permissions);
}
export function hasPermissionCached(permission, permissions)
{
    return permissions.get(permission) ?? false;
}

export async function isUTASBotAdmin(discordID)
{
    let permissions = await getPermissions(discordID);

    if (permissions.exists == false) return false;

    return hasPermissionCached("admin", permissions);
}
export function isUTASBotAdminCached(permissions)
{
    return hasPermissionCached("admin", permissions);
}