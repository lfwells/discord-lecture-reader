import * as Config from "../core/config.js";
import { sleep } from "../core/utils.js";
import { getGuildDocument } from "../guild/guild.js";
import moment from "moment";

export async function init_presence_scrape(guild)
{
    try
    {
        var onlineMembers = await getOnlineMembers(guild);
        onlineMembers = onlineMembers.map(function (e) { return  {
            id: e.id,
            username: e.user.username,
            nickname: e.nickname
        }});

        var guildDocument = await getGuildDocument(guild.id);
        var timestamp = moment().format('x');
        
        var data = {
            count: onlineMembers.length,
            onlineMembers
        };
        //if (guild.id == "930169342996410459") console.log(data);
        await guildDocument.collection("presence").doc(timestamp).set(data);
    } catch (e) {  ;}

	await sleep(Config.UPDATE_PRESENCE_EVERY_MS);
	await init_presence_scrape(guild);
}
async function getOnlineMembers(guild)
{
    var fetchedMembers = await guild.members.fetch();
    return fetchedMembers.filter(member => member.presence && member.presence.status === 'online');
}

export async function loadPresenceData(guild)
{
    var guildDocument = await getGuildDocument(guild.id);
    var results = await guildDocument.collection("presence").get();
    var data = [];
    results.forEach(doc =>
    {
        var d = doc.data();
        d.id = doc.id;
        d.timestamp = moment.unix(doc.id / 1000);
        data.push(d);
    });
    console.log(data);
    return data;
}