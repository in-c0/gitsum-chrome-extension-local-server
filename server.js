const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const app = express();
const port = 3000;

app.use(bodyParser.json());

app.post('/packRepo', (req, res) => {
  const { repoUrl, options } = req.body;
  // Build the command string. For example, using --remote and --compress.
  let cmd = `npx repomix --remote ${repoUrl}`;
  if (options && options.compress) {
    cmd += ' --compress';
  }
  
  console.log(`Executing command: ${cmd}`);
  // Increase maxBuffer if your repository is large.
  exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing repomix: ${error}`);
      res.status(500).json({ error: error.message, stderr });
    } else {
      // Assuming repomix outputs the packed content to stdout.
      res.json({ output: stdout });
    }
  });
});

app.listen(port, () => {
  console.log(`Repomix backend service listening at http://localhost:${port}`);
});
