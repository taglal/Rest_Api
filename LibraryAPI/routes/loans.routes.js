
const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
    try {
        const [loans] = await db.query(
            `SELECT loans.*, books.title AS book_title,
            readers.name AS reader_name
            FROM loans
            JOIN books ON loans.book_id = books.id
            JOIN readers ON loans.reader_id = readers.id
            ORDER BY loans.id`
        );

        res.status(200).json(loans);
    } catch (error) {
        res.status(500).json({
            error: 'Hiba történt a kölcsönzések lekérdezésekor.'
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [loans] = await db.query(
            `SELECT loans.*, books.title AS book_title,
            readers.name AS reader_name
            FROM loans
            JOIN books ON loans.book_id = books.id
            JOIN readers ON loans.reader_id = readers.id
            WHERE loans.id = ?`,
            [req.params.id]
        );

        if (loans.length === 0) {
            return res.status(404).json({
                error: 'A kölcsönzés nem található.'
            });
        }

        res.status(200).json(loans[0]);
    } catch (error) {
        res.status(500).json({
            error: 'Hiba történt a kölcsönzés lekérdezésekor.'
        });
    }
});

router.post('/', async (req, res) => {
    const { book_id, reader_id, loan_date, due_date } = req.body;

    if (
        book_id === undefined ||
        reader_id === undefined ||
        !loan_date ||
        !due_date
    ) {
        return res.status(400).json({
            error: 'Minden kölcsönzési adat megadása kötelező.'
        });
    }

    if (
        !Number.isInteger(Number(book_id)) ||
        Number(book_id) < 1 ||
        !Number.isInteger(Number(reader_id)) ||
        Number(reader_id) < 1 ||
        typeof loan_date !== 'string' ||
        typeof due_date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(loan_date) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(due_date) ||
        due_date <= loan_date
    ) {
        return res.status(400).json({
            error: 'Érvénytelen adatok vagy határidő. A due_date későbbi legyen a loan_date értékénél.'
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [books] = await connection.query(
            'SELECT id, available FROM books WHERE id = ? FOR UPDATE',
            [book_id]
        );

        if (books.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                error: 'A könyv nem található.'
            });
        }

        const [readers] = await connection.query(
            'SELECT id FROM readers WHERE id = ?',
            [reader_id]
        );

        if (readers.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                error: 'Az olvasó nem található.'
            });
        }

        if (!books[0].available) {
            await connection.rollback();

            return res.status(409).json({
                error: 'A könyv már kölcsönzés alatt áll.'
            });
        }

        const [result] = await connection.query(
            `INSERT INTO loans
            (book_id, reader_id, loan_date, due_date)
            VALUES (?, ?, ?, ?)`,
            [book_id, reader_id, loan_date, due_date]
        );

        await connection.query(
            'UPDATE books SET available = FALSE WHERE id = ?',
            [book_id]
        );

        await connection.commit();

        res.status(201).json({
            message: 'A kölcsönzés sikeresen létrejött.',
            id: result.insertId
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        res.status(500).json({
            error: 'Hiba történt a kölcsönzés létrehozásakor.'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

router.put('/:id', async (req, res) => {
    const {
        book_id,
        reader_id,
        loan_date,
        due_date,
        return_date
    } = req.body;

    if (
        book_id === undefined ||
        reader_id === undefined ||
        !loan_date ||
        !due_date ||
        return_date === undefined
    ) {
        return res.status(400).json({
            error: 'Minden kölcsönzési adat megadása kötelező, a return_date lehet null.'
        });
    }

    if (
        !Number.isInteger(Number(book_id)) ||
        Number(book_id) < 1 ||
        !Number.isInteger(Number(reader_id)) ||
        Number(reader_id) < 1 ||
        typeof loan_date !== 'string' ||
        typeof due_date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(loan_date) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(due_date) ||
        due_date <= loan_date ||
        (
            return_date !== null &&
            (
                typeof return_date !== 'string' ||
                !/^\d{4}-\d{2}-\d{2}$/.test(return_date) ||
                return_date < loan_date
            )
        )
    ) {
        return res.status(400).json({
            error: 'Érvénytelen kölcsönzési adatok vagy dátumok.'
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [loans] = await connection.query(
            'SELECT * FROM loans WHERE id = ? FOR UPDATE',
            [req.params.id]
        );

        if (loans.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                error: 'A kölcsönzés nem található.'
            });
        }

        const oldLoan = loans[0];
        const oldActive = oldLoan.return_date === null;
        const newActive = return_date === null;

        const [readers] = await connection.query(
            'SELECT id FROM readers WHERE id = ?',
            [reader_id]
        );

        if (readers.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                error: 'Az olvasó nem található.'
            });
        }

        const [newBooks] = await connection.query(
            'SELECT id, available FROM books WHERE id = ? FOR UPDATE',
            [book_id]
        );

        if (newBooks.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                error: 'A könyv nem található.'
            });
        }

        const bookChanged = Number(oldLoan.book_id) !== Number(book_id);

        if (
            newActive &&
            (bookChanged || !oldActive) &&
            !newBooks[0].available
        ) {
            await connection.rollback();

            return res.status(409).json({
                error: 'A kiválasztott könyv már kölcsönzés alatt áll.'
            });
        }

        await connection.query(
            `UPDATE loans
            SET book_id = ?, reader_id = ?, loan_date = ?,
                due_date = ?, return_date = ?
            WHERE id = ?`,
            [
                book_id,
                reader_id,
                loan_date,
                due_date,
                return_date,
                req.params.id
            ]
        );

        if (oldActive && (bookChanged || !newActive)) {
            await connection.query(
                'UPDATE books SET available = TRUE WHERE id = ?',
                [oldLoan.book_id]
            );
        }

        if (newActive && (bookChanged || !oldActive)) {
            await connection.query(
                'UPDATE books SET available = FALSE WHERE id = ?',
                [book_id]
            );
        }

        await connection.commit();

        res.status(200).json({
            message: 'A kölcsönzés sikeresen módosult.'
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        res.status(500).json({
            error: 'Hiba történt a kölcsönzés módosításakor.'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

router.delete('/:id', async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [loans] = await connection.query(
            'SELECT * FROM loans WHERE id = ? FOR UPDATE',
            [req.params.id]
        );

        if (loans.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                error: 'A kölcsönzés nem található.'
            });
        }

        const loan = loans[0];

        if (loan.return_date === null) {
            await connection.query(
                'UPDATE books SET available = TRUE WHERE id = ?',
                [loan.book_id]
            );
        }

        await connection.query(
            'DELETE FROM loans WHERE id = ?',
            [req.params.id]
        );

        await connection.commit();

        res.status(200).json({
            message: 'A kölcsönzés sikeresen törölve.'
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        res.status(500).json({
            error: 'Hiba történt a kölcsönzés törlésekor.'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

router.patch('/:id/return', async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [loans] = await connection.query(
            'SELECT * FROM loans WHERE id = ? FOR UPDATE',
            [req.params.id]
        );

        if (loans.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                error: 'A kölcsönzés nem található.'
            });
        }

        const loan = loans[0];

        if (loan.return_date !== null) {
            await connection.rollback();

            return res.status(409).json({
                error: 'A kölcsönzés már le van zárva.'
            });
        }

        await connection.query(
            `UPDATE loans
            SET return_date = CURRENT_DATE
            WHERE id = ?`,
            [req.params.id]
        );

        await connection.query(
            'UPDATE books SET available = TRUE WHERE id = ?',
            [loan.book_id]
        );

        await connection.commit();

        res.status(200).json({
            message: 'A könyv visszahozása sikeresen rögzítve.'
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        res.status(500).json({
            error: 'Hiba történt a könyv visszahozásakor.'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
