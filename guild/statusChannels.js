import { deleteGuildProperty, getGuildPropertyConverted, hasFeature, saveGuildProperty, setGuildProperty } from "./guild.js";
import { Permissions } from "discord.js";
import * as Config from "../core/config.js";
import { pluralize, sleep } from "../core/utils.js";
import { getNextSession } from "../attendance/sessions.js";
import { getPostsData } from "../analytics/analytics.js";

//this is very rate limited, can't do much
export async function init_status_channels(guild)
{
	try
	{
		init_status_channel(guild, "postCount", "showPostCount", async (guild) => {
			var posts = await getPostsData(guild);
			var postCount = posts.length ?? 0;
			return `📨  ${pluralize(postCount, "Post")}`; 
		});
		init_status_channel(guild, "onlineMembers", "showOnlineMemberCount", async (guild) => {
			var fetchedMembers = await guild.members.fetch();
			var onlineCount = fetchedMembers.filter(member => member.presence && member.presence.status === 'online').size;
			return `💻  ${onlineCount} Online`; 
		});
		init_status_channel(guild, "memberCount", "showMemberCount", async (guild) => {
			var fetchedMembers = await guild.members.fetch();
			var onlineCount = fetchedMembers.size;
			return `👪  ${onlineCount} Members`; 
		});
		init_status_channel(guild, "nextSession", "showNextSession", async (guild) => {
			var nextSession = await getNextSession(guild, "Lecture");
			if (nextSession)
				//return `📅 Next Lecture ${nextSession.startTimestamp.format("Do h:mm a")}`; 
				return `📅  Lecture ${nextSession.startTimestamp.fromNow()}`; 
			else
				return `📅  No More Lectures :(`; 
		});
	} catch (e) {}
}
async function init_status_channel(guild, name, feature, f)
{
	var key = "status_"+name;
	if (await hasFeature(guild, feature, false))
	{
		var text = "";
		try {
			text = await f(guild);
		
			var channelID = await getGuildPropertyConverted(key, guild);
			var channel = channelID != null ? await guild.channels.cache.find(c => c.id == channelID) : null; 
			if (channel == null)
			{
				//create the channel
				channel = await guild.channels.create(text, {
					type: 'GUILD_VOICE',
					permissionOverwrites: getPermissions(guild)
				});
				await setGuildProperty(guild, key, channel.id);
			}
			else
			{
				//await channel.permissionOverwrites.set(getPermissions(guild));
				await channel.setName(text);
			}
		} catch (e) {
			await sleep(Config.UPDATE_STATUS_CHANNELS_EVERY_MS);
			await init_status_channel(guild, name, feature, f);
			return;
		}
	}
	else
	{
		//check if the channel is still there, and if so delete it
		var channelID = await getGuildPropertyConverted(key, guild);
		await deleteGuildProperty(guild, key);
		
		try
		{
			var channel = channelID != null ? await guild.channels.fetch(channelID) : null; 
			if (channel != undefined)
			{
				await channel.delete();
			}
		} catch (e) {}
	}
	
	await sleep(Config.UPDATE_STATUS_CHANNELS_EVERY_MS);
	await init_status_channel(guild, name, feature, f);
}
function getPermissions(guild)
{
	return [
	{
		id: guild.id,
		deny: [Permissions.FLAGS.CONNECT],
		allow: [Permissions.FLAGS.VIEW_CHANNEL],
	}
	];
}