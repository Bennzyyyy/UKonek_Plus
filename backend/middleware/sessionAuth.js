const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'ukonek_sid';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const sessions = new Map();

function parseCookies(cookieHeader = '') {
    return cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((acc, part) => {
            const [key, ...rest] = part.split('=');
            acc[key] = decodeURIComponent(rest.join('='));
            return acc;
        }, {});
}

function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sid, session] of sessions.entries()) {
        if (session.expiresAt <= now) {
            sessions.delete(sid);
        }
    }
}

function createSessionForUser(user) {
    cleanupExpiredSessions();
    const sessionId = crypto.randomBytes(32).toString('hex');
    sessions.set(sessionId, {
        user,
        expiresAt: Date.now() + SESSION_TTL_MS
    });
    return sessionId;
}

function getSession(sessionId) {
    if (!sessionId) return null;
    const session = sessions.get(sessionId);
    if (!session) return null;

    if (session.expiresAt <= Date.now()) {
        sessions.delete(sessionId);
        return null;
    }

    // Sliding expiration while user stays active.
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return session;
}

function destroySession(sessionId) {
    if (!sessionId) return;
    sessions.delete(sessionId);
}

function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
    });
}

function setSessionCookie(res, sessionId) {
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: SESSION_TTL_MS
    });
}

function requireAuth(req, res, next) {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionId = cookies[SESSION_COOKIE_NAME];
    const session = getSession(sessionId);

    if (!session) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    req.sessionId = sessionId;
    req.sessionUser = session.user;
    return next();
}

function requirePageAuth(req, res, next) {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionId = cookies[SESSION_COOKIE_NAME];
    const session = getSession(sessionId);

    if (!session) {
        return res.redirect('/html/index.html');
    }

    req.sessionId = sessionId;
    req.sessionUser = session.user;
    return next();
}

module.exports = {
    SESSION_COOKIE_NAME,
    createSessionForUser,
    destroySession,
    setSessionCookie,
    clearSessionCookie,
    requireAuth,
    requirePageAuth,
    parseCookies
};
