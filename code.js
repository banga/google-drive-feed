/**
 * Sends a digest email of all items updated in the drive since yesterday
 */
const SEPARATOR = "&nbsp;&bull;&nbsp;";

function sendFeedDigest() {
  // Fetch all the files since yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const params = `modifiedDate > "${yesterday.toISOString()}"`;
  const files = DriveApp.searchFiles(params);
  const fileObjs = [];
  while (files.hasNext()) {
    const file = files.next();

    const folderIterator = file.getParents();
    const folders = [];
    while (folderIterator.hasNext()) {
      folders.push(folderIterator.next());
    }

    fileObjs.push({
      name: file.getName(),
      url: file.getUrl(),
      owner: file.getOwner(),
      folders,
    });
  }

  // Group by folder names
  const fileObjsByFolderIds = new Map();
  for (const fileObj of fileObjs) {
    const { folders } = fileObj;
    const folderIds = folders.map((folder) => folder.getId()).join(",");
    if (!fileObjsByFolderIds.has(folderIds)) {
      fileObjsByFolderIds.set(folderIds, []);
    }
    fileObjsByFolderIds.get(folderIds).push(fileObj);
  }

  // Sort by number of items
  const items = Array.from(fileObjsByFolderIds.values());
  items.sort((a, b) => b.length - a.length);

  const itemsHtml = items
    .map((fileObjs) => {
      const folders = fileObjs[0].folders;
      const folderPaths = folders.flatMap(getFolderPaths_);
      const folderDescription = folderPaths
              .map((folderPath) => folderPath.join(" &gt; "))
              .join("<br/>")
          || "(No name)";
      return `
        <div style="margin-bottom: 15px">
          <span style="font-size: 11px; color: #666">${folderDescription}</span>
            ${fileObjs
              .map(
                ({ name, url, owner }) => `
                    <div style="margin-bottom: 5px;">
                        <a style="font-size: 14px; text-decoration: none" href="${url}">${name}</a>
                        ${SEPARATOR}
                        ${
                          owner
                            ? `<span style="font-size: 13px">${owner.getName()}</span>`
                            : ""
                        }
                    </div>
                `
              )
              .join("")}
        </div>`;
    })
    .join("");

  const htmlBody = `
    <div style="padding:20px 50px;">
      <h2>Updates since ${yesterday.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}</h2>
      ${itemsHtml}
    </div>
  `;

  MailApp.sendEmail(
    "shrey.banga@airtable.com",
    "Google drive updates",
    "See HTML body",
    {
      name: "Google Drive",
      htmlBody,
    }
  );
}

function getFolderPaths_(folder) {
  const paths = [];
  const parents = folder.getParents();
  while (parents.hasNext()) {
    const parent = parents.next();
    const parentPaths = getFolderPaths_(parent);
    if (parentPaths.length === 0) {
      paths.push([parent.getName()]);
    } else {
      for (const parentPath of parentPaths) {
        paths.push([...parentPath, parent.getName()]);
      }
    }
  }
  return paths;
}
