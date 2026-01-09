import { db } from "../core/database.js";

function getFavouritesCollection()
{
    return db.collection("favourites");
}
function getFavouritesCollectionForUser(discordMemberId)
{
    return getFavouritesCollection().doc(discordMemberId);
}
export async function getFavouriteGuilds(discordMemberId)
{
    var doc = await getFavouritesCollectionForUser(discordMemberId).get();
    return doc?.data()?.guilds ?? [];
}
export async function toggleFavouriteGuild(discordMemberId, guildID)
{
    var guilds = await getFavouriteGuilds(discordMemberId);
    var index = guilds.indexOf(guildID);
    if (index == -1)
    {
        guilds.push(guildID);
    }
    else
    {
        guilds.splice(index, 1);
    }
    await getFavouritesCollectionForUser(discordMemberId).set({ guilds: guilds });
}