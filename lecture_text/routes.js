import { send } from "../core/client.js";

import { getGuildCache } from "../guild/guild.js";
var GUILD_CACHE = getGuildCache();

//import * as emoji from 'emoji.json'; //TODO work out how to import this, read their github
var emoji = [];


//full screen texts , TODO allow delete
export const text_animations = ["scale", "horizontal", "vertical", "fade"];
export const text_styles = ["arlina", "yikes", "dang", "rainbow"];

export async function load(req,res,next)
{
  req.textCollection = req.guildDocument.collection("lecture-text").doc("details");
  try {
    req.textCollectionSnapshot = await req.textCollection.get();
  
  req.textCollectionPhrases = req.guildDocument.collection("lecture-text");
  req.textCollectionPhrasesSnapshot = await req.textCollectionPhrases.orderBy("order").get();
  }
  catch {}

  var phrases = []
  if (req.textCollectionPhrasesSnapshot.empty == false)
  {
    req.textCollectionPhrasesSnapshot.forEach(doc  => {
      if (doc.id != "details") 
      {
        phrases.push(doc.data().phrase);
      }
    });
  }
  req.phrases = phrases;

  res.locals.animations = text_animations;
  res.locals.styles = text_styles;

  next();
}

export async function obs(req,res,next) 
{
  res.render("text/text");
}

export async function inputGet(req,res,next) 
{
  res.render("text/text_input", {
    phrases: req.phrases,
    emoji: emoji
  });
}

export async function inputPost(req,res,next) 
{
  console.log(req.body);

  //add a new saved phrase if they did one
  if (req.body.customemoji) req.body.custom = req.body.customemoji;
  var newPhrase = req.body.custom;
  if (newPhrase)
  {
    await req.textCollectionPhrases.add({
      phrase: newPhrase,
      order: req.phrases.length
    });
    req.phrases.push(newPhrase);
    req.body.text = newPhrase;
  }

  if (req.body.robolindsay && req.body.robolindsay == "on")
  {
    await send(req.lectureChannel, req.body.text);
  }

  //trigger the db to have information
  await req.textCollection.set(req.body);
  GUILD_CACHE[req.guild.id].latestText = req.body;

  //back to the page
  req.query.message = "Posted '"+req.body.text+"'!"; 
  res.render("text/text_input", {
    phrases: req.phrases,
    emoji: emoji
  });
}
export async function getLatest(req,res,next) 
{
  if (GUILD_CACHE[req.guild.id] && GUILD_CACHE[req.guild.id].latestText)
  {
    res.json(GUILD_CACHE[req.guild.id].latestText);
    GUILD_CACHE[req.guild.id].latestText = null;
    return;
  }
  else if (req.textCollectionSnapshot)
  {
    var data = req.textCollectionSnapshot.data();
    if (data)
    {
      console.log("found latest full screen text", data);
      res.json(data);

      //now immediately delete so it doesnt show again
      await req.textCollection.delete();
      return;
    }
  }
  //otherwise just empty data
  res.json({});
}
export async function render(req,res,next) 
{
  if (req.params.style == "") 
  {
    res.end("");
    return;
  }
  if (!req.query.animation || req.query.animation == "random") 
  {
    req.query.animation = text_animations[Math.floor(Math.random() * text_animations.length)]; 
  }
  if (!req.query.duration)
  {
    req.query.duration = 2;
  }
  if (req.params.style == "random")
  {
    req.params.style = text_styles[Math.floor(Math.random() * text_styles.length)]; 
  }

  res.render("text/text_"+req.params.style, {
    animation:req.query.animation,
    duration:req.query.duration,
    inout:req.query.animation == "fade" ? 1 : 0.5
  });
}