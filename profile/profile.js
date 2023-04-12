import { db } from "../core/database.js";

export async function loadProfile(discordID)
{
    // Get profile from database
    return await db.collection("profiles").doc(discordID).get();
}
export async function saveProfileProperty(discordID, property, value)
{
    // Get profile from database
    return await db.collection("profiles").doc(discordID).set({[property]:value}, {merge:true});
}
export async function profileIsPublic(member)
{
    if (member.public != undefined) {
        return member.public;
    }
    if (member.discordID != undefined) {
        return (await loadProfile(member.discordID)).get("public") ?? false;
    }
    if (member.id != undefined) {
        return (await loadProfile(member.id)).get("public") ?? false;
    }
    return false;
}