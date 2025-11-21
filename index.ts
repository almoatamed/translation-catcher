import express from "express";
import cors from "cors";
import path from "path";
import { existsSync, writeFileSync } from "fs";
import { createAsyncBatcher } from "async-batcher-js";
import { readFile } from "fs/promises";

const messagesFileFullPath = path.join(import.meta.dirname, "messages.json");

const updateFile = createAsyncBatcher<
  {
    message: string;
    lang: string;
  },
  void
>({
  batchPeriodInMs: 300,
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
      const message = promise.content.message.trim().toLowerCase();
      const lang = promise.content.lang.toLowerCase();
      if (!messages[lang]) {
        messages[lang] = {};
      }
      if (message.match(/^(?:\b[a-z]+\b)(?:(?:\s|\n)+|\(?|\)?|\b[a-z]+?\b|,|\?|\.|!)*?$/)) {
          console.log(`Adding translation for "${message}" in ${lang}`);
          messages[lang][message] = true;
      } else {
          console.error(`Invalid translation for "${message}" in ${lang}`);
      }
      promise.resolve();
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
  await updateFile.run({ message, lang });
  res.status(200).json({ message: "Translation added" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
