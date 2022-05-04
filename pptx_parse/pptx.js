import PPTX2Json from 'pptx2json';

export async function test_parse_pptx(req, res, next)
{
    const pptx2json = new PPTX2Json();

    const json = await pptx2json.toJson("/home/ubuntu/discord/pptx_parse/test.pptx");

    var links = [];

    traverseSlides(json, (e) => typeof(e) === "string" 
        && e.indexOf("http") >= 0 
        && e.indexOf("schemas") == -1 
        && e.indexOf("XMLSchema") == -1
        && e.indexOf("purl.org") == -1 
        && e.indexOf("pollRoboLinds") == -1, 
        function(e, slide) { if (slide != undefined) links.push(slide+" -- "+e); });

    //res.json(links);
    res.write(links.join("\n"));
    res.end();
}



function traverseSlides(jsonObj, predicate, doWithThingsThatPassPredicate, slide) {
    if( jsonObj !== null && typeof jsonObj == "object" ) {
        Object.entries(jsonObj).forEach(([key, value]) => {
            if (key.indexOf("ppt/slides/slide") >= 0)
            {
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