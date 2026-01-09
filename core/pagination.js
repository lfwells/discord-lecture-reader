const DEFAULT_PER_PAGE = 10;
export async function filter(req, data, perPage)
{
    if (req.query.filter && req.query.filterValue)
    {
        data = data.filter(r => r[req.query.filter] == req.query.filterValue);
    }
    return data;
}
export async function paginate(req, data, perPage) //todo this should include the filter, and the view to diplsay, and be middleware in general
{
    if (!perPage) perPage = DEFAULT_PER_PAGE;
    var currentPage = req.page ?? 0;

    console.log("data", data);
    var pagedData = data.slice(currentPage * perPage, (currentPage+1) * perPage);

    return {
        pagedData: data,
        data: data,
        perPage: perPage
    };
}