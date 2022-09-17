
import fs from "fs";
import getStream from "get-stream";
import { parse } from "csv-parse";

//extra assumption: anything after a " (" in a group name is to be ignored
export async function parseMyLOGroupsCSV(req, fileUpload)
{
    var categories = {};
    var content = await readCSVData(fileUpload.tempFilePath);
    if (content.length == 0) return categories;

    //first line is headers, but importantly, thats our group categories
    var headers = Object.keys(content[0]);//content.shift();
    var groupCategoryNames = headers.filter((v,i,a) => {
        return ["OrgDefinedId","Username","Last Name","First Name", "Email", "End-of-Line Indicator"].indexOf(v) == -1 && v.indexOf("<") == -1 && v.indexOf("Final Grade") == -1 && v.indexOf("Subtotal") == -1;
    });

    content = content.map(function (obj) {
        /*var obj = {};
        for (var i = 0; i < headers.length; i++)
        {
            obj[headers[i]] = row[i];
        }*/
        //strip the leading # from the user id and username columns
        obj["OrgDefinedId"] = obj["OrgDefinedId"].substring(1);
        obj["Username"] = obj["Username"].substring(1);
        return obj;
    });

    content.forEach(myLOStudent => {
        groupCategoryNames.forEach(groupCategory => 
        {
            //console.log("groupCategory", groupCategory);
            if (!categories[groupCategory]) categories[groupCategory] = {};
            var groups = categories[groupCategory];

            var groupName = myLOStudent[groupCategory];
            if (Array.isArray(groupName))
                groupName = groupName.join("");

            if (groupName && groupName.length > 0)
            {
                //console.log("groupName", groupName, JSON.stringify(myLOStudent));
                var bracketsIndex = groupName.indexOf(" (");
                if (bracketsIndex > 0)
                    groupName = groupName.substring(0, bracketsIndex);
                
                //add them to the group (create it if not exists)
                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(myLOStudent["Username"]);
            } 

            categories[groupCategory] = groups;
        });
    });
    return categories;

}

async function readCSVData (filePath) {
    const parseStream = parse({delimiter: ',', columns:true, group_columns_by_name: true});
    const data = await getStream.array(fs.createReadStream(filePath).pipe(parseStream));
    return data;
}