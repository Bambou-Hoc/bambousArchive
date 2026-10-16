# Bambou's Archive

A simple image archive. No build step, no database. Just files.

## Folder

- `index.html` – the page
- `items.js` – **the list of everything in the archive** (the only file you edit)
- `images/` – your pictures
- `style.css`, `app.js`, `fonts/` – how it looks and works; leave as is

## Add something new

1. Put the picture in `images/`. Use a simple file name with no spaces, like `blue-door.jpg`.
2. Open `items.js` in any text editor and copy one block, from `{` to `},`.
3. Paste it at the **top** of the list and change the details:

```js
{
  image: "images/blue-door.jpg",
  title: "Blue door",
  kind: "found",          // "made", "found" or "collected"
  date: "2026-10-12",
  note: "Seen on a walk in Mérida.",
  source: "https://...",  // optional, delete the line if not needed
},
```

4. Upload the new image and the changed `items.js` to GitHub (see below). The site updates in about a minute.

Keep images under about 2 MB each (1600 pixels wide is plenty) so the page loads fast.

## Put it online with GitHub Pages (first time only)

1. On github.com, click **New repository**. Name it, set it to **Public**, and create it.
2. Click **uploading an existing file**, drag in everything from this folder (including the `images` and `fonts` folders), and click **Commit changes**.
3. Go to **Settings → Pages**. Under "Branch", pick `main` and `/ (root)`, then **Save**.
4. After a minute, the page shows your address, like `https://yourname.github.io/archive/`.

To update later: open the repository, go into `images`, click **Add file → Upload files** for new pictures, then click `items.js`, the pencil icon, edit, and **Commit changes**.

## Link to one section

Add `#made`, `#found` or `#collected` to the end of the address to open that filter directly.
