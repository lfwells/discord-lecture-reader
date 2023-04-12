import { db } from "../core/database.js";

export async function loadProfile(discordID)
{
    // Get profile from database
    return await db.collection("profiles").doc(discordID).get();
}