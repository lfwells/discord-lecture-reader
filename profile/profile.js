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