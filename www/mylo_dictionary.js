//Init
console.log("Injecting MyLO Dictionary");
$ = window.parent.$;

var DICTIONARY = {
    //fallback case if the orgID is not found
    "default": {
        "unityVersion": "Unity Version TBA",
    },

    //KIT109 Semester 1 2024
    "641665": {
        "unityVersion": "Unity 2024.3.0f6",
    },

    //KIT305 Semester 1 2024
    "641209": {
        "balsamiqVersion": "4.7.4 -- latest",
        "androidStudioVersion": "Giraffe 2023.1.1.28 -- latest",
        "xcodeVersion": "15.2 -- latest",
        "flutterVersion": "3.16.9 -- latest",
        
    },
};

function get(key, orgID)
{
    if (DICTIONARY[orgID])
    {
        if (DICTIONARY[orgID][key] == undefined)
        { 
            if (orgID == "default")
            {
                return null;
            }
            return get(key, "default");
        }
        return DICTIONARY[orgID][key];
    }
    return get(key, "default");
}

let url = window.top.document.location.href.replace("d2l", "");
//extract numbers from the url
let orgID = url.match(/\d+/g);
orgID = orgID ? orgID[0] : null;

//go through the outerHTML of the entire page and find any instances of ${key} and replace it with the value from the dictionary
let html = $("body").html();
let keys = html.match(/\${\w+}/g);
keys = keys ? keys.map(key => key.substring(2, key.length - 1)) : [];
keys = [...new Set(keys)];
keys.forEach(key => {
    let value = get(key, orgID);
    if (value != null)
    {
        html = html.replace(new RegExp("\\${" + key + "}", "g"), value);
    }
});
//also remove all iframes
html = html.replace(/<iframe.*?\/iframe>/g, "");
$("body").html(html);
