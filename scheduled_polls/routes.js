import { db } from "../core/database.js";
import { asyncForEach } from "../core/utils.js";

//scheduled polls
export async function load(req,res,next) {
    req.pollCollection = req.guildDocument.collection("polls");
    req.pollsSnapshot = await req.pollCollection.orderBy("order", "asc").get();
    req.polls = {};
    req.pollsSnapshot.forEach(poll => {
        var poll = poll.data();
        var page = poll.page ?? "Page 1";
        if (!req.polls[page]) req.polls[page] = [];
        req.polls[page].push(poll);
    });
    next();
}

export async function getPollSchedule(req,res,next) 
{
  res.render("pollSchedule", {
    polls: req.polls
  });
}

export async function postPollSchedule(req,res,next) 
{
    var polls = req.body.polls; 
    var currentPage = "Page 1";

    var hasPages = polls.indexOf("!--") >= 0;

    var pages = polls.split("!--").filter(l => l.trim() != "");
    polls = {};
    pages = pages.map(page => 
    {
        
        var thisPagePolls = page.split("\r\n").filter(l => l.trim() != "");
        //first get the page name from the first line
        if (hasPages)
        {
            currentPage = thisPagePolls.shift();
        }

        var i = 0;
        thisPagePolls = thisPagePolls.map(line => {

            var pivot = line.indexOf('/poll');
            return { 
                order: i++,
                page: currentPage,
                note: line.substr(0, pivot).replace(" /poll ", "").trim(), 
                poll: line.substr(pivot).trim()
            };
        });

        polls[currentPage] = thisPagePolls;
    });

    console.log("polls", polls);
    // Delete documents in a batch
    const batch = db.batch();
    req.pollsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    const addBatch = db.batch();
    await asyncForEach(Object.values(polls), async function (page) {
        page.forEach((poll) => {
            var docRef = req.pollCollection.doc();
            addBatch.set(docRef, poll);
        });
    });
    await addBatch.commit();

    res.render("pollSchedule", {
        polls: polls
    });
}
  