
const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
    try {
        const [books] = await db.query(
            'SELECT * FROM books ORDER BY id'
        );

        res.status(200).json(books);
    } catch (error) {
        res.status(500).json({
            error: 'Hiba történt a könyvek lekérdezésekor.'
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [books] = await db.query(
            'SELECT * FROM books WHERE id = ?',
            [req.params.id]
        );

        if (books.length === 0) {
            return res.status(404).json({
                error: 'A könyv nem található.'
            });
        }

        res.status(200).json(books[0]);
    } catch (error) {
        res.status(500).json({
            error: 'Hiba történt a könyv lekérdezésekor.'
        });
    }
});

router.post('/', async (req, res) => {
    const { title, author, category, publish_year } = req.body;

    if (
        !title?.trim() ||
        !author?.trim() ||
        !category?.trim() ||
        publish_year === undefined ||
        publish_year === null ||
        publish_year === ''
    ) {
        return res.status(400).json({
            error: 'Minden könyvadat megadása kötelező.'
        });
    }

    if (
        typeof title !== 'string' ||
        typeof author !== 'string' ||
        typeof category !== 'string' ||
        !Number.isInteger(Number(publish_year))
    ) {
        return res.status(400).json({
            error: 'Érvénytelen könyvadatok.'
        });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO books
            (title, author, category, publish_year)
            VALUES (?, ?, ?, ?)`,
            [
                title.trim(),
                author.trim(),
                category.trim(),
                Number(publish_year)
            ]
        );

        res.status(201).json({
            message: 'A könyv sikeresen létrejött.',
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({
            error: 'Hiba történt a könyv létrehozásakor.'
        });
    }
});

router.put('/:id', async (req, res) => {
    const { title, author, category, publish_year } = req.body;

    if (
        !title?.trim() ||
        !author?.trim() ||
        !category?.trim() ||
        publish_year === undefined ||
        publish_year === null ||
        publish_year === ''
    ) {
        return res.status(400).json({
            error: 'Minden könyvadat megadása kötelező.'
        });
    }

    if (
        typeof title !== 'string' ||
        typeof author !== 'string' ||
        typeof category !== 'string' ||
        !Number.isInteger(Number(publish_year))
    ) {
        return res.status(400).json({
            error: 'Érvénytelen könyvadatok.'
        });
    }

    try {
        const [books] = await db.query(
            'SELECT id FROM books WHERE id = ?',
            [req.params.id]
        );

        if (books.length === 0) {
            return res.status(404).json({
                error: 'A könyv nem található.'
            });
        }

        await db.query(
            `UPDATE books
            SET title = ?, author = ?, category = ?, publish_year = ?
            WHERE id = ?`,
            [
                title.trim(),
                author.trim(),
                category.trim(),
                Number(publish_year),
                req.params.id
            ]
        );

        res.status(200).json({
            message: 'A könyv adatai sikeresen módosultak.'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Hiba történt a könyv módosításakor.'
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const [books] = await db.query(
            'SELECT id FROM books WHERE id = ?',
            [req.params.id]
        );

        if (books.length === 0) {
            return res.status(404).json({
                error: 'A könyv nem található.'
            });
        }

        const [loans] = await db.query(
            'SELECT id FROM loans WHERE book_id = ? LIMIT 1',
            [req.params.id]
        );

        if (loans.length > 0) {
            return res.status(409).json({
                error: 'A könyv kölcsönzési rekorddal rendelkezik, ezért nem törölhető.'
            });
        }

        await db.query(
            'DELETE FROM books WHERE id = ?',
            [req.params.id]
        );

        res.status(200).json({
            message: 'A könyv sikeresen törölve.'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Hiba történt a könyv törlésekor.'
        });
    }
});

module.exports = router;
