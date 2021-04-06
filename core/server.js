import * as config from './config.js'; 

//create a server to listen to requests
import express  from 'express';

export const app = express();

import basicAuth from 'express-basic-auth';
import users from "../users.js";

app.use(function(req, res, next) {
  if (
    req.path.indexOf("/text/") > 0 || 
    req.path.endsWith("/text/latest/") || 
    req.path.indexOf("/poll/") > 0 || 
    req.path.endsWith(".js") || 
    req.path.endsWith(".css") || 
    req.path.endsWith(".ico")|| 
    req.path.indexOf("/static/") === 0) {
    //console.log("skipping auth to allow polls to work", req.path);
    next();
  } else {
    //console.log("challenge:", req.path);
    basicAuth(users)(req, res, next);
  }
});
/*app.use())*/

app.use(express.json());
app.use(express.urlencoded({extended:true}));

import ejs from 'ejs';
app.engine('.html', ejs.__express);

// Optional since express defaults to CWD/views
import path from 'path';
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
  config.TEST_MODE = req.params.onoff == "true"
  res.redirect("/");
}) 

app.listen(config.__port, () => console.log(`Server running on ${config.__port}...`));

