
//scheduled polls
export async function load(req,res,next) {
    req.pollCollection = req.guildDocument.collection("polls");
    req.pollsSnapshot = await req.pollCollection.orderBy("order", "asc").get();
    req.polls = [];
    req.pollsSnapshot.forEach(poll => req.polls.push(poll.data()));
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
    //TODO: preserver order :(
    var polls = req.body.polls;
    polls = polls.split("\r\n").filter(l => l.trim() != "");
    var i = 0;
    polls = polls.map(line => {
        var pivot = line.indexOf('/poll');
        return { 
            order: i++,
            note: line.substr(0, pivot).replace(" /poll ", "").trim(), 
            poll: line.substr(pivot).trim()
        };
    });

    console.log("polls", polls);
    // Delete documents in a batch
    const batch = db.batch();
    req.pollsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    const addBatch = db.batch();
    polls.forEach((poll) => {
        var docRef = req.pollCollection.doc();
        addBatch.set(docRef, poll);
    });
    await addBatch.commit();

    res.render("pollSchedule", {
        polls: polls
    });
}
  