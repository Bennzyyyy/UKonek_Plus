const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { requirePageAuth } = require('./middleware/sessionAuth');

const patientRoutes = require('./routes/patient');
const staffRoutes = require('./routes/staff');
const { errorHandler } = require('./middleware/validation');

const app = express();
const frontendWebPath = path.join(__dirname, '..', 'frontend', 'web');

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

// Protect dashboard page so it only loads for authenticated sessions.
app.get('/html/dashboard.html', requirePageAuth, (req, res) => {
    res.sendFile(path.join(frontendWebPath, 'html', 'dashboard.html'));
});

// Serve static files from the frontend directory
// This ensures /css/style.css maps to frontend/web/css/style.css
app.use(express.static(frontendWebPath));

app.use('/api/patients', patientRoutes);
app.use('/api/staff', staffRoutes);

// Catch-all to serve index.html for any frontend route
app.get(/.*/, (req, res, next) => {
    // Don't intercept API calls
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(frontendWebPath, 'html', 'index.html'));
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));