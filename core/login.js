import crypto from 'crypto';
import DiscordOauth2 from "discord-oauth2";
import { guildList } from '../guild/routes.js';
import { authHandler } from './server.js';

const scope = ["identify", "guilds", "email"];

export const oauth = new DiscordOauth2({
	clientId: "811958340967071745",
	clientSecret: "GrW0O4FZ9VKiNCrK-fAoXS2T0Mb41Oos",
	redirectUri: "http://131.217.172.176/loginComplete", 
});

export async function loginPage(req,res)
{
    const url = oauth.generateAuthUrl({
        scope: scope, 
        state: crypto.randomBytes(16).toString("hex"), // Be aware that randomBytes is sync if no callback is provided
    });

    //console.log(url);  
    res.render('login', { url: url });//TODO: redirect url within the site??
}
export async function loginComplete(req,res)
{
    //console.log(req.query);

    var auth = await oauth.tokenRequest({
        code: req.query.code,
        scope: scope,
        grantType: "authorization_code",
    });
    //console.log(auth);
    var session = req.session;
    session.auth = auth;
    //console.log("saving auth to session", req.session);
    //await authHandler(true)(req,res, function() {}); //forceAuth = true is used to ensure req.discordUser gets populated
//    guildList(req,res);
    res.redirect("/");

}


export async function logout(req,res)
{
    req.session.auth = null;
    res.redirect("/");
}