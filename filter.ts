import fs from "fs";
import path from "path";

const messagesFullPath = path.join(import.meta.dirname, "./messages.json");
const filteredMessagesFullPath = path.join(
  import.meta.dirname,
  "./filtered-messages.json",
);

const messagesJson = Object.fromEntries(
  Object.entries(
    JSON.parse(fs.readFileSync(messagesFullPath, "utf-8")) as {
      [lang: string]: {
        [message: string]: true;
      };
    },
  ).map(([lang, words]) => {
    return [
      lang,
      Object.keys(words).filter((w) => {
        return (
          !!w &&
          !w.match(/sdf|ccc|fff|aaa|test|alnajar|salem/i)
        );
      }),
    ];
  }),
);

fs.writeFileSync(
  filteredMessagesFullPath,
  JSON.stringify(messagesJson, null, 4),
);
