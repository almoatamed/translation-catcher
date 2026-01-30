import express from "express";
import cors from "cors";
import path from "path";
import { existsSync, writeFileSync } from "fs";
import { createAsyncBatcher } from "async-batcher-js";
import { readFile } from "fs/promises";

const messagesFileFullPath = path.join(import.meta.dirname, "messages.json");

const updateFile = createAsyncBatcher<
  {
    phrases: {
      [lang: string]: string[];
    };
  },
  void
>({
  batchPeriodInMs: 5e3,
  timeoutPeriod: 15000,
  async batcherCallback(promises) {
    if (!existsSync(messagesFileFullPath)) {
      writeFileSync(messagesFileFullPath, JSON.stringify({}));
    }

    const messages: {
      [lang: string]: {
        [phrase: string]: true;
      };
    } = JSON.parse((await readFile(messagesFileFullPath, "utf8")) || "{}");
    for (const promise of promises) {
      promise.resolve();

      const phrases = promise.content.phrases;
      for (const _lang in phrases) {
        const lang = _lang.toLowerCase();

        if (!messages[lang]) {
          messages[lang] = {};
        }
        const msgs = phrases[lang];
        for (const msg of msgs || []) {
          const message = msg.trim().toLowerCase();
          if (
            message.match(
              /^[a-z]+\b(?:(?:\s|\n)[a-z\.\,\(\)\-\?\_]+)*?$/i,
            )
          ) {
            // if (
            //   message.match(
            //     /^(?:(?:\s|\n)+|\(|\)|\-|'|\$|\>|\<|[0-9]+|\:|[a-z]+?|pm2|,|\?|\.|!)+?$/i
            //   )
            // ) {
            console.log(`Adding translation for "${message}" in ${lang}`);
            messages[lang][message] = true;
          } else {
            console.error(`Invalid translation for "${message}" in ${lang}`);
          }
        }
      }
    }
    writeFileSync(messagesFileFullPath, JSON.stringify(messages, null, 4));
  },
});

const PORT = process.env.PORT || 3456;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/add-translation", async (req, res) => {
  const { message, lang } = req.body || {};
  if (!message || !lang) {
    res.status(400).json({ error: "Missing message or lang" });
    return;
  }
  await updateFile.run({
    phrases: {
      [lang]: [message],
    },
  });
  res.status(200).json({ message: "Translation added" });
});

app.post("/api/add-translations", async (req, res) => {
  const {
    phrases,
  }: {
    phrases: {
      [lang: string]: string[];
    };
  } = req.body || {};
  updateFile.run({
    phrases,
  });
  res.status(200).json({ message: "Translation added" });
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
