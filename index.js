const express = require('express');
const { Pool } = require('pg');
const csv = require('csv-parser');
const fs = require('fs');

const app = express();

// Configuración de la conexión con PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hr',
    password: 'utm123',
    port: 5432,
});

// ENDPOINT 1: Cargar CSV desde una ruta específica
app.post('/upload-csv', async(req, res) => {
    const filePath = "C:/Users/Luis/csv_postgres_api/uploads/countries.csv"; // Ruta del archivo CSV
    const results = [];

    // Verifica si el archivo existe
    if (!fs.existsSync(filePath)) {
        console.error('El archivo no existe en la ruta especificada:', filePath);
        return res.status(400).json({ error: 'El archivo no existe en la ruta especificada.' });
    }

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async() => {
            try {
                // Inserta los datos a PostgreSQL
                for (const row of results) {
                    console.log('Insertando fila:', row); // Imprime la fila que se va a insertar
                    await pool.query(
                        'INSERT INTO public.countries (country_id, country_name, region_id) VALUES ($1, $2, $3)', [row.country_id, row.country_name, row.region_id]
                    );
                }
                res.status(200).json({ message: 'CSV cargado correctamente a la base de datos.' });
            } catch (error) {
                console.error('Error al insertar datos en la base de datos:', error); // Captura el error
                res.status(500).json({ error: 'Error al cargar el CSV en la base de datos.', details: error.message });
            }
        });
});






//ENDPOINT 2
//Este endpoint permitirá exportar los datos de la tabla countries a un archivo CSV que podrás descargar en tu sistema.

app.get('/download-csv', async(req, res) => {
    try {
        const { rows } = await pool.query('SELECT country_id, country_name, region_id FROM public.countries');
        const csvData = [
            ['country_id', 'country_name', 'region_id'],
            ...rows.map((row) => [row.country_id, row.country_name, row.region_id]),
        ];

        const filePath = 'downloads/countries.csv';
        const writeStream = fs.createWriteStream(filePath);

        csvData.forEach((row) => {
            writeStream.write(row.join(',') + '\n');
        });

        writeStream.end();
        writeStream.on('finish', () => {
            res.download(filePath, 'countries.csv', (err) => {
                if (err) {
                    console.error(err);
                    res.status(500).json({ error: 'Error al descargar el CSV.' });
                } else {
                    fs.unlinkSync(filePath); // Elimina el archivo después de descargarlo
                }
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al generar el CSV desde la base de datos.' });
    }
});



const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});