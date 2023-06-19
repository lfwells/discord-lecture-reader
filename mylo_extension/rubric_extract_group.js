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
// - Navigate to the dropbox (i.e. submissions list) of the assignment you want to get an output for
// - Open chrome inspector, open console tab
// - Paste in all of this code and press enter
//
// Limitations:
// - only works for one rubric per assignment
// - untested on all combinations of rubrics, outcomes, and dropbox settings

const ou = window.location.searchParams.ou;
const dropboxId = window.location.searchParams.db;

const grades = {};

const dropbox = (await api(`/d2l/api/le/1.48/${ou}/dropbox/folders/${dropboxId}`))[0];
const criteria = Object.fromEntries(dropbox.Assessment.Rubrics[0].CriteriaGroups.flatMap(group => group.Criteria).map(c => [c.Id, c.Name]));
console.log({criteria});

let groupcategories = await api(`/d2l/api/lp/1.22/${ou}/groupcategories/`, { });
//groups = Object.fromEntries(classlist.map(s => [s.Identifier, s]));
let groupcategory = groupcategories.find(g => g.Name == groupCategoryName);
let groups = await Promise.all(groupcategory.Groups.map(groupId => (api(`/d2l/api/lp/1.22/${ou}/groupcategories/${groupcategory.GroupCategoryId}/groups/${groupId}`))));
groups = Object.fromEntries(groups.map(g => [g[0].GroupId, g[0]]));
console.log({groups});

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