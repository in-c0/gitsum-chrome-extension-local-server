const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(bodyParser.json());

// Optional: Allow CORS for local development
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.post('/packRepo', (req, res) => {
  const { repoUrl, options } = req.body;
  let cmd = `npx repomix --remote ${repoUrl}`;
  if (options && options.compress) {
    cmd += ' --compress';
  }
  
  console.log(`Executing command: ${cmd}`);
  exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing repomix: ${error}`);
      return res.status(500).json({ error: error.message, stderr });
    } else {
      // Assume the output file is always "repomix-output.xml" in the current working directory.
      const outputFilePath = path.resolve(process.cwd(), 'repomix-output.xml');
      console.log(`Reading output file from: ${outputFilePath}`);
      fs.readFile(outputFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading output file: ${err}`);
          return res.status(500).json({ error: "Error reading output file: " + err.toString() });
        } else {
          return res.json({ output: data });
        }
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Repomix backend service listening at http://localhost:${port}`);
});
