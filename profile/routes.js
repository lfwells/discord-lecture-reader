import { loadProfile, saveProfileProperty } from "./profile.js";
import { getClient } from '../core/client.js';
import { getPostsCount, getPostsData } from "../analytics/analytics.js";
import { getAwardsForMember } from "../awards/awards.js";
import { useLegacyAwardsSystem } from "../awards/awards.js";
import { getAwardName } from "../awards/awards.js";
import { getAwardEmoji } from "../awards/awards.js";
import { getAwardsDatabase } from "../awards/awards.js";
import { getAwardChannel } from "../awards/awards.js";
import { beginStreamingRes } from "../core/server.js";
import { sleep } from "../core/utils.js";

export async function load(req, res, next)
{
    req.profile = getClient().users.cache.get(req.params.discordID);
    req.profile.id = req.params.discordID;
    
    req.profile = Object.assign(req.profile, (await loadProfile(req.params.discordID)).data());

    //read in what guilds the user is in
    req.profile.guilds = [];
    for (let guild of getClient().guilds.cache.values())
    {
        if (guild.members.cache.has(req.profile.id))
        {
            req.profile.guilds.push(guild);
        }
    }

    res.locals.profile = req.profile;
    res.locals.isOurProfile = req.discordUser != null && req.discordUser.id == req.profile.id;
    
    next();
}
export async function loadTotalPostCount(req,res,next)
{
    beginStreamingRes(res);

    req.profile = req.profile ?? {};
    //read in the stats for each server
    req.profile.total = 0;
    for (let guild of req.profile.guilds)
    {
        req.profile.total += await getPostsCount(guild, req.profile.id);
        
        res.write(JSON.stringify({total:req.profile.total}));
    }
    await sleep(1000);
    res.write(JSON.stringify({done:true}));
    res.end();
}
export async function loadTotalAwards(req,res,next)
{
    beginStreamingRes(res);
    
    req.profile = req.profile ?? {};
    req.profile.awards = [];
    //read in the stats for each server
    for (let guild of req.profile.guilds)
    {
        if (await useLegacyAwardsSystem(guild))
        {
            var awardChannel = await getAwardChannel(guild);
            if (awardChannel == undefined) continue;

            var awards = [];
            var messages = await awardChannel.messages.fetch();
            messages.forEach(award => 
            {
                var emoji = getAwardEmoji(award);
                var title = getAwardName(award);
                var awardData = {
                    emoji:emoji,
                    title:title,
                    server:guild.name,
                };
                if (award.mentions.users.has(req.params.discordID))
                {
                    req.profile.awards.push(awardData);
                    awards.push(awardData);
                }
            });

            res.write(JSON.stringify({awards}));
        }
        else
        {
            let awards = await getAwardsDatabase(guild, true);
            awards = await getAwardsForMember(req.profile, awards);
            
            var a = (awards.map(function(award) {
                var d = award.data();
                d.id = d.emoji = award.id;
                d.server = guild.name;
                return d;
            }));
            req.profile.awards.push(...a);

            res.write(JSON.stringify({awards:a}));
        }
    }
    
    await sleep(1000);
    res.write(JSON.stringify({done:true}));
    res.end();
}

export async function profile_home(req,res,next)
{
    res.render("profile/index");
}
export async function toggle_public_profile(req,res,next)
{
    if (req.profile.id == req.discordUser.id)
    {
        req.profile.public = !req.profile.public;
        await saveProfileProperty(req.profile.id, "public", req.profile.public);
        res.redirect("/profile/" + req.profile.id);
        return;
    }

    res.render("profile/accessDenied");
}