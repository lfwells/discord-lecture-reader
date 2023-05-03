import * as config from './config.js'; 
import init_routes from './routes.js';

//create a server to listen to requests
import express  from 'express';
import expressWebSocket from "express-ws";

import fsfs from 'fs';
import http from 'http';
import https from 'https';

export const app = express();

//import basicAuth from 'express-basic-auth';
//import users from "../users.js";
import { loginPage } from './login.js';
import { oauth } from '../_oathDiscord.js';

import cors from "cors"; 

import fileUpload from "express-fileupload";

import cookieParser from 'cookie-parser';
import sessions from "express-session";

import ejs from 'ejs';
import path from 'path';

import FileStore from 'session-file-store';
import { log } from 'console';
import { createRouter } from 'discord-chat-preview';
import { getClient } from './client.js';


import { exec } from 'child_process';
import { getPermissions, hasPermissionCached, isUTASBotAdminCached } from './permissions.js';

export function init_server()
{
  app.use(cors())

  app.use(cookieParser())
  
  var fs = FileStore(sessions);
  const fileStoreOptions = {};
  const oneDay = 1000 * 60 * 60 * 24;
  app.use(sessions({
      secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
      saveUninitialized:true,
      store: new fs(fileStoreOptions),
      cookie: { maxAge: oneDay * 90 },
      resave: false 
  }));
  

  app.use(authHandler);
  /*app.use())*/

  app.use(express.json());
  app.use(express.urlencoded({extended:true}));

  //allow file uploads
  app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : '/tmp/'
  }));

  //https://stackoverflow.com/questions/13442377/redirect-all-trailing-slashes-globally-in-express/35927027
  app.use((req, res, next) => {
    if (req.path.substr(-1) === '/' && req.path.length > 1) {
      const query = req.url.slice(req.path.length)
      const safepath = req.path.slice(0, -1).replace(/\/+/g, '/')
      res.redirect(301, safepath + query)
    } else {
      next()
    }
  })
  
  app.engine('.html', ejs.__express);
  
  // Optional since express defaults to CWD/views
  const __dirname = path.resolve(); //todo put in export
  
  app.set('views', path.join(__dirname, 'views')); 
  app.set('view engine', 'html');

  //when doing lets-encrypt rewnal and they want a challenge, need to adjust this to be just `/`
  app.use('/static', express.static(path.join(__dirname, 'www')))

  app.use(function(req, res, next) {
    res.locals.query = req.query;
    res.locals.params = req.params;
    res.locals.url   = req.originalUrl;
    res.locals.body   = req.body;
    next();
  });
  app.use(function(req, res, next) {
    res.locals.config = config;
    next();
  });
  
  
  app.get("/testmode/:onoff", (req, res, next) =>
  {
    config.setTestMode(req.params.onoff == "true");
    res.redirect("/");
  });
  
  //app.listen(config.__port, () => console.log(`Server running on ${config.__port}...`));
  
  
  const httpServer = http.createServer(app);
  httpServer.listen(8080, () => {
    console.log('HTTP Server running on port 8080');
  });

  try
  {
    // Certificate
    const privateKey = fsfs.readFileSync('/etc/letsencrypt/live/utasbot.dev/privkey.pem', 'utf8');
    const certificate = fsfs.readFileSync('/etc/letsencrypt/live/utasbot.dev/cert.pem', 'utf8');
    const ca = fsfs.readFileSync('/etc/letsencrypt/live/utasbot.dev/chain.pem', 'utf8');

    const credentials = {
      key: privateKey,
      cert: certificate,
      ca: ca
    };

    // Starting both http & https servers
    const httpsServer = https.createServer(credentials, app);

    httpsServer.listen(443, () => {
      console.log('HTTPS Server running on port 443');
    });

    
    //Lake's chat preview package (TODO: authenticate)
    expressWebSocket(app, httpsServer);    // << Make sure you have WS support on your express
    app.use("/chat", createRouter(getClient()));
  }
  catch 
  {
    console.log("failed to start https server");
  }

  
  //web server routes
  init_routes(app);
}

export async function authHandler (req, res, next)  
{ 
  //console.log("auth handler", req.path);
  if (req.path != "/" && (
    
    req.path.indexOf("obs") >= 0 ||  //TODO: this shouldn't bypass security, it should instead require a secret key (but this will mean we need to update our browser sources etc)

    req.path.indexOf("/login") >= 0 || 
    req.path.indexOf("/loginComplete") >= 0 || 
    req.path.indexOf("/myloConnectComplete") >= 0 || 
    req.path.indexOf("/myloDisconnect") >= 0 || 
    req.path.indexOf("/guide") >= 0 || 
    req.path.indexOf("/text") >= 0 || 
    req.path.indexOf("/text/latest") || 
    req.path.indexOf("/poll") >= 0 || 
    req.path.indexOf("/recordProgress") >= 0 || 
    req.path.indexOf("/recordSectionProgress") >= 0 || 
    req.path.endsWith(".js") || 
    req.path.endsWith(".css") || 
    req.path.endsWith(".ico")|| 
    req.path.indexOf("/static") === 0)) {
    //console.log("skipping auth to allow polls to work", req.path);

    //store some basic discord info (but in this case, don't error)
    try
    {
      req.discordUser = await oauth(req).getUser(req.session.auth.access_token);
      res.locals.discordUser = req.discordUser;

      req.permissions = await getPermissions(req.discordUser.id);
      res.locals.hasPermission = (permission) => {
        return isUTASBotAdminCached(req.permissions) || hasPermissionCached(permission, req.permissions);
      };
      res.locals.isUTASBotAdmin = () => {
        return isUTASBotAdminCached(req.permissions);
      };
    }
    catch (DiscordHTTPError) { }

    //console.log("auth handler next", req.path);
    next();
  } 
  else 
  {
    //console.log("challenge:", req.path);
    //console.log(("auth check"), req.session);
    if (req.session.auth == null || req.session == undefined || req.session.auth == undefined)
    {
      console.log("auth check failed", req.session);
      loginPage(req,res);
    }
    else
    {
      //store some basic discord info
      try
      {
        console.log({token: req.session.auth.access_token}); 
        req.discordUser = await oauth(req).getUser(req.session.auth.access_token);
        res.locals.discordUser = req.discordUser;

        req.permissions = await getPermissions(req.discordUser.id);
        res.locals.hasPermission = (permission) => {
          return isUTASBotAdminCached(req.permissions) || hasPermissionCached(permission, req.permissions);
        };
        res.locals.isUTASBotAdmin = () => {
          return isUTASBotAdminCached(req.permissions);
        };
      }
      catch (DiscordHTTPError) {
        console.log("caught discord http error", DiscordHTTPError);
        return loginPage(req,res);
      }
      //console.log(req.discordUser);

      //basicAuth(users)(req, res, next);
      next();
    }
  }
}

export function beginStreamingRes(res)
{
   //stream the content thru
  //should have used a websocket or something but meh
  //just call res.write after this, and it will stream to browser
  //after calling this, write messages with res.write(str);
  //and finish it all up with res.end();

  res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff'});
  return res;
}

export function renderErrorPage(message)
{
  return function (req,res,next)
  {
    res.render("error", {
      error: message
    });
  };
}

export function renderEJS(page, options)
{
  return function (req,res,next) {
    res.render(page, options);
  };
}

export async function restart(req,res,next)
{
  console.log("\n\n---RESTART REQUESTED---\n\n");

  res.json({restarting:true});

  exec('pm2 restart all', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }

    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
}