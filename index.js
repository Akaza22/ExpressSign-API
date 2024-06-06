const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config')
const app = express();
const expressionRoutes = require('./routes/expression');
const signLanguageRoutes = require('./routes/signLanguange');
const historyRoutes = require('./routes/history');
const deleteDetection = require('./routes/delete-detection')

app.use(express.json());
app.use(cors());
app.use(bodyParser.json())


app.use('/api', expressionRoutes);
app.use('/api', signLanguageRoutes);
app.use('/api', historyRoutes);
app.use('/api', deleteDetection);


app.listen(config.port, () => console.log(`Server berjalan di port ${config.port}`))