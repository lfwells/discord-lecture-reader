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


import Parser from 'json2csv';
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