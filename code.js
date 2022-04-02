/**
 * Sends a digest email of starred items updated in google drive since yesterday
 */
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

function* toESIterator(iterator) {
  while (iterator.hasNext()) {
    yield iterator.next();
  }
}

function formatFile(file) {
  return `<div><a style="text-decoration: none" href="${file.getUrl()}">${file.getName()}</a></div>`;
}

function getUpdatesFromFolder(folder, level = 0) {
  Logger.log(''.padStart(level, ' ') + folder.getName());

  const updates = [];
  for (const childFolder of toESIterator(folder.getFolders())) {
    updates.push(...getUpdatesFromFolder(childFolder, level + 1));
  }

  const files = [...toESIterator(folder.getFiles())].filter(file => file.getLastUpdated() > yesterday);
  if (files.length > 0 || updates.length > 0) {
    // If there are any direct or indirect updates, include the folder
    updates.unshift({
      label: folder.getName(),
      url: folder.getUrl(),
      files,
      level
    });
  }

  return updates;
}

function sendFeedDigest() {
  // Find all starred files updated since yesterday
  const starredFiles = DriveApp.searchFiles(`modifiedDate > "${yesterday.toISOString()}" and starred=true`);
  const updates = [
    {
      label: 'Starred',
      url: 'https://drive.google.com/drive/starred',
      files: [...toESIterator(starredFiles)],
      level: 0
    }
  ];

  // Add updated files from starred folders
  const starredFolders = toESIterator(DriveApp.searchFolders('starred=true'));
  for (const folder of starredFolders) {
    updates.push(...getUpdatesFromFolder(folder));
  }

  const itemsHtml = updates
    .map(({ label, url, files, level }) => {
      return `
         <div style="margin: 1em 0 0 ${level}em">
           <div style="font-size: 1em;"><a href="${url}" style="text-decoration: none; font-weight: bold">${label}</a></div>
           <div style="font-size: 1.1em;">${files.map(formatFile).join('')}</div>
         </div>
       `
    }).join('');

  const htmlBody = `
     <div style="color: #333; font-size: 12px">
       ${itemsHtml}
     </div>
   `;

  const numUpdates = updates.map(({ files }) => files.length).reduce((x, y) => x + y, 0);
  const subject = `${numUpdates} Google Drive updates`;

  MailApp.sendEmail({
    to: "shrey.banga@airtable.com",
    subject,
    body: "See HTML body",
    name: "📬 google drive",
    htmlBody,
  });
}
