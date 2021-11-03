import * as config from '../core/config.js';
import { getGuildPropertyConverted } from '../guild/guild.js';


export const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
export const invlerp = (x, y, a) => clamp((a - x) / (y - x));

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
  var custom = user != null && user.presence != null ? user.presence.activities : null;
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

export async function offTopicOnly(interaction)
{
    var offTopicChannel = await getGuildPropertyConverted("offTopicChannel", interaction.guild);
    if (offTopicChannel && interaction.channel != offTopicChannel)
    {
        interaction.reply({ content: "You can only `/"+interaction.commandName+"` in <#"+offTopicChannel.id+">", ephemeral:true });
        return true;
    }
    return false;
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

export function pluralize(number, textNotPlural, textPlural)
{
  if (number == 1)
  {
    return number +" "+textNotPlural;
  }
  else 
  {
    if (textPlural == undefined)
    {
      textPlural = textNotPlural+"s";
    }
    return number + " " + textPlural;
  }
}

//https://advancedweb.hu/how-to-use-async-functions-with-array-filter-in-javascript/
export async function asyncFilter (arr, predicate) {
	const results = await Promise.all(arr.map(predicate));

	return arr.filter((_v, index) => results[index]);
}