import crypto from 'crypto';
import DiscordOauth2 from "discord-oauth2";
import { guildList } from '../guild/routes.js';
import { oauth } from '../_oathDiscord.js';
import { authHandler } from './server.js';
import { sleep } from './utils.js';

const scope = ["identify", "guilds", "email"];
export const scopeMyLOConnect = ["identify", "guilds"];

export async function loginPage(req,res)
{
    const url = oauth.generateAuthUrl({
        scope: scope, 
        state: req.query.path, 
    });

    //console.log(url);  
    console.log("how did we get here?");
    console.trace();
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
    req.session = session;
    //console.log("saving auth to session", req.session);
    console.log("req.session = ", req.session);
    await authHandler(req,res, function(req,res,next) {
    }); //used to ensure req.discordUser gets populated
    //console.log("discordUser?", req.discordUser);
//    guildList(req,res);

    await sleep(5000);

    console.log("req.session 2 = ", req.session);
    let state = req.query.state;
    if (state == "") state = null;
    res.redirect(state ?? "/");

    
    

}


export async function logout(req,res)
{
    await authHandler(req,res, function() {}); //used to ensure req.discordUser gets populated
    
    await sleep(5000);
    req.discordUser = null;
    req.session.auth = null;

    console.log("req.session 2 = ", req.session);
    let state = req.query.state;
    if (state == "") state = null;
    res.redirect(state ?? "/");
}