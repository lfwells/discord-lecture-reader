import { deleteGuildProperty, getGuildPropertyConverted, hasFeature, saveGuildProperty, setGuildProperty } from "./guild.js";
import { Permissions } from "discord.js";
import * as Config from "../core/config.js";
import { pluralize, sleep } from "../core/utils.js";
import { getCurrentWeek, getNextSession } from "../attendance/sessions.js";
import { getPostsCount } from "../analytics/analytics.js";

//this is very rate limited, can't do much
export async function init_status_channels(guild)
{
	try
	{
		init_status_channel(guild, "postCount", "showPostCount", async (guild) => {
			var postCount = await getPostsCount(guild);
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
			{
				//return `📅 Next Lecture ${nextSession.startTimestamp.format("Do h:mm a")}`; 
				return `📅  Lecture ${nextSession.startTimestamp.fromNow()}`; 
			}
			else
			{
				var nextSession = await getNextSession(guild, "Lectorial");
				if (nextSession)
				{
					//return `📅 Next Lecture ${nextSession.startTimestamp.format("Do h:mm a")}`; 
					return `📅  Lectorial ${nextSession.startTimestamp.fromNow()}`; 
				}
				else
				{
					return `📅  No More Lectorials :(`; 
				}
			}
		});
		init_status_channel(guild, "currentWeek", "showCurrentWeek", async (guild) => {
			var weekNumber = await getCurrentWeek(guild);
			return `📅  ${weekNumber}`; 
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
			var channel = (channelID != null && channelID != undefined && channelID != "undefined") ? await guild.channels.cache.find(c => c.id == channelID) : null; 
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
			if (channelID != undefined)
			{
				console.log(`CHANNELS FETCH ${channelID} status ${guild.id}`);
				var channel = await guild.channels.fetch(channelID); 
				if (channel != null)
				{
					await channel.delete();
				}
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