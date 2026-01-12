const jwt = require('jsonwebtoken');
const SECRET_KEY = "22716021";


function register(username) {
    const payload = { user: username, role: "student" };
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
}

function login(username) {
    const payload = { user: username, role: "student" };
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
}

function verify(token) {
    try {
        return jwt.verify(token, SECRET_KEY); 
    } catch (err) {
        return null; 
    }
}

const token = login("NguyenVanDu");