const express = require('express');
const app = express();
const PORT = 3000;

app.get('/hello',(req,res)=>{
    res.send('Hello Form SyncWard Team');
});

app.get('/time',(req,res)=>{
    res.json({
        now: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dt: Intl.DateTimeFormat('en-PK').format(new Date()),         
        paktime: new Date().toString(),
    })
});

app.get('/api/version', (req, res) => {
  res.json({
    name: 'syncward',
    version: '0.1.0',
    status: 'ok',
  });
});

app.listen(PORT,()=>{
    console.log(`Server is running at :http://localhost:${PORT}`);
});
