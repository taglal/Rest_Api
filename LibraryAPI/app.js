
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const booksRouter = require('./routes/books.routes');
const readersRouter = require('./routes/readers.routes');
const loansRouter = require('./routes/loans.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/books', booksRouter);
app.use('/api/readers', readersRouter);
app.use('/api/loans', loansRouter);

app.use((req, res) => {
    res.status(404).json({
        error: 'A keresett végpont nem található.'
    });
});

const PORT = process.env.APP_PORT || 3000;

app.listen(PORT, () => {
    console.log(`A szerver fut: http://localhost:${PORT}`);
});
