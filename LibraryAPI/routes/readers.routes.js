
const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
    try {
        const [readers] = await db.query(
            'SELECT * FROM readers ORDER BY id'
        );

        res.status(200).json(readers);
    } catch (error) {
        res.status(500).json({
            error: 'Hiba történt az olvasók lekérdezésekor.'
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [readers] = await db.query(
            'SELECT * FROM readers WHERE id = ?',
            [req.params.id]
        );

        if (readers.length === 0) {
            return res.status(404).json({
                error: 'Az olvasó nem található.'
            });
        }

        res.status(200).json(readers[0]);
    } catch (error) {
        res.status(500).json({
            error: 'Hiba történt az olvasó lekérdezésekor.'
        });
    }
});

router.post('/', async (req, res) => {
    const { name, email, phone } = req.body;

    if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof email !== 'string' ||
        !email.trim()
    ) {
        return res.status(400).json({
            error: 'A név és az e-mail-cím megadása kötelező.'
        });
    }

    try {
        const [existingReaders] = await db.query(
            'SELECT id FROM readers WHERE email = ?',
            [email.trim()]
        );

        if (existingReaders.length > 0) {
            return res.status(409).json({
                error: 'Ez az e-mail-cím már regisztrálva van.'
            });
        }

        const [result] = await db.query(
            `INSERT INTO readers (name, email, phone)
            VALUES (?, ?, ?)`,
            [
                name.trim(),
                email.trim(),
                phone ?? null
            ]
        );

        res.status(201).json({
            message: 'Az olvasó sikeresen létrejött.',
            id: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Ez az e-mail-cím már regisztrálva van.'
            });
        }

        res.status(500).json({
            error: 'Hiba történt az olvasó létrehozásakor.'
        });
    }
});

router.put('/:id', async (req, res) => {
    const { name, email, phone } = req.body;

    if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof email !== 'string' ||
        !email.trim()
    ) {
        return res.status(400).json({
            error: 'A név és az e-mail-cím megadása kötelező.'
        });
    }

    try {
        const [readers] = await db.query(
            'SELECT id FROM readers WHERE id = ?',
            [req.params.id]
        );

        if (readers.length === 0) {
            return res.status(404).json({
                error: 'Az olvasó nem található.'
            });
        }

        const [existingReaders] = await db.query(
            'SELECT id FROM readers WHERE email = ? AND id != ?',
            [email.trim(), req.params.id]
        );

        if (existingReaders.length > 0) {
            return res.status(409).json({
                error: 'Ez az e-mail-cím már egy másik olvasóhoz tartozik.'
            });
        }

        await db.query(
            `UPDATE readers
            SET name = ?, email = ?, phone = ?
            WHERE id = ?`,
            [
                name.trim(),
                email.trim(),
                phone ?? null,
                req.params.id
            ]
        );

        res.status(200).json({
            message: 'Az olvasó adatai sikeresen módosultak.'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Ez az e-mail-cím már egy másik olvasóhoz tartozik.'
            });
        }

        res.status(500).json({
            error: 'Hiba történt az olvasó módosításakor.'
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const [readers] = await db.query(
            'SELECT id FROM readers WHERE id = ?',
            [req.params.id]
        );

        if (readers.length === 0) {
            return res.status(404).json({
                error: 'Az olvasó nem található.'
            });
        }

        const [loans] = await db.query(
            'SELECT id FROM loans WHERE reader_id = ? LIMIT 1',
            [req.params.id]
        );

        if (loans.length > 0) {
            return res.status(409).json({
                error: 'Az olvasóhoz kölcsönzési rekord tartozik, ezért nem törölhető.'
            });
        }

        await db.query(
            'DELETE FROM readers WHERE id = ?',
            [req.params.id]
        );

        res.status(200).json({
            message: 'Az olvasó sikeresen törölve.'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Hiba történt az olvasó törlésekor.'
        });
    }
});

module.exports = router;
