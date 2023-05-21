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
    if (req.hostname == null || req.hostname == undefined)
    {
        return res.end("Hostname not set");
    }
    
    const url = oauth(req).generateAuthUrl({
        scope: scope, 
        state: req.query.path, 
    });

    res.render('login', { url: url });//TODO: redirect url within the site??
}
export async function loginComplete(req,res)
{
    //console.log(req.query);

    var auth = await oauth(req).tokenRequest({
        code: req.query.code,
        scope: scope,
        grantType: "authorization_code",
    });
    //console.log(auth);
    var session = req.session;
    session.auth = auth;
    req.session = session;
    await req.session.save();
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
    await req.session.save();

    console.log("req.session 3 = ", req.session);
    let state = req.query.state;
    if (state == "") state = null;
    res.redirect(state ?? "/");
}