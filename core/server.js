import * as config from './config.js'; 
import init_routes from './routes.js';

//create a server to listen to requests
import express  from 'express';

export const app = express();

//import basicAuth from 'express-basic-auth';
//import users from "../users.js";
import { loginPage, oauth } from './login.js';

import cors from "cors"; 

import cookieParser from 'cookie-parser';
import sessions from "express-session";

import ejs from 'ejs';
import path from 'path';

import FileStore from 'session-file-store';

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
  
  app.engine('.html', ejs.__express);
  
  // Optional since express defaults to CWD/views
  const __dirname = path.resolve(); //todo put in export
  
  app.set('views', path.join(__dirname, 'views')); 
  app.set('view engine', 'html');
  app.use('/static', express.static(path.join(__dirname, 'www')))
  app.use(function(req, res, next) {
    res.locals.query = req.query;
    res.locals.params = req.params;
    res.locals.url   = req.originalUrl;
    res.locals.body   = req.body;
    next();
  });
  
  
  app.get("/testmode/:onoff", (req, res, next) =>
  {
    config.setTestMode(req.params.onoff == "true");
    res.redirect("/");
  });
  
  app.listen(config.__port, () => console.log(`Server running on ${config.__port}...`));
  
  
  //web server routes
  init_routes(app);
}

export async function authHandler (req, res, next)  { 
  if ((
    
    req.path.indexOf("obs") >= 0 ||  //TODO: this shouldn't bypass security, it should instead require a secret key (but this will mean we need to update our browser sources etc)

    req.path.indexOf("/login") >= 0 || 
    req.path.indexOf("/loginComplete") >= 0 || 
    req.path.indexOf("/text/") >= 0 || 
    req.path.endsWith("/text/latest/") || 
    req.path.indexOf("/poll") >= 0 || 
    req.path.indexOf("/recordProgress/") >= 0 || 
    req.path.indexOf("/recordSectionProgress/") >= 0 || 
    req.path.endsWith(".js") || 
    req.path.endsWith(".css") || 
    req.path.endsWith(".ico")|| 
    req.path.indexOf("/static/") === 0)) {
    //console.log("skipping auth to allow polls to work", req.path);
    next();
  } else {
    //console.log("challenge:", req.path);
    //console.log(("auth check"), req.session);
    if (req.session == undefined || req.session.auth == undefined)
    {
      loginPage(req,res);
    }
    else
    {
      //store some basic discord info
      try
      {
        req.discordUser = await oauth.getUser(req.session.auth.access_token);
        res.locals.discordUser = req.discordUser;
      }
      catch (DiscordHTTPError) {
        return loginPage(req,res);
      }
      //console.log(req.discordUser);

      //basicAuth(users)(req, res, next);
      next();
    }
  }
}