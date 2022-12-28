import { oauthDiscordMyLOConnect } from "../../core/login";

//myloConnectComplete
export async function discordConnectcomplete(req,res)
{
    //console.log(req.query);

    var auth = await oauthDiscordMyLOConnect.tokenRequest({
        code: req.query.code,
        scope: scope,
        grantType: "authorization_code",
    });

    var originalInteraction = auth.state;

    res.json({
        originalInteraction
    });

}
