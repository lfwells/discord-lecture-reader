export function guildList(req, res) 
{
  res.render('guildList', {
    guilds: client.guilds.cache.filter(g => !isOutsideTestServer(g)),
    testMode: config.TEST_MODE,
  });
}

export async function guildHome(req, res) 
{  
  var setLectureChannelID = req.query.setLectureChannelID;
  if (setLectureChannelID)
  {
    await req.guildDocument.update({
      lectureChannelID: setLectureChannelID
    });
    req.lectureChannelID = setLectureChannelID;
    GUILD_CACHE[req.guild.id].lectureChannelID = setLectureChannelID;

    req.lectureChannel = await client.channels.fetch(req.lectureChannelID);//.cache.filter(c => c.id == lectureChannelID);
    res.locals.lectureChannel = req.lectureChannel;

    req.query.message = "set the lecture channel to #"+req.lectureChannel.name;
  }

  res.render("guild");
}
