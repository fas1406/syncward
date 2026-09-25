const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// Simple request Logger
app.use((req,res, next) =>{
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.path} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
});


// Route 1 — the classic
app.get('/hello',(req,res)=>{
    res.send('Hello Form SyncWard Team');
});

// Route 2 — prove it's running in real time
app.get('/time',(req,res)=>{
    res.json({
        now: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dt: Intl.DateTimeFormat('en-PK').format(new Date()),         
        paktime: new Date().toString(),
    })
});

// Route 3 — a version endpoint (useful later for health checks)
app.get('/api/version', (req, res) => {
  res.json({
    name: 'syncward',
    version: '0.1.0',
    status: 'ok',
  });
});

// pong route
app.get('/ping', (req, res) => res.json({ pong: true }));

// joke 418 path
app.get('/teapot', (req, res) => {
  res.status(418).json({ message: "I'm a teapot" });
});

//  Query parameters — after ?. Used for filtering, pagination:
app.get('/greet', (req, res) => {
  const { name = 'stranger', lang = 'en' } = req.query;
  const greetings = {
    en: `Hello, ${name}!`,
    es: `¡Hola, ${name}!`,
    ar: `مرحبا، ${name}!`,
  };
  res.send(greetings[lang] || greetings.en);
});

// Route parameters — in the path itself. Used for identifying resources
app.get('/servers/:name', (req, res) => {
  res.json({
    requestedName: req.params.name,
    note: 'Later this will query the database',
  });
});

/////////////   exercise routes    /////////////////////
app.get('/health', (req,res) => {
    const sec = Math.round(process.uptime()); 
    res.json({
        status : 'Ok',
        uptime : `${sec}`
    });
});

app.get('/api/servers/:name', (req, res) => {
    res.json({
        name : req.params.name.toUpperCase(),
        status: 'placeholder'
    });
});

app.post('/echo',(req,res) => {
   const message = req.body?.message;

   if (message === undefined){
    res.json({error: 'Bad Request', reason : "Missing 'messgae' in request body or incorrect Content-Type header."});
   } else{
    res.json({received: message, length: message.length});
   }
})


// Catch-all for anything else
app.use((req,res) =>{
    res.status(404).json({error:'Not Found',
                          path:req.path
    });
});

const server = app.listen(PORT,()=>{
    console.log(`Server is running at :http://localhost:${PORT}`);
});

server.on('error', (err) => { 
    if (err.code === 'EADDRINUSE'){
        console.error(`Port ${PORT} is already in use.`);
        console.error(` Stop the process, or set PORT to a different value in .env`);
    } else{
        console.error('Sever error:', err.message);
    }
    process.exit(1);
});