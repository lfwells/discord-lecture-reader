<% 
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

var id = locals.id ?? uuidv4(); %>

<button id="<%=id%>"><%=locals.text%></button>
<script>
    if (resultWindows == undefined) resultWindows = {};
    document.getElementById('<%=id%>').addEventListener('click',function() 
    {
        //make a popup to display the output
        if (resultWindows[<%=id%>]) resultWindows[<%=id%>].close();
        resultWindows[<%=id%>] = window.open("", <%=locals.title ?? "Discord Bot"%>"...", "width=650,height=600");

        try
        {
            resultWindows[<%=id%>].document.querySelector('pre').remove();
        } catch (e) {}
        resultWindows[<%=id%>].document.write("<html><head><title><%=locals.title ?? "Discord Bot"%>...</title><style>body { background-color: #2C2F33; color:white; }</style></head><body><pre>Loading...\n");

        var last_response_len  = false;
        $.ajax({
            url:"<%=locals.url%>",
            method:"get",
            contentType: 'application/json',
            xhrFields: {
                onprogress: function(e)
                {
                    var this_response, response = e.currentTarget.response;
                    if(last_response_len === false)
                    {
                        this_response = response;
                        last_response_len = response.length;
                    }
                    else
                    {
                        this_response = response.substring(last_response_len);
                        last_response_len = response.length;
                    }
                    console.log(this_response);
                    resultWindows[<%=id%>].document.write(this_response);
                },
                success: function(data)
                {
                    resultWindows[<%=id%>].document.write("</pre>");
                }
            },
        });
      }
    });
  </script>
