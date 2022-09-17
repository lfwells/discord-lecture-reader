
import fs from "fs";
import getStream from "get-stream";
import { parse } from "csv-parse";

//Note: this approach assumes that group numbers are unique across different group categories
//however, I have added the uniqueGroups param here -- if this func is called with this true, then I prepend category
//I haven't hooked this up to the web interface as a checkbox though, waiting for someone to have the usecase for it
export async function parseMyLOGroupsCSV(req, fileUpload, uniqueGroups)
{
    var groups = {};
    var content = await readCSVData(fileUpload.tempFilePath);

    //first line is headers, but importantly, thats our group categories
    var headers = content.shift();
    var groupCategories = headers.filter((v,i,a) => {
        return ["OrgDefinedId","Username","Last Name","First Name", "Email"].indexOf(v) == -1 && v.indexOf("<") == -1;
    });

    content = content.map(function (row) {
        var obj = {};
        for (var i = 0; i < headers.length; i++)
        {
            obj[headers[i]] = row[i];
        }
        //strip the leading # from the user id and username columns
        obj["OrgDefinedId"] = obj["OrgDefinedId"].substring(1);
        obj["Username"] = obj["Username"].substring(1);
        return obj;
    });

    content.forEach(myLOStudent => {
        console.log("---", myLOStudent["First Name"]);
        groupCategories.forEach(groupCategory => 
        {
            var groupName = myLOStudent[groupCategory];
            if (groupName && groupName.length > 0)
            {
                if (uniqueGroups) groupName = groupCategory+" "+groupName;
                
                //add them to the group (create it if not exists)
                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(myLOStudent);
            } 
        });
    });

    console.log(groups);
    return groups;

}

async function readCSVData (filePath) {
    const parseStream = parse({delimiter: ','});
    const data = await getStream.array(fs.createReadStream(filePath).pipe(parseStream));
    return data;
}