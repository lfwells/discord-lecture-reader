//Init
console.log("Injecting MyLO Dictionary");
$ = window.parent.$;

//you can inherit another unit by having a key `__inherit` in the dictionary
var DICTIONARY = {
    //fallback case if the orgID is not found
    "default": {
        "unityVersion": "Unity Version TBA",
        "test": "test"
    },

    //KIT109 Semester 1 2024
    "641665": {
        "unityVersion": '<a href="https://unity.com/releases/editor/whats-new/2023.2.8">Unity 2023.2.8(f1)</a>',
        'blenderVersion': '<a href="https://www.blender.org/download/release/Blender4.0/blender-4.0.2-windows-x64.msi/">Blender 4.0.2</a>'
    },

    //KIT109 Semester 2 2024
    "674786": {
        "unityVersion": '<a href="https://unity.com/releases/editor/whats-new/6000.0.5">Unity 6000.0.5f1</a>',
    },
    

    //KIT207 Semester 1 2024 (just inherits from KIT109)
    "641666": {
        "__inherit": "641665"
    },

    //KIT305 Semester 1 2024
    "641209": {
        "__inherit": "641665",
        "balsamiqVersion": '<a href="https://balsamiq.com/wireframes/desktop/archives/">4.7.4 -- latest</a>',
        "androidStudioVersion": '<a href="https://developer.android.com/studio/archive">Hedgehog 2023.1.1 -- this is no longer the latest version</a>',
        "xcodeVersion": '<a href="https://apps.apple.com/au/app/xcode/id497799835?mt=12">15.2 -- latest</a>',
        "flutterVersion": '<a href="https://docs.flutter.dev/release/archive?tab=windows">3.16.9 -- latest</a>',
        
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
                //un-camel case the key and capitalise the first letter of each word
                key = key.replace(/([A-Z])/g, " $1").replace(/^./, function(str){ return str.toUpperCase(); });
                //append "not found"
                key += " not found";
                return key;
            }
            else if (DICTIONARY[orgID]["__inherit"])
            {
                return get(key, DICTIONARY[orgID]["__inherit"]);
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

//if the orgID is undefined or not 6 characters, its in valid, give it another try using the window search params for "ou"
if (!orgID || orgID.length != 6)
{
    let searchParams = new URLSearchParams(window.top.location.search);
    orgID = searchParams.get("ou");
}

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
