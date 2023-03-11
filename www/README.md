# MyLO Homepage Override
## Step 1: Create a file in your MyLO site with the following content
```
<!DOCTYPE html>
<html><head></head><body style="color: rgb(32, 33, 34); font-family: Lato, sans-serif;"><p>Loading MyLO Homepage...</p>
<p>
<script src="https://playur.io/mylo_homepage.js"></script>
</p></body></html>
```
(Note to self: this code links to playur.io to use https, will update this to link to discord bot server in future)

## Step 2: Post an announcement with an iframe linking to the file
Replace the `src` URL in the code snippet below with the URL of your file from step 1
```
<p id="mylo_homepage_override_frame"><iframe name="d2l_1_76_442" src="https://mylo.utas.edu.au/content/enforced/527784-NA_SP_lfwells_29638/mylo_homepage.html" frameborder="0" scrolling="auto" allowfullscreen="allowfullscreen" allow="microphone *; camera *" style="height: 6036px;"></iframe></p>
```

## Step 3: Maintain
Keep the announcement as the top announcement, or add the code from step 2 in each of your announcements