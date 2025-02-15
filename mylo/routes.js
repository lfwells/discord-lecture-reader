import { getClient } from "../core/client.js";
import { scopeMyLOConnect } from "../core/login.js";
import { oauthDiscordMyLOConnect } from "../_oathDiscordMyLOFlow.js";
import { getCachedInteraction } from "../guild/commands.js";

import axios from 'axios';
import { deleteCategoryChannels, getMyLOConnectedMessage, getMyLOConnectedOAuthUser, getMyLOData, postChannelLinks, postChannelsWithLinks, postChannelsWithThreads, postChannelThreads, storeMyLOData } from "./mylo.js";
import { deleteStudentProperty, getStudentProperty, setStudentProperty } from "../student/student.js";
import { beginStreamingRes } from "../core/server.js";
import { pluralize } from "../core/utils.js";

export async function recieveMyLOData(req,res)
{
    console.log("Uploading mylo data...");
    
    res.json({message:await storeMyLOData(req.guild, req.body)});
}
export async function displayMyLOContent(req,res)
{
    let data = (await getMyLOData(req.guild, "content")).data()?.data ?? { Modules: [] };
    res.render("mylo/content", {
        data
    });
}
export async function createMyLOLinks(req,res)
{
    let data = (await getMyLOData(req.guild, "content")).data()?.data ?? { Modules: [] };
    console.log({data});
    res.render("mylo/contentLinks", {
        data
    });
}
export async function createMyLOLinksPost(req,res)
{
    
    beginStreamingRes(res);

    res.write("Loading MyLO Data...\n");

    var data = (await getMyLOData(req.guild, "content")).data().data;
    var myLORoot = req.body.myloRoot;
    var root = traverseContentTree(data, myLORoot);
    var channel = req.body.channelID ? await req.guild.client.channels.cache.get(req.body.channelID) : null;
    var category = req.body.categoryID ? await req.guild.client.channels.cache.get(req.body.categoryID) : null;
    
    res.write(`Found root ${root.Title}.\n`);

    if (category && req.body.emptyCategory)
    {
        res.write(`Deleting channels in ${category.name}.\n`);
        await deleteCategoryChannels(res, category);
    }

    var result = "";
    if (req.body.postChannelThreads) result = await postChannelThreads(res, channel, channel.type == 15, root, true);
    if (req.body.postChannelLinks) result = await postChannelLinks(res, channel, false, root, true);
    if (req.body.postChannelsWithThreads) result = await postChannelsWithThreads(res, category, false, root);
    if (req.body.postChannelsWithLinks) result = await postChannelsWithLinks(res, category, false, root);
    if (req.body.postForumChannelsWithThreads) result = await postChannelsWithThreads(res, category, true, root);

    res.write(`Posted ${pluralize(result.length, "message")}.`);
    res.end();
}
export function traverseContentTree(root, findID)
{
    if (root.ModuleId == findID) return root;
    if (root.TopicId == findID) return root;

    if (root.Modules)
    {
        for (var i = 0; i < root.Modules.length; i++)
        {
            var traverse = traverseContentTree(root.Modules[i], findID);
            if (traverse != null) return traverse;
        }
    }

    if (root.Topics)
    {
        for (var i = 0; i < root.Topics.length; i++)
        {
            var traverse = traverseContentTree(root.Topics[i], findID);
            if (traverse != null) return traverse;
        }
    }

    return null;
}
export function traverseContentTreeSearch(root, predicate, results) 
{
    if (results == undefined) results = [];
    if (root.IsHidden != undefined && root.IsHidden) return results;
    
    if (predicate(root)) results.push(root);

    if (root.Modules)
    {
        for (var i = 0; i < root.Modules.length; i++)
        {
            traverseContentTreeSearch(root.Modules[i], predicate, results);
        }
    }

    if (root.Topics)
    {
        for (var i = 0; i < root.Topics.length; i++)
        {
            traverseContentTreeSearch(root.Topics[i], predicate, results);
        }
    }
    
    return results;
}

//-------------------------------------------------------------
//everything after here is the old (unapproved) mylo connection
//-------------------------------------------------------------

//myloConnectCompleteDiscord
export async function discordConnectComplete(req,res)
{
    //console.log(req.query);

    var auth = await oauthDiscordMyLOConnect.tokenRequest({
        code: req.query.code,
        scope: scopeMyLOConnect,
        grantType: "authorization_code",
    });

    //retrieve the discord interation that was used to trigger this button in the first place
    var state = req.query.state;
    var discordUser = await getMyLOConnectedOAuthUser(auth);
    console.log({discordUser, auth, state});

    if (discordUser.mfa_enabled == false || discordUser.verified == false)
    {
        return res.render("mylo/myloOAuthDiscordInvalid", { discordUser });
    }

    res.render("mylo/myloOAuth", {
        state, discordUser
    });
}

//myloConnectComplete
export async function myLOConnectComplete(req,res)
{
    //mylo given data (example)
    var studentID = req.query.studentID;

    //retrieve the discord interation that was used to trigger this button in the first place
    var state = JSON.parse(req.query.state);

    //get required info about the original interaction
    var client = getClient();
    var guild = client.guilds.resolve(state.guildID);
    var cachedInteraction = await getCachedInteraction(guild, state.interactionID);
    //var channelID = cachedInteraction.channelID;
    var token = cachedInteraction.token;
    var memberID = cachedInteraction.memberID;

    console.log({state, studentID, memberID});
    
    //save the data about the student (example)
    await setStudentProperty(memberID, "studentID", studentID);

    // Edit the original interaction response:
    const data =  await getMyLOConnectedMessage(memberID);
    const appID = client.application.id;
    //const channel = await client.channels.resolve(channelID);
    await axios.patch(`https://discord.com/api/v8/webhooks/${appID}/${token}/messages/@original`, data)

    res.render("mylo/myloComplete", {
        studentID
    });

}


//myloDisconnect
export async function myLODisconnect(req,res)
{
    var guildID = req.params.guildID;
    var interactionID = req.params.interactionID;

    console.log({guildID});

    //get required info about the original interaction
    var client = getClient();
    var guild = guildID == "dm" ? null : client.guilds.resolve(guildID);
    var cachedInteraction = await getCachedInteraction(guild, interactionID);
    var token = cachedInteraction.token;
    var memberID = cachedInteraction.memberID;

    var studentID = await getStudentProperty("studentID", memberID, null);
    console.log({studentID});
    if (studentID != null)
    {
        
        //save the data about the student (example)
        await deleteStudentProperty(memberID, "studentID");

        // Edit the original interaction response:
        const data =  await getMyLOConnectedMessage(memberID);
        const appID = client.application.id;
        //const channel = await client.channels.resolve(channelID);
        await axios.patch(`https://discord.com/api/v8/webhooks/${appID}/${token}/messages/@original`, data)

        res.render("mylo/myloDisconnectComplete", {
            studentID
        });
    }
    else
    {
        res.render("mylo/myloError", {
            error: "That Discord account is not linked to MyLO."
        });
    }
}