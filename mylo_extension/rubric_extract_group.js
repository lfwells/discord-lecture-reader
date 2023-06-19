// Description: 
// This script will extract rubric data from a dropbox with group submissions and output it as a csv file
//
// Disclaimer:
// This code was written quickly and is not guaranteed to work in all cases.
// This code is provided as-is and is not supported by the author.
// Despite this, this code interacts with rubrics in a read-only manner and should not cause any harm.
//
// Requirements:
// - MyLO Mate Chrome Extension (https://www.utas.edu.au/building-elearning/resources/mylo-mate)
//
// Usage:
// - Modify the following variable to match the category name that contains your assignment groups
const groupCategoryName = "Assignment Groups";
// - Modify the following variable if you would like each row in the CSV to represent a single group
const listAsGroups = false;
// - Navigate to the dropbox (i.e. submissions list) of the assignment you want to get an output for
// - Open chrome inspector, open console tab
// - Paste in all of this code and press enter
//
// Limitations:
// - only works for one rubric per assignment
// - untested on all combinations of rubrics, outcomes, and dropbox settings
// - does not handle students being enrolled in more than one group from the group catgegory (which wouldn't make sense anyway really)

const ou = window.location.searchParams.ou;
const dropboxId = window.location.searchParams.db;

const grades = {};

const dropbox = (await api(`/d2l/api/le/1.48/${ou}/dropbox/folders/${dropboxId}`))[0];
const criteria = Object.fromEntries(dropbox.Assessment.Rubrics[0].CriteriaGroups.flatMap(group => group.Criteria).map(c => [c.Id, c.Name]));

let classlist = await api(`/d2l/api/le/1.40/${ou}/classlist/`, { });
classlist = Object.fromEntries(classlist.map(s => [s.Identifier, s]));

let groupcategories = await api(`/d2l/api/lp/1.22/${ou}/groupcategories/`, { });
//groups = Object.fromEntries(classlist.map(s => [s.Identifier, s]));
let groupcategory = groupcategories.find(g => g.Name == groupCategoryName);
let groups = await Promise.all(groupcategory.Groups.map(groupId => (api(`/d2l/api/lp/1.22/${ou}/groupcategories/${groupcategory.GroupCategoryId}/groups/${groupId}`))));
groups = Object.fromEntries(groups.map(g => [g[0].GroupId, g[0]]));

//determine which group each student in the classlist is enrolled in, appending a groupId to th student object
for (var studentId of Object.keys(classlist))
{
    var foundGroup = Object.values(groups).find(g => g.Enrollments.filter(e => e == studentId).length >= 1);
    if (foundGroup)
    {
        console.log({found:foundGroup.GroupId});
        classlist[studentId].GroupId = foundGroup.GroupId;
        classlist[studentId].GroupName = foundGroup.Name;
    }
}

console.log({groups, classlist});

if (listAsGroups)
{
    const results = await Promise.all(Object.values(groups).map(group => [group.GroupId, api(`/d2l/api/le/1.48/${ou}/dropbox/folders/${dropboxId}/feedback/group/${group.GroupId}`, {})]));
    for (const r of results)
    {
        let groupId = r[0]
        let feedback = await r[1];

        feedback = feedback.length > 0 ? feedback[0] : null;
        if (feedback)
        {
            feedback = await feedback;
            grades[groupId] = ["GroupId","Name","Code"]
                .reduce((obj2, key) => (obj2[key] = groups[groupId][key], obj2), {});
            grades[groupId].Score = feedback.Score

            //now parse the rubric
            let rubric = feedback.RubricAssessments[0];
            if (!rubric) continue;
            for (const outcome of rubric.CriteriaOutcome) {
                const rowID = criteria[outcome.CriterionId];
                const obj = {};
                obj[rowID] = outcome.Score;
                Object.assign(grades[groupId], obj);
            }
        }
    }
}
else
{
    const results = await Promise.all(Object.keys(classlist).map(userId => [userId, api(`/d2l/api/le/1.48/${ou}/dropbox/folders/${dropboxId}/feedback/group/${classlist[userId].GroupId}`, {})]));
    for (const r of results)
    {
        let userId = r[0]
        let feedback = await r[1];
        feedback = feedback.length > 0 ? feedback[0] : null;
        if (feedback)
        {
            feedback = await feedback;
            grades[userId] = ["Username","OrgDefinedId","Email","FirstName","LastName", "GroupId", "GroupName"]
                .reduce((obj2, key) => (obj2[key] = classlist[userId][key], obj2), {});
            grades[userId].Score = feedback.Score

            //now parse the rubric
            let rubric = feedback.RubricAssessments[0];
            if (!rubric) continue;
            for (const outcome of rubric.CriteriaOutcome) {
                const rowID = criteria[outcome.CriterionId];
                const obj = {};
                obj[rowID] = outcome.Score;
                Object.assign(grades[userId], obj);
            }
        }
    }
}

console.log({grades});

//export as csv and auto-download
let csvContent = "data:text/csv;charset=utf-8,";
csvContent += Object.keys(Object.values(grades)[0]).map(s => s.replace(",","").replace("\n"," ").replace("\r", "")).join(",")+"\n";
csvContent += Object.entries(grades).map((kvp) => [].concat(Object.values(kvp[1]))).map(r => r.join(",")).join("\n");

const encodedUri = encodeURI(csvContent);
const a = document.createElement('a');
a.style.display = 'none';
a.href = encodedUri;
// the filename you want
a.download = 'rubric_export.csv';
document.body.appendChild(a);
a.click();
window.URL.revokeObjectURL(encodedUri);