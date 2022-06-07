import { getClient } from "../core/client.js";
import { oauthDiscordMyLOConnect, scopeMyLOConnect } from "../core/login.js";
import { getCachedInteraction } from "../guild/commands.js";

import axios from 'axios';
import { getMyLOConnectedMessage } from "./mylo.js";
import { setStudentProperty } from "../student/student.js";

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

    res.render("mylo/myloOAuth", {
        state
    });
}

//myloConnectComplete
export async function myLOConnectComplete(req,res)
{
    //mylo given data (example)
    var studentID = req.query.studentID;

    //retrieve the discord interation that was used to trigger this button in the first place
    var state = JSON.parse(req.query.state);
    console.log({state});

    //get required info about the original interaction
    var client = getClient();
    var guild = client.guilds.resolve(state.guildID);
    var cachedInteraction = await getCachedInteraction(guild, state.interactionID);
    //var channelID = cachedInteraction.channelID;
    var token = cachedInteraction.token;
    var memberID = cachedInteraction.memberID;
    
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
