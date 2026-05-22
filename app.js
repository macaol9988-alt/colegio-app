// Entry point alternativo para deployers que esperam "app.js" por convencao
// (Hostinger Node.js Web App, Heroku, Vercel, etc.)
//
// Toda a logica real esta em server.js. Este arquivo apenas inicia o
// servidor delegando para ele.
require("./server.js");
