
CREATE DATABASE IF NOT EXISTS library_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE library_db;

DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS readers;
DROP TABLE IF EXISTS books;

CREATE TABLE books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    author VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    publish_year INT NOT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE readers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    book_id INT NOT NULL,
    reader_id INT NOT NULL,
    loan_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE NULL,
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (reader_id) REFERENCES readers(id)
);

INSERT INTO books
(title, author, category, publish_year, available)
VALUES
('Egri csillagok', 'Gárdonyi Géza', 'Történelmi regény', 1901, TRUE),
('A Pál utcai fiúk', 'Molnár Ferenc', 'Ifjúsági regény', 1906, TRUE),
('Abigél', 'Szabó Magda', 'Ifjúsági regény', 1970, TRUE),
('Légy jó mindhalálig', 'Móricz Zsigmond', 'Regény', 1920, TRUE),
('Az arany ember', 'Jókai Mór', 'Regény', 1872, TRUE),
('A kis herceg', 'Antoine de Saint-Exupéry', 'Meseregény', 1943, TRUE),
('1984', 'George Orwell', 'Disztópia', 1949, TRUE),
('Harry Potter és a bölcsek köve', 'J. K. Rowling', 'Fantasy', 1997, TRUE),
('A Gyűrűk Ura', 'J. R. R. Tolkien', 'Fantasy', 1954, TRUE),
('Tüskevár', 'Fekete István', 'Ifjúsági regény', 1957, TRUE);

INSERT INTO readers (name, email, phone)
VALUES
('Kovács Anna', 'anna.kovacs@example.com', '+36301234567'),
('Nagy Péter', 'peter.nagy@example.com', '+36302345678'),
('Tóth Eszter', 'eszter.toth@example.com', '+36303456789'),
('Szabó Bence', 'bence.szabo@example.com', '+36304567890'),
('Varga Lilla', 'lilla.varga@example.com', '+36305678901');

INSERT INTO loans
(book_id, reader_id, loan_date, due_date, return_date)
VALUES
(1, 1, '2026-10-01', '2026-10-15', NULL),
(2, 2, '2026-10-03', '2026-10-17', NULL),
(4, 3, '2026-09-01', '2026-09-15', '2026-09-12'),
(7, 4, '2026-10-05', '2026-10-19', NULL),
(3, 5, '2026-09-10', '2026-09-24', '2026-09-20');

UPDATE books
SET available = TRUE;

UPDATE books
SET available = FALSE
WHERE id IN (
    SELECT book_id
    FROM loans
    WHERE return_date IS NULL
);
