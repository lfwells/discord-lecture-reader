import * as config from '../core/config.js';

export function isOutsideTestServer(guild)
{
  if (guild.id != config.TEST_SERVER_ID)
  {
    return config.TEST_MODE;
  }
  else
  {
    return false;
  }
}

export async function getStatus(memberID, guild)
{
  
  var user = await guild.members.fetch(memberID);
  var custom = user.presence.activities;
  if (custom)
  {
    custom = custom[0];
    if (custom)
      return { available:parseClientStatus(user.presence.clientStatus), status:custom.state }
  }
  return { available:parseClientStatus(user.presence.clientStatus) }
}
export function parseClientStatus(status)
{
  if (status)
  {
    if (status.mobile)
      return status.mobile;
    if (status.desktop)
      return status.desktop;
    if (status.web)
      return status.web;
  }
  return "offline";
}


import { Parser } from 'json2csv';
import ifError from 'assert';
export function downloadResource(filename) {
  return function(req, res, next) {
    const json2csv = new Parser({ fields:req.fields });
    const csv = json2csv.parse(req.data);
    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    return res.send(csv);
  }
}

//middleware helpers

//use this handie little tool to allow question marks in poll urls
export function removeQuestionMark(req, res, next)
{
  console.log("index of q", req.originalUrl.indexOf("?"));
  if (req.originalUrl.indexOf("?") > 0)
  {
    res.redirect(req.originalUrl.replace("?", "%3F"));
  }
  else
    next();
}

export function redirectToMainPage(req,res, message){
  res.redirect("/guild/"+req.params.guildID+"/?message="+message);
}
export function redirectToWhereWeCameFrom(req,res,message) {
  res.redirect(req.headers.referer+"?message="+message);
}

//https://stackoverflow.com/questions/14249506/how-can-i-wait-in-node-js-javascript-l-need-to-pause-for-a-period-of-time
export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  