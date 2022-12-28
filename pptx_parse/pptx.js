import PPTX2Json from 'pptx2json';
import { getClient } from '../core/client.js';
import { asyncForEach, pluralize } from '../core/utils.js';

export async function parse_pptx_page(req,res,next)
{
    if (!req.files)
    {
        var postIndividualLink = Object.keys(req.body).find(v => v.startsWith("postIndividualLink"));
        if (req.body.post)
        {
            //step 3
            var filename = req.body.filename;
            var links = req.body.links;
            var client = getClient();
            var channelToPostIn = await client.channels.fetch(req.body.channelToPostIn);
            var originalChannelToPostIn = channelToPostIn;
            
            if (req.body.asThread)
            {
                channelToPostIn = await channelToPostIn.threads.create({
                    name: `Links from ${filename}`,
                    reason: 'Needed a separate thread for lecture links',
                });
            }

            await channelToPostIn.send({ content: `Here are ${pluralize(links.length, "Link")} from the slides \`${filename}\`:` });
            await asyncForEach(links, async function(link) {
                await channelToPostIn.send({ content: link });
            });

            res.render("pptx",  { success: `Posted ${pluralize(links.length, "Link")} to #${originalChannelToPostIn.name}` });
        }
        else if (postIndividualLink)
        {
            var filename = req.body.filename;
            var links = req.body.links;
            var client = getClient();
            var channelToPostIn = await client.channels.fetch(req.body.channelToPostIn);

            postIndividualLink = postIndividualLink.replace("postIndividualLink", "");
            var link = links[postIndividualLink];

            await channelToPostIn.send({ content: link });
            

            res.render("pptx", { successSingle: `Posted Link to #${channelToPostIn.name}`, filename, links, channelToPostIn, postIndividualLink});
        }
        else
        {
            //step 1
            res.render("pptx");
        }
    }
    else
    {
        //step 2
        var tempFilePath = req.files.pptxFile.tempFilePath;
        var links = await parsePPTX(tempFilePath);
        var filename = req.files.pptxFile.name;

        res.render("pptx",  { links, tempFilePath, filename });
    }
}

async function parsePPTX(file)
{
    const pptx2json = new PPTX2Json();

    const json = await pptx2json.toJson(file);

    var links = [];

    traverseSlides(json, (e) => typeof(e) === "string" 
        && e.indexOf("http") >= 0 
        && e.indexOf("schemas") == -1 
        && e.indexOf("XMLSchema") == -1
        && e.indexOf("purl.org") == -1 
        && e.indexOf("pollRoboLinds") == -1, 
        function(e, slide) { if (slide != undefined) links.push(slide+" -- "+e); });

    return links;
}



function traverseSlides(jsonObj, predicate, doWithThingsThatPassPredicate, slide) {
    if( jsonObj !== null && typeof jsonObj == "object" ) {
        Object.entries(jsonObj).forEach(([key, value]) => {
            if (key.indexOf("ppt/slides/slide") >= 0)
            {
                key = key.replace("ppt/slides/slide", "Slide ");
                key = key.replace(".xml", "");
                // key is either an array index or object key
                traverseSlides(value, predicate, doWithThingsThatPassPredicate, key);
            }
            else
            {
                traverseSlides(value, predicate, doWithThingsThatPassPredicate, slide);
            }
        });
    }
    else {
        // jsonObj is a number or string
        if (predicate(jsonObj))
        {
            doWithThingsThatPassPredicate(jsonObj, slide);
        }
    }
}

//generic version
function traverse(jsonObj, predicate, doWithThingsThatPassPredicate) {
    if( jsonObj !== null && typeof jsonObj == "object" ) {
        Object.entries(jsonObj).forEach(([key, value]) => {
            // key is either an array index or object key
            traverse(value, predicate, doWithThingsThatPassPredicate);
        });
    }
    else {
        // jsonObj is a number or string
        if (predicate(jsonObj))
        {
            doWithThingsThatPassPredicate(jsonObj);
        }
    }
}