import { db } from "./database.js";

async function getPermissions(discordID)
{
    // Get permissions from database
    return await db.collection("permissions").doc(discordID).get();
}

export async function hasPermission(discordID, permission)
{
    let permissions = await getPermissions(discordID);
    
    if (permissions.exists == false) return false;

    if (permissions.get("admin") ?? false) return true;

    return permissions.get(permission) ?? false;

    
}