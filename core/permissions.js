import { db } from "./database";

async function getPermissions(discordID)
{
    // Get permissions from database
    return await db.collection("permissions").doc(discordID).get();
}

export async function hasPermission(discordID, permission)
{
    let permissions = getPermissions(discordID);

    if (permissions.exists == false) return false;

    if (permissions.get("admin")) return true;

    return permissions.get(permission) ?? false;

    
}